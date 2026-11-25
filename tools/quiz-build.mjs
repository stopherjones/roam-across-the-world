// Builds timeline quizzes from Wikipedia articles, for running locally.
//
// Choose a model with --provider (or QUIZ_PROVIDER):
//   --provider=gemini   gemini-3.5-flash-lite      needs GEMINI_API_KEY   (default)
//   --provider=groq     openai/gpt-oss-120b        needs GROQ_API_KEY
//
// Examples (from the project root):
//   node tools/quiz-build.mjs --selftest
//   node tools/quiz-build.mjs gva "Geneva" --provider=groq       one town
//   node tools/quiz-build.mjs --start=0 --count=5                a slice of cities without quiz files
//   node tools/quiz-build.mjs --retry-errors                    retry all recorded failures (Gemini 503s retry automatically)
//   node tools/quiz-build.mjs --force                            rebuild every city in the game
//
// Output: data/quiz/<id>.json (the game reads this) and data/quiz/<id>.rejects.json (what was dropped,
// why, and how many model calls and tokens the town used), plus data/quiz/build-errors.json for failures.
// A town with fewer than 10 usable events writes no quiz file and is recorded as a failure.
//
// Settings you may want to change are in SETTINGS below. Extra options:
//   --batches=N   how many chunks of the article to read (default 2; 0 reads all of it, costs more)
//   --verify=N    how many candidates to check per model call (default 15)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const ERRORS_FILE = path.join(root, "data", "quiz", "build-errors.json");

// ---- SETTINGS ----
const POOL_SIZE = 20;          // events kept per town; the game draws 10 of them per visit
const MIN_POOL = 10;           // below this, the town gets no file
const CANDIDATE_TARGET = 30;   // candidates requested per extraction call
const MAX_EXTRACT_BATCHES = 2; // article chunks read per town (0 = all)
const VERIFY_CHUNK = 15;       // candidates checked per verification call
const TOWN_DELAY_MS = 3500;    // pause between towns in a batch run
const RECENT_CUTOFF = 1926;    // favour events from roughly the last 100 years
const THEMES = ["power_conflict", "civic", "commerce_industry", "culture", "food_daily", "environment"];
const UA = "role-around-the-world-quiz-builder/0.3 (personal project)";
const PROMPT_TAG = "quiz-v4";

const PROVIDERS = {
  gemini: {
    keyEnv: "GEMINI_API_KEY",
    model: "gemini-3.5-flash-lite",
    url: (key, model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    headers: () => ({ "Content-Type": "application/json" }),
    body: (prompt) => ({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
    read: (j) => ({
      text: j.candidates?.[0]?.content?.parts?.[0]?.text,
      usage: { prompt: j.usageMetadata?.promptTokenCount || 0, completion: j.usageMetadata?.candidatesTokenCount || 0 }
    })
  },
  groq: {
    keyEnv: "GROQ_API_KEY",
    model: "openai/gpt-oss-120b",
    url: () => "https://api.groq.com/openai/v1/chat/completions",
    headers: (key) => ({ "Content-Type": "application/json", Authorization: "Bearer " + key }),
    body: (prompt, model) => ({ model, messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 4000, reasoning_effort: "low" }),
    read: (j) => ({
      text: j.choices?.[0]?.message?.content,
      usage: { prompt: j.usage?.prompt_tokens || 0, completion: j.usage?.completion_tokens || 0 }
    })
  }
};

// Chosen from the command line or QUIZ_PROVIDER. Set once at start-up.
let provider = "gemini";

// ---- text helpers ----
export function norm(s) {
  return s.normalize("NFKC").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
}

// Read the current game destinations rather than relying on a generated, stale city list.
export function gameCities(dataDir = path.join(root, "data")) {
  const projectRoot = path.resolve(dataDir, "..");
  const data = fs.readFileSync(path.join(projectRoot, "data.js"), "utf8");
  const orderMatch = data.match(/var PLACE_ORDER="([^"]*)"/);
  if (!orderMatch) throw new Error("Could not find PLACE_ORDER in data.js");
  const names = new Map();
  for (const file of fs.readdirSync(path.join(dataDir, "regions"))) {
    if (!file.endsWith(".js")) continue;
    const source = fs.readFileSync(path.join(dataDir, "regions", file), "utf8");
    for (const match of source.matchAll(/([a-z0-9]{2,4})\|([^|;"]+)\|(-?[\d.]+)\|(-?[\d.]+)\|([^|]*)\|([^|;"]*)/g)) {
      if (!names.has(match[1]) && !match[6].includes("l")) names.set(match[1], match[2]);
    }
  }

  const countrySource = fs.readFileSync(path.join(dataDir, "countries.js"), "utf8");
  const countries = new Map();
  for (const match of countrySource.matchAll(/"([^"]+)":\[([^\]]*)\]/g)) {
    for (const id of match[2].matchAll(/"([a-z0-9]{2,4})"/g)) countries.set(id[1], match[1]);
  }

  const seen = new Set();
  return orderMatch[1].split(/\s+/).filter(Boolean).flatMap(id => {
    if (seen.has(id) || !names.has(id)) return [];
    seen.add(id);
    return [{ id, town: names.get(id), country: countries.get(id) || "" }];
  });
}

export function prepareArticle(rawText) {
  const skipPattern = /^(references|external links|further reading|see also|notes|bibliography|gallery|twin towns|sister cities|climate|demographics|population|geography|topography|flora and fauna|education|schools|universities|sports?|transport|transportation|infrastructure|notable people|notable residents)$/i;
  const priorityPattern = /(history|origins|etymology|culture|arts|heritage|architecture|landmarks|economy|industry)/i;
  const lines = rawText.split("\n");
  const sections = [{ title: "Lead", level: 1, lines: [] }];
  let current = sections[0];
  for (const line of lines) {
    const m = line.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (m) { current = { title: m[2].trim(), level: m[1].length, lines: [] }; sections.push(current); }
    else current.lines.push(line);
  }
  const priority = [], secondary = [];
  for (const sec of sections) {
    if (skipPattern.test(sec.title)) continue;
    const body = sec.lines.join("\n").trim();
    if (!body) continue;
    if (sec.title === "Lead" || priorityPattern.test(sec.title)) priority.push(body); else secondary.push(body);
  }
  return [...priority, ...secondary].join("\n\n");
}

export function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20);
}

export function yearSentences(text) {
  return sentences(text).filter(s => /\b1\d{3}\b|\b20[0-2]\d\b/.test(s));
}

// Packs sentences into chunks of about maxChars, keeping them whole.
export function batches(items, maxChars = 14000) {
  const out = [];
  let cur = [], size = 0;
  for (const s of items) {
    if (cur.length && size + s.length > maxChars) { out.push(cur.join(" ")); cur = []; size = 0; }
    cur.push(s); size += s.length + 1;
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

export function parseJsonLoose(s) {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((m ? m[1] : s).trim());
}

// ---- checks that need no model ----
const VAGUE = /\b(regarding|experienc\w*|recorded|various|significant\w*|dramatic\w*|a number of|marking a|notable shift|some \w+ (?:was|were) (?:made|done))\b/i;
const STOP = new Set(["the","a","an","of","in","on","at","to","and","or","by","for","with","from","was","were","is","be","as","it","its","this","that","into","after","before"]);

export function checkCandidate(c, articleText) {
  if (!c || typeof c.year !== "number" || !Number.isInteger(c.year)) return "year is not a whole number";
  if (c.year < 1000 || c.year > 2026) return "year out of range";
  if (!THEMES.includes(c.theme)) return "unknown theme " + c.theme;
  if (!c.event || c.event.split(/\s+/).length > 25) return "event text missing or too long";
  if (/\b(1\d{3}|20[0-2]\d)\b/.test(c.event)) return "year appears in the event text (gives the answer away)";
  if (VAGUE.test(c.event)) return "vague wording in the event text";
  if (!/[A-Z]/.test(c.event)) return "no named place, person or thing in the event";
  if (!c.quote) return "no quote";
  if (!norm(articleText).includes(norm(c.quote))) return "quote is not in the article";
  if (!norm(c.quote).includes(String(c.year))) return "quoted sentence does not contain the year";
  return null;
}

// Same theme, within two years, and mostly the same words: treat as a duplicate.
export function isDuplicate(c, kept) {
  const words = s => new Set(norm(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w)));
  const a = words(c.event);
  return kept.some(k => {
    if (k.theme !== c.theme || Math.abs(k.year - c.year) > 2) return false;
    const b = words(k.event);
    const inter = [...a].filter(w => b.has(w)).length;
    const union = new Set([...a, ...b]).size || 1;
    return inter / union > 0.5;
  });
}

// ---- prompts ----
export function candidatesPrompt(city, articleText) {
  return [
    `You are building a timeline quiz about ${city}. Use ONLY the sentences below, which come from the article. Do not use outside knowledge.`,
    `Return a JSON array of up to ${CANDIDATE_TARGET} events. Each item: {"year": whole number, "theme": one of ${THEMES.join(", ")}, "event": a short description of 10 to 15 words with no year in it, naming the place, person or thing, "quote": the exact sentence from the text that states the event and year}.`,
    `Cover a mix of themes. Favour events from the last 100 years (1926–2026) where available, while keeping major earlier milestones for historical depth.`,
    `Do not invent events or years. Do not use vague wording such as "regarding", "experienced" or "recorded". If the text does not support an event, leave it out.`,
    `Return only the JSON array, with no commentary.`,
    `SENTENCES:\n${articleText}`
  ].join("\n\n");
}

export function batchVerifyPrompt(candidates) {
  const numbered = candidates.map((c, idx) => `[${idx}] Year: ${c.year} | Claim: "${c.event}" | Source quote: "${c.quote}"`).join("\n");
  return [
    `Verify each numbered quiz claim against its paired source quote. Does the source quote clearly support both the event and the exact year?`,
    `Return ONLY a JSON array of objects, one for each index from 0 to ${candidates.length - 1}: [{"index": number, "supported": true or false, "reason": "short reason"}].`,
    `CANDIDATES:\n${numbered}`
  ].join("\n\n");
}

// ---- model calls (one function, two providers) ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callModel(prompt, stats, attempt = 1) {
  const p = PROVIDERS[provider];
  const key = process.env[p.keyEnv];
  if (!key) throw new Error(`Missing ${p.keyEnv} for --provider=${provider}`);
  let r;
  try {
    r = await fetch(p.url(key, p.model), {
      method: "POST", headers: p.headers(key), signal: AbortSignal.timeout(60000),
      body: JSON.stringify(p.body(prompt, p.model))
    });
  } catch (err) {
    if (attempt <= 3) { await sleep(Math.pow(2, attempt) * 1500); return callModel(prompt, stats, attempt + 1); }
    throw err;
  }
  if ((r.status === 429 || r.status >= 500) && attempt <= 3) {
    const ra = parseFloat(r.headers.get("retry-after")) || 0;
    await sleep(ra ? ra * 1000 : Math.pow(2, attempt) * 2000);
    return callModel(prompt, stats, attempt + 1);
  }
  if (!r.ok) throw new Error(`${provider} call failed: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const { text, usage } = p.read(await r.json());
  stats.calls++; stats.promptTokens += usage.prompt; stats.completionTokens += usage.completion;
  if (!text) throw new Error("model returned an empty response");
  return text;
}

// ---- the pipeline ----
export async function build({ city, title, articleText, sourceUrl, askFn, maxExtractBatches = MAX_EXTRACT_BATCHES, verifyChunk = VERIFY_CHUNK }) {
  const rejects = [], accepted = [];
  const prioritizedText = prepareArticle(articleText);
  const chunks = batches(yearSentences(prioritizedText));
  const textBatches = maxExtractBatches > 0 ? chunks.slice(0, maxExtractBatches) : chunks;

  // 1. Extraction: candidates from the chosen chunks of the article.
  const seen = new Set(), raw = [];
  for (const batch of textBatches) {
    const extracted = parseJsonLoose(await askFn(candidatesPrompt(city, batch)));
    if (!Array.isArray(extracted)) continue;
    for (const c of extracted) {
      const key = c.year + "|" + norm(String(c.quote || ""));
      if (!seen.has(key)) { seen.add(key); raw.push(c); }
    }
  }

  // 2. Code checks: free, no model call.
  const codePassed = [];
  for (const c of raw) {
    const why = checkCandidate(c, articleText);
    if (why) rejects.push({ ...c, stage: "code check", why }); else codePassed.push(c);
  }

  // 3. Batched verification: several candidates per call.
  const verified = [];
  for (let i = 0; i < codePassed.length; i += verifyChunk) {
    const chunk = codePassed.slice(i, i + verifyChunk);
    const verdicts = parseJsonLoose(await askFn(batchVerifyPrompt(chunk)));
    const verdictMap = new Map((Array.isArray(verdicts) ? verdicts : []).map(v => [v.index, v]));
    chunk.forEach((c, idx) => {
      const v = verdictMap.get(idx);
      if (!v || !v.supported) rejects.push({ ...c, stage: "verification", why: v?.reason || "not supported or missing verdict" });
      else verified.push({ year: c.year, theme: c.theme, event: c.event, quote: c.quote, source: sourceUrl });
    });
  }

  // 4. Near-duplicates, then selection. Both free.
  for (const c of verified) {
    if (isDuplicate(c, accepted)) rejects.push({ ...c, stage: "duplicate", why: "near-duplicate of an event already kept" });
    else accepted.push(c);
  }

  const { events } = select(accepted, POOL_SIZE);
  return { city, source: { title, url: sourceUrl }, events, pool: events, rejects, chunksAvailable: chunks.length, chunksRead: textBatches.length };
}

// ---- selection: themes first, favouring the last ~100 years, sorted chronologically ----
export function select(accepted, n = 20) {
  const byPreference = [...accepted].sort((a, b) => {
    const aRecent = a.year >= RECENT_CUTOFF ? 1 : 0, bRecent = b.year >= RECENT_CUTOFF ? 1 : 0;
    if (aRecent !== bRecent) return bRecent - aRecent;
    return a.year - b.year;
  });
  const chosen = [];
  for (const t of THEMES) {
    const c = byPreference.find(e => e.theme === t && !chosen.includes(e));
    if (c && chosen.length < n) chosen.push(c);
  }
  const recentTarget = Math.ceil(n * 0.7);
  for (const e of byPreference) {
    if (chosen.length >= n) break;
    if (chosen.includes(e)) continue;
    const currentRecent = chosen.filter(x => x.year >= RECENT_CUTOFF).length;
    if (e.year >= RECENT_CUTOFF && currentRecent >= recentTarget && byPreference.some(x => x.year < RECENT_CUTOFF && !chosen.includes(x))) continue;
    chosen.push(e);
  }
  for (const e of byPreference) {
    if (chosen.length >= n) break;
    if (!chosen.includes(e)) chosen.push(e);
  }
  chosen.sort((a, b) => a.year - b.year);
  return { events: chosen, pool: chosen };
}

// ---- Wikipedia ----
export async function fetchArticle(title, country = "", fetchFn = fetch) {
  const tryFetch = async (q) => {
    const url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=" + encodeURIComponent(q);
    const r = await fetchFn(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("Wikipedia request failed: " + r.status);
    const page = Object.values((await r.json()).query.pages)[0];
    if (!page || page.missing !== undefined) return null;
    return { text: page.extract, title: page.title, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")) };
  };
  let article = await tryFetch(title);
  if (!article && country) article = await tryFetch(`${title}, ${country}`);
  if (!article) throw new Error("No Wikipedia article called " + title);
  return article;
}

// ---- output ----
export function toGameFile(out, id, town, model) {
  return {
    id, town, source: out.source.url,
    pool: out.pool.map(e => ({ year: e.year, text: e.event, url: e.source, theme: e.theme })),
    generated: new Date().toISOString().slice(0, 10),
    prompt: PROMPT_TAG,
    model
  };
}

// ---- self-test (no network, no keys) ----
async function selftest() {
  let selftestPassed = true;
  const ok = (n, condition) => {
    selftestPassed = selftestPassed && condition;
    console.log((condition ? "PASS " : "FAIL ") + n);
  };
  const cities = gameCities();
  ok("game city list includes newer destinations", cities.some(c => c.id === "xky") && cities.length > 619);
  const sampleCities = [{ id: "done" }, { id: "pending" }, { id: "failed" }];
  const hasQuiz = id => id === "done";
  const failures = {
    failed: { error: "No Wikipedia article" },
    temporary: {
      error: "gemini call failed: 503 {\"error\":{\"status\":\"UNAVAILABLE\"}}",
      stats: { provider: "gemini" }
    }
  };
  sampleCities.push({ id: "temporary" });
  ok("default batch selects missing quizzes and auto-retries Gemini 503 failures",
    pendingCities(sampleCities, hasQuiz, failures).eligible.map(c => c.id).join() === "pending,temporary");
  ok("default batch automatically retries recorded Gemini 503 failures",
    pendingCities(sampleCities, hasQuiz, failures).retryable.map(c => c.id).join() === "temporary");
  ok("retry-errors includes previously failed missing quizzes",
    pendingCities(sampleCities, hasQuiz, failures, { retryErrors: true }).eligible.map(c => c.id).join() === "pending,failed,temporary");
  ok("force includes existing quizzes and recorded failures",
    pendingCities(sampleCities, hasQuiz, failures, { force: true }).eligible.length === sampleCities.length);
  const text = [
    "Gothenburg was founded in 1621 by King Gustav II Adolf as a trading port.",
    "== History ==",
    "In 1879 horse-drawn trams began operating in the city.",
    "Horse-drawn trams were running in Gothenburg from 1879 onward.",
    "The shipyard Gotaverken was founded in 1841 and grew into a large industrial complex.",
    "Volvo was founded in Gothenburg in 1927.",
    "== Culture ==",
    "A film festival started in 1979 and has run every year since.",
    "== References ==",
    "Smith, John (1999). A History of Gothenburg."
  ].join("\n");
  const fake = async (prompt) => {
    if (prompt.includes("Return a JSON array of up to")) return JSON.stringify([
      { year: 1621, theme: "civic", event: "Gothenburg founded as a trading port by Gustav II Adolf.", quote: "Gothenburg was founded in 1621 by King Gustav II Adolf as a trading port." },
      { year: 1879, theme: "civic", event: "Horse-drawn trams begin in Gothenburg.", quote: "In 1879 horse-drawn trams began operating in the city." },
      { year: 1841, theme: "commerce_industry", event: "Gotaverken shipyard founded.", quote: "The shipyard Gotaverken was founded in 1841 and grew into a large industrial complex." },
      { year: 1990, theme: "culture", event: "Invented marathon event.", quote: "A big marathon began in 1990 with 100000 runners." },
      { year: 1927, theme: "commerce_industry", event: "Volvo founded in Gothenburg.", quote: "Volvo was founded in Gothenburg in 1927." },
      { year: 1879, theme: "civic", event: "Horse-drawn trams begin in Gothenburg city.", quote: "Horse-drawn trams were running in Gothenburg from 1879 onward." },
      { year: 1979, theme: "culture", event: "Film festival starts in Gothenburg.", quote: "A film festival started in 1979 and has run every year since." },
      { year: 1900, theme: "civic", event: "Something regarding the city recorded in 1900.", quote: "A film festival started in 1979 and has run every year since." }
    ]);
    return JSON.stringify([
      { index: 0, supported: true, reason: "matches" },
      { index: 1, supported: true, reason: "matches" },
      { index: 2, supported: false, reason: "quote is about a shipyard, not a founding in the stated sense" },
      { index: 3, supported: true, reason: "matches" },
      { index: 4, supported: true, reason: "matches" },
      { index: 5, supported: true, reason: "matches" }
    ]);
  };
  const out = await build({ city: "Gothenburg", title: "Gothenburg", articleText: text, sourceUrl: "https://en.wikipedia.org/wiki/Gothenburg", askFn: fake });
  ok("references section is stripped before extraction", !prepareArticle(text).includes("Smith, John (1999)"));
  ok("invented event is dropped by the quote check", out.rejects.some(r => r.year === 1990 && r.stage === "code check"));
  ok("year in the event text is rejected", out.rejects.some(r => r.year === 1900 && /year appears/.test(r.why)));
  ok("unsupported event is dropped by verification", out.rejects.some(r => r.year === 1841 && r.stage === "verification"));
  ok("near-duplicate is dropped", out.rejects.some(r => r.stage === "duplicate"));
  ok("accepted events carry the article link", out.events.every(e => e.source === "https://en.wikipedia.org/wiki/Gothenburg"));
  ok("accepted events are in date order", out.events.every((e, i, a) => i === 0 || a[i - 1].year <= e.year));
  console.log(out.events.length + " accepted, " + out.rejects.length + " rejected");
  process.exit(selftestPassed ? 0 : 1);
}

// ---- command line ----
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();

function readBuildErrors() {
  if (!fs.existsSync(ERRORS_FILE)) return {};
  const errors = JSON.parse(fs.readFileSync(ERRORS_FILE, "utf8"));
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    throw new Error(`${ERRORS_FILE} must contain an object keyed by city id`);
  }
  return errors;
}

function writeBuildErrors(errors) {
  fs.mkdirSync(path.dirname(ERRORS_FILE), { recursive: true });
  const sorted = Object.keys(errors).sort().reduce((out, id) => {
    out[id] = errors[id];
    return out;
  }, {});
  fs.writeFileSync(ERRORS_FILE, JSON.stringify(sorted, null, 1) + "\n");
}

function rejectCounts(rejects) {
  return rejects.reduce((counts, reject) => {
    counts[reject.stage] = (counts[reject.stage] || 0) + 1;
    return counts;
  }, {});
}

export function pendingCities(cities, hasQuiz, errors = {}, { force = false, retryErrors = false } = {}) {
  const candidates = cities.filter(city => force || !hasQuiz(city.id));
  const retryable = candidates.filter(city => isRetryableGemini503(errors[city.id]));
  const blocked = candidates.filter(city => errors[city.id] && !retryable.includes(city));
  const eligible = candidates.filter(city => force || retryErrors || !errors[city.id] || retryable.includes(city));
  return { candidates, blocked, retryable, eligible };
}

function isRetryableGemini503(error) {
  return error?.stats?.provider === "gemini" && /\bgemini call failed:\s*503\b/i.test(error.error || "");
}

async function processOne({ id, town, country = "", wikiTitle }, { force = false, retryErrors = false, errors = {} } = {}) {
  const quizDir = path.join(root, "data", "quiz");
  const outPath = path.join(quizDir, id + ".json");
  if (!force && fs.existsSync(outPath)) { console.log(`${id} (${town}): already exists, skipping`); return; }
  if (!force && errors[id] && !retryErrors) {
    console.log(`${id} (${town}): previous failure recorded, skipping (use --retry-errors to retry)`);
    return;
  }

  const stats = { provider, model: PROVIDERS[provider].model, calls: 0, promptTokens: 0, completionTokens: 0 };
  const askFn = (prompt) => callModel(prompt, stats);
  let stage = "Wikipedia lookup";
  try {
    const article = await fetchArticle(wikiTitle || town, country);
    stage = "event extraction and verification";
    const out = await build({ city: town, title: article.title, articleText: article.text, sourceUrl: article.url, askFn });
    const summary = `${id} (${town}): ${out.pool.length} events, ${out.rejects.length} rejected, ` +
      `read ${out.chunksRead} of ${out.chunksAvailable} article chunks, ${stats.calls} calls, ` +
      `${stats.promptTokens + stats.completionTokens} tokens (${stats.promptTokens} in, ${stats.completionTokens} out)`;

    if (out.pool.length < MIN_POOL) {
      errors[id] = {
        town, country, failedAt: new Date().toISOString(), stage: "event pool",
        error: `Only ${out.pool.length} usable events; at least ${MIN_POOL} are required.`,
        poolSize: out.pool.length, minimumPool: MIN_POOL, rejected: out.rejects.length,
        rejectedByStage: rejectCounts(out.rejects),
        chunksRead: out.chunksRead, chunksAvailable: out.chunksAvailable, stats
      };
      writeBuildErrors(errors);
      console.warn(summary + ` — failure recorded in ${path.relative(root, ERRORS_FILE)}, no file written`);
      return;
    }

    fs.mkdirSync(quizDir, { recursive: true });
    fs.writeFileSync(path.join(quizDir, id + ".rejects.json"),
      JSON.stringify({ stats: { ...stats, chunksRead: out.chunksRead, chunksAvailable: out.chunksAvailable }, rejects: out.rejects }, null, 1) + "\n");
    fs.writeFileSync(outPath, JSON.stringify(toGameFile(out, id, town, stats.model), null, 1) + "\n");
    if (errors[id]) {
      delete errors[id];
      writeBuildErrors(errors);
    }
    console.log(summary);
  } catch (err) {
    errors[id] = {
      town, country, failedAt: new Date().toISOString(), stage,
      error: err.message, stats
    };
    writeBuildErrors(errors);
    console.error(`${id} (${town}): ${err.message} — failure recorded in ${path.relative(root, ERRORS_FILE)}`);
  }
}

if (process.argv.includes("--selftest")) {
  await selftest();
} else if (isMain) {
  const args = process.argv.slice(2);
  const providerArg = args.find(a => a.startsWith("--provider="));
  provider = (providerArg ? providerArg.split("=")[1] : (process.env.QUIZ_PROVIDER || "gemini")).toLowerCase();
  if (!PROVIDERS[provider]) { console.error(`Unknown provider ${provider}. Use gemini or groq.`); process.exit(1); }
  const batchesArg = args.find(a => a.startsWith("--batches="));
  if (batchesArg) { const n = parseInt(batchesArg.split("=")[1], 10); if (Number.isFinite(n) && n >= 0) globalThis.__BATCHES = n; }
  const verifyArg = args.find(a => a.startsWith("--verify="));
  if (verifyArg) { const n = parseInt(verifyArg.split("=")[1], 10); if (n >= 1) globalThis.__VERIFY = n; }

  const force = args.includes("--force");
  const retryErrors = args.includes("--retry-errors");
  const startArg = args.find(a => a.startsWith("--start="));
  const countArg = args.find(a => a.startsWith("--count="));
  const start = startArg ? Math.max(0, parseInt(startArg.split("=")[1], 10) || 0) : 0;
  const count = countArg ? Math.max(1, parseInt(countArg.split("=")[1], 10) || Infinity) : Infinity;
  const positional = args.filter(a => !a.startsWith("--"));

  if (!process.env[PROVIDERS[provider].keyEnv]) { console.error(`Set ${PROVIDERS[provider].keyEnv} for --provider=${provider}.`); process.exit(1); }
  console.log(`Provider: ${provider} (${PROVIDERS[provider].model})`);
  if (positional.length === 0) {
    const allCities = gameCities();
    const errors = readBuildErrors();
    const selection = pendingCities(
      allCities,
      id => fs.existsSync(path.join(root, "data", "quiz", id + ".json")),
      errors,
      { force, retryErrors }
    );
    const { candidates, blocked, retryable, eligible } = selection;
    const cities = eligible.slice(start, start + count);
    console.log(`Loaded ${allCities.length} current game cities; ${candidates.length} without quiz files` +
      `, ${retryable.length} recorded Gemini 503 failures to retry, ${blocked.length} other recorded failures` +
      `${retryErrors || force ? " (retrying)" : " (skipped)"}.`);
    console.log(`Running pending entries [${start}..${start + cities.length - 1}] (${cities.length} cities)\n`);
    for (let i = 0; i < cities.length; i++) {
      await processOne(cities[i], { force, retryErrors, errors });
      if (i < cities.length - 1) await sleep(TOWN_DELAY_MS);
    }
  } else {
    const [id, town = id, wikiTitle = town] = positional;
    const errors = readBuildErrors();
    await processOne({ id, town, wikiTitle }, { force, retryErrors, errors });
  }
}
