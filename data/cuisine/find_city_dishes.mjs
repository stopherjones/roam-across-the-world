#!/usr/bin/env node
/**
 * Research city food specialities using the user's Groq-compatible Worker.
 *
 * Usage:
 *   node find_city_dishes.mjs [cities.json] [city_dishes.csv]
 *
 * Environment:
 *   GROQ_WORKER_URL  defaults to the user's Cloudflare Worker
 *   GROQ_MODEL       defaults to openai/gpt-oss-120b
 *   DELAY_MS         delay between city requests (default 2500)
 *
 * Wikipedia is deliberately NOT queried here.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const INPUT = process.argv[2] || 'cities.json';
const OUTPUT = process.argv[3] || 'city_dishes.csv';
const CHECKPOINT = OUTPUT.replace(/\.csv$/i, '') + '.checkpoint.json';

const WORKER_URL =
  process.env.GROQ_WORKER_URL ||
  'https://groq-proxy.chrisjones59.workers.dev/chat/completions';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const DELAY_MS = Math.max(0, Number(process.env.DELAY_MS ?? 2500));
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 120000;

const FIELDS = [
  'Seed City ID',
  'Seed City',
  'Seed Country',
  'Name',
  'Area',
  'Area Level',
  'Description'
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const words = value => String(value ?? '').trim().split(/\s+/).filter(Boolean).length;

async function atomicWrite(file, contents) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, contents, 'utf8');
  await fs.rename(temp, file);
}

async function atomicJSON(file, value) {
  await atomicWrite(file, JSON.stringify(value, null, 2));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function retry(label, fn) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_RETRIES - 1) break;

      const wait =
        Math.min(90000, 3000 * (2 ** attempt)) +
        Math.floor(Math.random() * 1000);

      console.warn(
        `  ${label}: ${error.message}. Retry ${attempt + 1}/${MAX_RETRIES} in ${Math.ceil(wait / 1000)}s`
      );

      await sleep(wait);
    }
  }

  throw lastError;
}

function cityPrompt(city) {
  return `Identify distinctive food specialities associated with this seed city:
${city.city}, ${city.country}.

Return up to FOUR dishes. Fewer is better than padding the list.

RESEARCH PRIORITIES
1. First choose dishes genuinely associated with the city itself.
2. If there are fewer than four convincing city dishes, use dishes associated with the relevant region, province, state or island.
3. Only if still needed, include a well-established national dish from the country.
4. Do not force a city-level association where one does not exist.

GEOGRAPHICAL DISCIPLINE
- "Area" must name the actual place the dish is associated with, not simply repeat the seed city.
- "Area Level" must be exactly City, Region or Country.
- A dish from somewhere else in the same country is NOT a local dish.
- Check that the named area is geographically compatible with the seed city. Do not confuse similarly named places or regions.
- If a dish is associated with a wider area, say so explicitly.

CULINARY AND HISTORICAL ACCURACY
- Describe ingredients and preparation accurately; distinguish similar dishes and regional variations.
- Do not invent origin stories, dates, famous creators or historical explanations.
- Do not describe an ingredient, animal or generic food category as though it were a prepared dish.
- Prefer recognisable, culturally meaningful specialities over obscure or speculative claims.
- Avoid generic restaurant meals and dishes merely available in the city.

DESCRIPTION
- 15–20 words.
- State what the dish is, its defining ingredients/preparation, and its geographical/cultural association where useful.
- Avoid unsupported superlatives and claims.

Return valid JSON only, using this exact structure:
{"dishes":[{"Name":"...","Area":"...","Area Level":"City|Region|Country","Description":"..."}]}

Do not include URLs, citations, commentary or markdown.`;
}

async function requestDishes(city) {
  const body = {
    model: MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a cautious culinary-cultural researcher. Accuracy and geographical honesty matter more than filling the list. Return valid JSON only.'
      },
      {
        role: 'user',
        content: cityPrompt(city)
      }
    ]
  };

  return retry('Groq request', async () => {
    const response = await fetchWithTimeout(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1500);
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    const content =
      (await response.json()).choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty model response');

    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.dishes)) {
      throw new Error('Response did not contain a dishes array');
    }

    return parsed.dishes;
  });
}

async function writeCSV(checkpoint, cities) {
  const rows = [];

  for (const city of cities) {
    const id = String(city.id ?? `${city.city}-${city.country}`);
    const record = checkpoint.completed[id];

    if (!record) continue;

    for (const dish of record.dishes || []) {
      rows.push([
        id,
        city.city,
        city.country,
        dish.Name,
        dish.Area,
        dish['Area Level'],
        dish.Description
      ]);
    }
  }

  const contents = [
    FIELDS.map(csv).join(','),
    ...rows.map(row => row.map(csv).join(','))
  ].join('\r\n') + '\r\n';

  await atomicWrite(OUTPUT, contents);
}

const cities = JSON.parse(await fs.readFile(INPUT, 'utf8'));

if (!Array.isArray(cities)) {
  throw new Error(`${INPUT} must contain a JSON array`);
}

for (const [index, city] of cities.entries()) {
  if (
    !city ||
    typeof city.city !== 'string' ||
    typeof city.country !== 'string'
  ) {
    throw new Error(
      `Invalid city at array index ${index}: expected city and country strings`
    );
  }
}

let checkpoint = {
  version: 4,
  completed: {},
  failed: {}
};

try {
  const old = JSON.parse(await fs.readFile(CHECKPOINT, 'utf8'));

  checkpoint = {
    ...checkpoint,
    ...old,
    completed: old.completed || {},
    failed: old.failed || {}
  };
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.warn(
      `Could not read checkpoint (${error.message}); starting a new one.`
    );
  }
}

let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
  console.log('\nInterrupt received; will save after the current city.');
});

process.on('SIGTERM', () => {
  stopping = true;
  console.log('\nTermination received; will save after the current city.');
});

for (let i = 0; i < cities.length; i++) {
  const city = cities[i];
  const id = String(city.id ?? `${city.city}-${city.country}`);

  if (checkpoint.completed[id]) {
    console.log(
      `[${i + 1}/${cities.length}] Skip ${city.city} (already complete)`
    );
    continue;
  }

  if (stopping) break;

  console.log(
    `[${i + 1}/${cities.length}] Research ${city.city}, ${city.country}`
  );

  try {
    const proposed = (await requestDishes(city)).slice(0, 4);
    const seen = new Set();
    const dishes = [];

    for (const raw of proposed) {
      const Name = String(raw.Name || '').trim();
      const Area = String(raw.Area || '').trim();
      const Description = String(raw.Description || '').trim();
      const AreaLevel = String(raw['Area Level'] || '').trim();

      if (!Name || !Area || !Description) {
        console.warn('  Dropping incomplete dish record.');
        continue;
      }

      const key = Name.toLocaleLowerCase();

      if (seen.has(key)) {
        console.warn(`  Dropping duplicate dish: ${Name}`);
        continue;
      }

      seen.add(key);

      if (!['City', 'Region', 'Country'].includes(AreaLevel)) {
        console.warn(
          `  Dropping "${Name}": invalid Area Level "${AreaLevel}".`
        );
        continue;
      }

      const count = words(Description);

      if (count < 15 || count > 20) {
        console.warn(
          `  Description for "${Name}" has ${count} words (target 15–20); retained for review.`
        );
      }

      dishes.push({
        Name,
        Area,
        'Area Level': AreaLevel,
        Description
      });
    }

    checkpoint.completed[id] = {
      seedCity: city.city,
      seedCountry: city.country,
      dishes,
      completedAt: new Date().toISOString()
    };

    delete checkpoint.failed[id];

    await atomicJSON(CHECKPOINT, checkpoint);
    await writeCSV(checkpoint, cities);

    console.log(`  Saved ${dishes.length} dish(es).`);

    if (!stopping) await sleep(DELAY_MS);

  } catch (error) {
    checkpoint.failed[id] = {
      city,
      error: error.message,
      failedAt: new Date().toISOString()
    };

    await atomicJSON(CHECKPOINT, checkpoint);
    await writeCSV(checkpoint, cities);

    console.error(
      `  Failed ${city.city}: ${error.message}. Progress saved; restart to retry.`
    );

    process.exitCode = 1;
    break;
  }
}

await atomicJSON(CHECKPOINT, checkpoint);
await writeCSV(checkpoint, cities);

const completed = Object.keys(checkpoint.completed).length;

console.log(
  `\nCompleted ${completed}/${cities.length} cities in the checkpoint.`
);
console.log(`CSV: ${path.resolve(OUTPUT)}`);
console.log(`Checkpoint: ${path.resolve(CHECKPOINT)}`);

if (completed < cities.length) {
  console.log('Run the same command again to resume.');
}