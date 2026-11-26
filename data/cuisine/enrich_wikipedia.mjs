#!/usr/bin/env node
/**
 * Conservative Wikipedia enrichment.
 *
 * Usage:
 *   node enrich_wikipedia.mjs [city_dishes.csv] [city_dishes_enriched.csv]
 *
 * Environment:
 *   WIKI_DELAY_MS       delay between requests (default 2500)
 *   WIKI_MAX_RETRIES    retry count (default 5)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const INPUT = process.argv[2] || 'city_dishes.csv';
const OUTPUT = process.argv[3] || 'city_dishes_enriched.csv';

const DELAY_MS = Math.max(
  0,
  Number(process.env.WIKI_DELAY_MS ?? 2500)
);

const MAX_RETRIES = Math.max(
  1,
  Number(process.env.WIKI_MAX_RETRIES ?? 5)
);

const TIMEOUT_MS = 30000;
const CHECKPOINT =
  OUTPUT.replace(/\.csv$/i, '') + '.checkpoint.json';

const USER_AGENT =
  'CityDishWikipediaEnrichment/1.0 (personal research project)';

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows.shift().map(h => h.trim());

  return rows
    .filter(r => r.some(v => v !== ''))
    .map(r =>
      Object.fromEntries(
        headers.map((h, i) => [h, r[i] ?? ''])
      )
    );
}

const csv = value =>
  `"${String(value ?? '').replaceAll('"', '""')}"`;

async function atomicWrite(file, contents) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, contents, 'utf8');
  await fs.rename(temp, file);
}

async function atomicJSON(file, value) {
  await atomicWrite(file, JSON.stringify(value, null, 2));
}

async function getJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    return await response.json();

  } finally {
    clearTimeout(timer);
  }
}

async function retry(label, fn) {
  let last;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();

    } catch (error) {
      last = error;

      if (i === MAX_RETRIES - 1) break;

      const wait = Math.min(90000, 3000 * (2 ** i));

      console.warn(
        `  ${label}: ${error.message}; retry ${i + 1}/${MAX_RETRIES} in ${Math.ceil(wait / 1000)}s`
      );

      await sleep(wait);
    }
  }

  throw last;
}

function normalise(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP = new Set([
  'the', 'a', 'an', 'of', 'and', 'with', 'style',
  'dish', 'food', 'traditional', 'regional', 'city',
  'recipe'
]);

function tokens(value) {
  return normalise(value)
    .split(/\s+/)
    .filter(t => t && !STOP.has(t));
}

function similarity(a, b) {
  const aa = new Set(tokens(a));
  const bb = new Set(tokens(b));

  if (!aa.size || !bb.size) return 0;

  const overlap = [...aa].filter(x => bb.has(x)).length;

  return overlap / Math.max(aa.size, bb.size);
}

function exactOrNearTitle(dish, title) {
  const d = normalise(dish);
  const t = normalise(title);

  return (
    d === t ||
    t.startsWith(d + ' ') ||
    d.startsWith(t + ' ')
  );
}

function articleLooksRelevant(dish, title, extract) {
  const titleScore = similarity(dish, title);

  const extractScore = similarity(
    dish,
    extract.slice(0, 1800)
  );

  const dishTokens = tokens(dish);
  const extractNorm = normalise(extract);

  const tokenMentions = dishTokens.filter(
    t => extractNorm.includes(t)
  ).length;

  const coverage = dishTokens.length
    ? tokenMentions / dishTokens.length
    : 0;

  // An exact or near-exact article title is the strongest match.
  if (exactOrNearTitle(dish, title)) {
    return {
      accepted: true,
      match: 'Exact/near title',
      score: 1
    };
  }

  // A likely alternative title needs meaningful title overlap
  // and supporting evidence in the article text.
  if (titleScore >= 0.6 && coverage >= 0.6) {
    return {
      accepted: true,
      match: 'Likely alternative title',
      score: titleScore
    };
  }

  // Looser matches are accepted only as possible related titles.
  if (
    titleScore >= 0.35 &&
    coverage >= 0.75 &&
    extractScore >= 0.15
  ) {
    return {
      accepted: true,
      match: 'Possible related title',
      score: titleScore
    };
  }

  return {
    accepted: false,
    match: 'No reliable dish-specific match',
    score: titleScore
  };
}

async function searchWikipedia(dish) {
  const url = new URL('https://en.wikipedia.org/w/api.php');

  url.search = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `"${dish}"`,
    srlimit: '8',
    format: 'json',
    origin: '*'
  });

  const data = await retry(
    'Wikipedia search',
    () => getJSON(url)
  );

  return data.query?.search || [];
}

async function getSummary(title) {
  const url =
    `https://en.wikipedia.org/api/rest_v1/page/summary/` +
    `${encodeURIComponent(title.replaceAll(' ', '_'))}`;

  return retry(
    'Wikipedia summary',
    () => getJSON(url)
  );
}

async function enrichDish(dish) {
  const name = dish.Name?.trim();

  if (!name) {
    return {
      'Wikipedia Article Title': '',
      'Wikipedia Match': 'No dish name',
      'Wikipedia Verification': 'Rejected',
      'Wikipedia URL': '',
      'Wikipedia lead image URL': ''
    };
  }

  const candidates = await searchWikipedia(name);

  if (!candidates.length) {
    return {
      'Wikipedia Article Title': '',
      'Wikipedia Match': 'No article found',
      'Wikipedia Verification': 'Needs review',
      'Wikipedia URL': '',
      'Wikipedia lead image URL': ''
    };
  }

  const ranked = candidates
    .map(c => ({
      ...c,
      score: similarity(name, c.title)
    }))
    .sort((a, b) => b.score - a.score);

  // Inspect only the best few candidates. A generic search result
  // is not accepted just because Wikipedia returned it first.
  for (const candidate of ranked.slice(0, 4)) {
    await sleep(DELAY_MS);

    let summary;

    try {
      summary = await getSummary(candidate.title);
    } catch (error) {
      console.warn(
        `  Could not retrieve "${candidate.title}": ${error.message}`
      );
      continue;
    }

    const extract = summary.extract || '';

    const verdict = articleLooksRelevant(
      name,
      candidate.title,
      extract
    );

    if (!verdict.accepted) continue;

    const exact = verdict.match === 'Exact/near title';

    const image =
      summary.originalimage?.source ||
      summary.thumbnail?.source ||
      '';

    return {
      'Wikipedia Article Title':
        summary.title || candidate.title,

      'Wikipedia Match': verdict.match,

      // Automated text matching is not visual verification.
      // Even exact-title images are flagged for human checking.
      'Wikipedia Verification':
        exact ? 'Check image' : 'Needs review',

      'Wikipedia URL':
        summary.content_urls?.desktop?.page || '',

      'Wikipedia lead image URL': image
    };
  }

  return {
    'Wikipedia Article Title': ranked[0]?.title || '',
    'Wikipedia Match': 'Candidates rejected as non-specific',
    'Wikipedia Verification': 'Rejected',
    'Wikipedia URL': '',
    'Wikipedia lead image URL': ''
  };
}

const dishes = parseCSV(
  await fs.readFile(INPUT, 'utf8')
);

if (!dishes.length) {
  throw new Error(`No data rows found in ${INPUT}`);
}

const required = [
  'Seed City ID',
  'Seed City',
  'Seed Country',
  'Name',
  'Area',
  'Area Level',
  'Description'
];

for (const field of required) {
  if (!(field in dishes[0])) {
    throw new Error(
      `Input CSV is missing required column: ${field}`
    );
  }
}

let checkpoint = {
  version: 1,
  enriched: {}
};

try {
  const old = JSON.parse(
    await fs.readFile(CHECKPOINT, 'utf8')
  );

  checkpoint = {
    ...checkpoint,
    ...old,
    enriched: old.enriched || {}
  };

} catch (error) {
  if (error.code !== 'ENOENT') {
    console.warn(
      `Could not read checkpoint: ${error.message}`
    );
  }
}

const outputFields = [
  ...Object.keys(dishes[0]).filter(k =>
    ![
      'Wikipedia Article Title',
      'Wikipedia Match',
      'Wikipedia Verification',
      'Wikipedia URL',
      'Wikipedia lead image URL'
    ].includes(k)
  ),

  'Wikipedia Article Title',
  'Wikipedia Match',
  'Wikipedia Verification',
  'Wikipedia URL',
  'Wikipedia lead image URL'
];

function rowKey(row, index) {
  return (
    `${row['Seed City ID']}|` +
    `${normalise(row.Name)}|${index}`
  );
}

async function save() {
  const rows = dishes.map((dish, index) => {
    const extra =
      checkpoint.enriched[rowKey(dish, index)] || {};

    return outputFields.map(field =>
      field in extra ? extra[field] : (dish[field] ?? '')
    );
  });

  const content = [
    outputFields.map(csv).join(','),
    ...rows.map(row => row.map(csv).join(','))
  ].join('\r\n') + '\r\n';

  await atomicWrite(OUTPUT, content);
  await atomicJSON(CHECKPOINT, checkpoint);
}

for (let i = 0; i < dishes.length; i++) {
  const dish = dishes[i];
  const key = rowKey(dish, i);

  if (checkpoint.enriched[key]) {
    console.log(
      `[${i + 1}/${dishes.length}] Skip ${dish.Name} (already enriched)`
    );
    continue;
  }

  console.log(
    `[${i + 1}/${dishes.length}] ${dish.Name} — ${dish['Seed City']}`
  );

  try {
    checkpoint.enriched[key] = await enrichDish(dish);

  } catch (error) {
    console.warn(
      `  Enrichment failed: ${error.message}`
    );

    checkpoint.enriched[key] = {
      'Wikipedia Article Title': '',
      'Wikipedia Match': 'Lookup failed',
      'Wikipedia Verification': 'Needs review',
      'Wikipedia URL': '',
      'Wikipedia lead image URL': ''
    };
  }

  await save();

  console.log(
    `  ${checkpoint.enriched[key]['Wikipedia Match']} / ` +
    `${checkpoint.enriched[key]['Wikipedia Verification']}`
  );

  await sleep(DELAY_MS);
}

await save();

console.log(`\nEnriched CSV: ${path.resolve(OUTPUT)}`);
console.log(`Checkpoint: ${path.resolve(CHECKPOINT)}`);

console.log(
  'Note: image URLs are candidates, not visually verified. ' +
  'Review rows marked "Check image" or "Needs review".'
);