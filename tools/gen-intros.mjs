// Fills data/intros.json with a short description of each town, using Groq.
// Usage:  GROQ_API_KEY=... node tools/gen-intros.mjs [--batch 20] [--dry-run]
// Writes only towns that have no entry yet. Clear data/intros.json first to regenerate everything.
// Logs token usage per reply so rate-limit budgets can be checked.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "intros.json");
const MODEL = "openai/gpt-oss-120b";
const PROMPT_VERSION = "intro-v3";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TOKENS = 300;          // caps the reply length, and so the tokens each call uses
const REASONING_EFFORT = "low";  // less reasoning per call; the reasoning tokens count against the limit
const PAUSE_MS = 3000;           // short wait between towns
const RETRIES = 4;               // attempts per town on a rate limit (429) or server error

const args = process.argv.slice(2);
const batchArg = args.indexOf("--batch");
const BATCH = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 20;
const DRY = args.includes("--dry-run");

// v3 prompt: online game tone, not a TV voiceover.
function prompt(town, country) {
  return "Write a short location description of " + town + (country ? " (" + country + ")" : "") + " for a travel game.\n" +
    "Start with the town's name. Cover where it is, one historical fact you are sure of, and what it is like to visit today.\n" +
    "Use only facts you are confident are accurate. If you are unsure of a date, name or nickname, leave it out.\n" +
    "Write in plain, friendly British English, as one paragraph of about 80 to 100 words.\n" +
    "Do not use the words 'nestled', 'hidden gem', 'join us', 'bustling', 'vibrant' or 'blends'. No headings, bullet points or quotation marks.";
}

function clean(text) {
  return text.replace(/[\u2010\u2011\u2012]/g, "-").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, " ").trim();
}

function check(text, name) {
  const words = text.split(/\s+/).length;
  if (words < 60 || words > 130) return "length " + words + " words";
  const names = [name.split(",")[0].split(" (")[0], (name.match(/\(([^)]+)\)/) || [])[1]].filter(Boolean);
  if (!names.some(n => text.toLowerCase().startsWith(n.toLowerCase().slice(0, 6)))) return "does not start with the town name";
  if (/nestled|hidden gem|join us|bustling|vibrant|blends/i.test(text)) return "banned phrase";
  return null;
}

// Town list from the region files, in the game's order, skipping landmark-only rows.
function townList() {
  const data = fs.readFileSync(path.join(root, "data.js"), "utf8");
  const order = (data.match(/var PLACE_ORDER="([^"]*)"/) || [])[1];
  const ids = order ? order.split(/\s+/).filter(Boolean) : [];
  const names = {};
  const dir = path.join(root, "data", "regions");
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of t.matchAll(/([a-z0-9]{2,4})\|([^|;"]+)\|(-?[\d.]+)\|(-?[\d.]+)\|([^|]*)\|([^|;"]*)/g)) {
      if (!names[m[1]] && !m[6].includes("l")) names[m[1]] = m[2];
    }
  }
  return ids.filter(id => names[id]).map(id => ({ id, name: names[id] }));
}

// Country name for each town, from PLACE_COUNTRY_LISTS in data/countries.js.
function countryNames() {
  const src = fs.readFileSync(path.join(root, "data", "countries.js"), "utf8");
  const out = {};
  for (const m of src.matchAll(/"([^"]+)":\[([^\]]*)\]/g)) {
    for (const id of m[2].matchAll(/"([a-z0-9]{2,4})"/g)) out[id[1]] = m[1];
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function groq(text) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: text }],
        max_tokens: MAX_TOKENS,
        reasoning_effort: REASONING_EFFORT
      })
    });
    if (r.status === 429 || r.status >= 500) {
      if (attempt >= RETRIES) throw new Error("Groq returned " + r.status + " after " + attempt + " tries");
      const wait = (parseFloat(r.headers.get("retry-after")) || 0) * 1000 || 15000 * attempt;
      console.log("     " + r.status + ", waiting " + Math.round(wait / 1000) + "s before retry " + (attempt + 1));
      await sleep(wait);
      continue;
    }
    if (!r.ok) throw new Error("Groq returned " + r.status);
    const j = await r.json();
    const u = j.usage || {};
    console.log("     tokens: prompt " + (u.prompt_tokens ?? "?") + ", completion " + (u.completion_tokens ?? "?") +
      ", total " + (u.total_tokens ?? "?") + ", reasoning " + ((u.completion_tokens_details || {}).reasoning_tokens ?? "?"));
    const out = ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").replace(/\*\*/g, "").trim();
    if (!out) throw new Error("empty reply");
    return out;
  }
}

function placeholder(name) {
  return name + " (dry run: placeholder text, not generated).";
}

async function main() {
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const all = townList();
  const todo = all.filter(t => !existing[t.id]).slice(0, BATCH);
  console.log("this run: " + todo.length + " towns to write (" + all.filter(t => !existing[t.id]).length + " without an entry), batch " + BATCH + ", prompt " + PROMPT_VERSION);
  if (!todo.length) return;
  if (!DRY && !process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  const countries = countryNames();

  let added = 0;
  for (const t of todo) {
    if (!DRY && t !== todo[0]) await sleep(PAUSE_MS);
    try {
      const raw = DRY ? placeholder(t.name) : await groq(prompt(t.name, countries[t.id]));
      const text = clean(raw);
      const problem = DRY ? null : check(text, t.name);
      if (problem) { console.log("skip " + t.id + " " + t.name + ": " + problem); continue; }
      existing[t.id] = { name: t.name, text, model: MODEL, prompt: PROMPT_VERSION, generated: new Date().toISOString().slice(0, 10) };
      added++;
      console.log("ok   " + t.id + " " + t.name);
    } catch (e) {
      console.log("fail " + t.id + " " + t.name + ": " + e.message);
    }
  }
  const sorted = Object.keys(existing).sort().reduce((o, k) => (o[k] = existing[k], o), {});
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n", "utf8");
  console.log("added " + added + ", total " + Object.keys(sorted).length);
}

main().catch(e => { console.error(e.message); process.exit(1); });
