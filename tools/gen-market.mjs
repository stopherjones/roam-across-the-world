// =============================================================================
// gen-market.mjs: builds data/market.json, the goods each town sells, using Groq.
//
// Usage (from the repo root):
//   GROQ_API_KEY=your-key node tools/gen-market.mjs --town gva        // one town (Geneva's id)
//   GROQ_API_KEY=your-key node tools/gen-market.mjs --batch 5         // next 5 towns without an entry
//   node tools/gen-market.mjs --dry-run --town gva                    // lists what it would do; no calls
//
// What each entry holds (no people's names are generated):
//   name       product name as someone would search for it, e.g. "Gruyère cheese"
//   kind       "food" | "craft" | "other" (a label only; optional, so the list isn't forced into categories)
//   what_and_why  one sentence: what it is and the place-specific reason it belongs to this town
//   rarity     "common" | "uncommon" | "scarce"   (drives supply in the game)
//   tier       "routine" | "luxury"              (drives value in the game)
//   search     a phrase that should return real examples online, usually name + town
//
// Entries that fail the checks are dropped, and a town with fewer than 3 valid items is retried once,
// then left out so the next run tries it again. Existing entries are never overwritten.
// The output is reviewed by hand before the game uses it.
// =============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "market.json");

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------
const MODEL = "openai/gpt-oss-120b";          // same model as the other generators
const PROMPT_VERSION = "market-v3";           // bump when prompt() changes
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TOKENS = 1200;                      // 3 to 5 items in JSON needs room
const REASONING_EFFORT = "low";               // reasoning tokens count against the limit
const PAUSE_MS = 3000;                        // pause between towns, to stay under the per-minute token limit
const RETRIES = 4;                            // attempts on 429 / 5xx errors
const MIN_ITEMS = 3, MAX_ITEMS = 5;
const KINDS = ["food", "craft", "other"];
const RARITY = ["common", "uncommon", "scarce"];
const TIERS = ["routine", "luxury"];
// Words that suggest generic souvenirs or mass-market goods. An item containing one is dropped.
const BANNED = /souvenir|keepsake|replica|fridge magnet|t-?shirt|mug|snow ?globe/i;

const args = process.argv.slice(2);
const batchArg = args.indexOf("--batch");
const BATCH = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 5;
const townArg = args.indexOf("--town");
const ONLY = townArg >= 0 ? args[townArg + 1] : null;
const DRY = args.includes("--dry-run");

// ----------------------------------------------------------------------------
// prompt(town, country): the instruction sent to the model. Keep the JSON-only instruction.
// ----------------------------------------------------------------------------
function prompt(town, country) {
  return "List 3 to 5 goods that are genuinely associated with " + town + (country ? " (" + country + ")" : "") + ".\n" +
    "Cover things like (non-perishable) food, local crafts or other specialities, and iconic items with a clear and specific connection to the town or locality. Do not force responses for all of these categories, use your knowledge of the town to drive responses\n" +
    "For each item give:\n" +
    "- name: the product name\n" +
    "- kind: \"food\", \"craft\" or \"other\".\n" +
    "- what_and_why: one sentence saying what it is and giving the specific reason it belongs to this place.\n" +
    "- rarity: \"common\", \"uncommon\" or \"scarce\".\n" +
    "- tier: \"routine\" for everyday goods, \"luxury\" for expensive or prized ones.\n" +
    "- search: a short phrase that should return real examples online, usually the name plus the town.\n" +
    "Do not invent makers, shops, dealers or people. Do not include souvenirs, or products that are simply imported and sold everywhere.\n" +
    "Only include an item you are confident is genuinely made or sold there.\n" +
    "Reply with a JSON array of objects with those keys, and nothing else.";
}

// ----------------------------------------------------------------------------
// parseItems(text): reads the reply as a JSON array, tolerating code fences around it.
// ----------------------------------------------------------------------------
function parseItems(text) {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("["), end = t.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("no JSON array in reply");
  const arr = JSON.parse(t.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("reply is not an array");
  return arr;
}

// ----------------------------------------------------------------------------
// valid(item): true if the item has every field, valid values, and no banned words.
// ----------------------------------------------------------------------------
function valid(item) {
  if (!item || typeof item !== "object") return false;
  const str = k => typeof item[k] === "string" && item[k].trim().length > 0;
  if (!str("name") || !str("what_and_why") || !str("search")) return false;
  if (item.kind !== undefined && !KINDS.includes(item.kind)) return false;
  if (!RARITY.includes(item.rarity) || !TIERS.includes(item.tier)) return false;
  if (item.name.length > 60) return false;
  if (BANNED.test(item.name + " " + item.what_and_why)) return false;
  return true;
}

// clean(item): trims the fields and keeps only the ones the game uses.
function clean(item) {
  const s = v => String(v).replace(/\s+/g, " ").trim();
  return { name: s(item.name), kind: KINDS.includes(item.kind) ? item.kind : "other", what_and_why: s(item.what_and_why),
           rarity: item.rarity, tier: item.tier, search: s(item.search) };
}

// ----------------------------------------------------------------------------
// townList(): the towns in the game's order, from data.js and the region files.
// ----------------------------------------------------------------------------
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
function countryNames() {
  const src = fs.readFileSync(path.join(root, "data", "countries.js"), "utf8");
  const out = {};
  for (const m of src.matchAll(/"([^"]+)":\[([^\]]*)\]/g))
    for (const id of m[2].matchAll(/"([a-z0-9]{2,4})"/g)) out[id[1]] = m[1];
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ----------------------------------------------------------------------------
// groq(text): one request, with retries on 429 / 5xx. Logs token usage.
// ----------------------------------------------------------------------------
async function groq(text) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: text }],
        max_tokens: MAX_TOKENS, reasoning_effort: REASONING_EFFORT })
    });
    if (r.status === 429 || r.status >= 500) {
      if (attempt >= RETRIES) throw new Error("Groq returned " + r.status + " after " + attempt + " tries");
      const wait = (parseFloat(r.headers.get("retry-after")) || 0) * 1000 || 15000 * attempt;
      console.log("     " + r.status + ", waiting " + Math.round(wait / 1000) + "s");
      await sleep(wait);
      continue;
    }
    if (!r.ok) throw new Error("Groq returned " + r.status);
    const j = await r.json();
    const u = j.usage || {};
    console.log("     tokens: prompt " + (u.prompt_tokens ?? "?") + ", completion " + (u.completion_tokens ?? "?") +
      ", reasoning " + ((u.completion_tokens_details || {}).reasoning_tokens ?? "?"));
    return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").trim();
  }
}

// ----------------------------------------------------------------------------
// itemsFor(town, country): asks for the goods, checks them, retries once if fewer than MIN_ITEMS are valid.
// ----------------------------------------------------------------------------
async function itemsFor(town, country) {
  let good = [];
  for (let attempt = 1; attempt <= 2 && good.length < MIN_ITEMS; attempt++) {
    const extra = attempt === 2 ? "\nYour previous reply did not pass the checks. Give only items you are sure of." : "";
    const raw = await groq(prompt(town, country) + extra);
    good = parseItems(raw).filter(valid).map(clean).slice(0, MAX_ITEMS);
  }
  return good;
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
async function main() {
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const all = townList();
  const countries = countryNames();
  let todo = ONLY ? all.filter(t => t.id === ONLY) : all.filter(t => !existing[t.id]).slice(0, BATCH);
  if (ONLY && !todo.length) { console.log("No town with id " + ONLY); return; }
  console.log("this run: " + todo.length + " towns, prompt " + PROMPT_VERSION + (DRY ? " (dry run)" : ""));
  if (DRY) { todo.forEach(t => console.log("would write " + t.id + " " + t.name)); return; }
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");

  for (const t of todo) {
    if (t !== todo[0]) await sleep(PAUSE_MS);
    try {
      const items = await itemsFor(t.name, countries[t.id]);
      if (items.length < MIN_ITEMS) { console.log("skip " + t.id + " " + t.name + ": only " + items.length + " valid items"); continue; }
      existing[t.id] = { name: t.name, items, prompt: PROMPT_VERSION, model: MODEL, generated: new Date().toISOString().slice(0, 10) };
      console.log("ok   " + t.id + " " + t.name + " (" + items.length + ")");
    } catch (e) {
      console.log("fail " + t.id + " " + t.name + ": " + e.message);
    }
  }
  const sorted = Object.keys(existing).sort().reduce((o, k) => (o[k] = existing[k], o), {});
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n", "utf8");
  console.log("total towns in file: " + Object.keys(sorted).length);
}

main().catch(e => { console.error(e.message); process.exit(1); });
