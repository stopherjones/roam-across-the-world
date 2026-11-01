// Fills data/intros.json with a short introduction for each town, using Groq.
// Usage:  GROQ_API_KEY=... node tools/gen-intros.mjs [--batch 20] [--dry-run]
// Skips towns that already have an entry, so repeat runs only fill gaps.
// Each entry records the model and prompt version, so a prompt change can regenerate old text later.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "intros.json");
const MODEL = "openai/gpt-oss-120b";
const PROMPT_VERSION = "intro-v2";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const args = process.argv.slice(2);
const batchArg = args.indexOf("--batch");
const BATCH = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 20;
const DRY = args.includes("--dry-run");

// v2 prompt: fewer stock phrases, facts only where confident, British English, plain text.
function prompt(town, country) {
  return "Write a short travel-show voiceover introducing " + town + (country ? " (" + country + ")" : "") + ".\n" +
    "Start with the town's name. Cover where it is, one or two well-established historical facts, and what it is like today.\n" +
    "Use only facts you are confident are accurate. If you are unsure of a date, name or nickname, leave it out.\n" +
    "Do not use the words 'nestled', 'hidden gem' or 'join us'. Do not use bullet points, headings or quotation marks around the town name.\n" +
    "Plain, warm, British English. About 90 words, as one paragraph.";
}

// Post-processing and checks. A reply that fails is not stored, so the town is retried on the next run.
function clean(text) {
  return text.replace(/[\u2010\u2011\u2012]/g, "-").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, " ").trim();
}
function check(text, name) {
  const words = text.split(/\s+/).length;
  if (words < 60 || words > 130) return "length " + words + " words";
  if (!text.toLowerCase().startsWith(name.split(",")[0].toLowerCase().split(" (")[0].slice(0, 6))) return "does not start with the town name";
  if (/nestled|hidden gem|join us/i.test(text)) return "banned phrase";
  return null;
}

// Town list from the region files, in the order the game uses (PLACE_ORDER), skipping landmark-only rows.
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

async function groq(text) {
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: text }] })
  });
  if (!r.ok) throw new Error("Groq returned " + r.status);
  const j = await r.json();
  const out = ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").replace(/\*\*/g, "").trim();
  if (!out) throw new Error("empty reply");
  return out;
}

function placeholder(name) {
  return name + " (dry run: placeholder text, not generated).";
}

async function main() {
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const all = townList();
  const outdated = all.filter(t => existing[t.id] && existing[t.id].prompt !== PROMPT_VERSION);
  const missing = all.filter(t => !existing[t.id]);
  const todo = outdated.concat(missing).slice(0, BATCH);
  console.log("this run: " + todo.length + " of " + (outdated.length + missing.length) + " towns to write (" + outdated.length + " to redo for " + PROMPT_VERSION + ", " + missing.length + " missing), batch " + BATCH);
  const countries = countryNames();
  if (!todo.length) return;
  if (!DRY && !process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");

  let added = 0;
  for (const t of todo) {
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
