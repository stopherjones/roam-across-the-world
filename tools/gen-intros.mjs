// =============================================================================
// gen-intros.mjs: fills data/intros.json with a short description of each town.
//
// Usage (from the repo root):
//   GROQ_API_KEY=your-key node tools/gen-intros.mjs              // 20 towns
//   GROQ_API_KEY=your-key node tools/gen-intros.mjs --batch 5    // 5 towns
//   node tools/gen-intros.mjs --dry-run --batch 3                // no API calls; placeholder text
//
// How a run works:
//   1. Reads the town list from data.js (PLACE_ORDER) and the region files.
//   2. Skips towns that already have an entry in data/intros.json.
//   3. For each remaining town (up to the batch size), asks Groq for a description.
//   4. Checks the reply. If it fails a check, retries once with the reason given.
//   5. Saves the entry, along with the model and prompt version used.
//   6. Writes data/intros.json at the end of the run, sorted by town id.
//
// To regenerate everything: clear data/intros.json (write {}) and run again.
// To change the wording: edit prompt() and bump PROMPT_VERSION, so entries can
// be tracked by version.
// =============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ----------------------------------------------------------------------------
// Paths. Works out the repo root from this file's location (tools/ is one level down).
// ----------------------------------------------------------------------------
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "intros.json");

// ----------------------------------------------------------------------------
// Settings. Change these to tune cost, speed and output.
// ----------------------------------------------------------------------------

// The Groq model. gpt-oss-120b is the one the game uses for other AI calls.
// Smaller models (e.g. gpt-oss-20b) use fewer tokens, but may write weaker text.
const MODEL = "openai/gpt-oss-120b";

// Recorded with each entry, so text from an older prompt can be found later.
// Bump this whenever prompt() changes.
const PROMPT_VERSION = "intro-v4";

// Groq's OpenAI-compatible chat endpoint.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Maximum tokens in the reply (roughly 0.75 words per token).
// 400 gives room for about 250 to 300 words. Lower values save tokens, but a reply
// cut short fails the checks. 300 truncated some replies (e.g. Matadi), so do not go lower.
const MAX_TOKENS = 400;

// Reasoning effort: "low", "medium" or "high".
// Reasoning tokens count against your token limit even though they are not in the text.
// "low" keeps usage down; "high" may give more careful facts but uses several times as many tokens.
const REASONING_EFFORT = "low";

// Pause between towns, in milliseconds. This keeps the run under the per-minute token limit.
// Each town uses about 350 to 500 tokens. At 3 seconds, a run uses roughly 7,000 tokens a minute,
// close to the Developer plan's 8,000 limit. Raise this (e.g. 5000) if you see 429 errors,
// or on the free plan, which has lower limits.
const PAUSE_MS = 3000;

// Attempts per request when Groq returns 429 (rate limit) or a 5xx (server) error.
// Between attempts the script waits for the time Groq asks for (retry-after header),
// or 15s, 30s, 45s if the header is missing. The town is marked as failed after the last try.
const RETRIES = 4;

// ----------------------------------------------------------------------------
// Command-line arguments.
// ----------------------------------------------------------------------------

// --batch N: how many towns to write in this run. Default 20.
// A daily scheduled run uses 20; a test run might use 3 to 5.
const args = process.argv.slice(2);
const batchArg = args.indexOf("--batch");
const BATCH = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 20;

// --dry-run: skip the API entirely and write placeholder text. Use this to test
// the town list and file handling without spending tokens.
const DRY = args.includes("--dry-run");

// ----------------------------------------------------------------------------
// prompt(town, country): builds the instruction sent to the model.
//   town:    the town's name, as used in the game (e.g. "Hamilton, Bermuda").
//   country: the country name, added in brackets to avoid mix-ups. May be empty.
// To change the style, edit the lines below. Keep the "Start with the town's name"
// line: check() relies on the reply starting with the name.
// ----------------------------------------------------------------------------
function prompt(town, country) {
  return "Write a short location description of " + town + (country ? " (" + country + ")" : "") + " for a travel game.\n" +
    "Start with the town's name. Cover where it is, one historical fact you are sure of, and what it is like to visit today.\n" +
    "Use only facts you are confident are accurate. If you are unsure of a date, name or nickname, leave it out.\n" +
    "Write in plain, friendly British English, as one paragraph of about 80 to 100 words.\n" +
    "Do not use the words 'join us'. No headings, bullet points or quotation marks.";
}

// ----------------------------------------------------------------------------
// clean(text): tidies the reply before it is checked and saved.
//   - Replaces non-breaking and odd hyphens with a normal hyphen.
//   - Replaces non-breaking and narrow spaces with a normal space.
//   - Collapses repeated spaces and joins paragraphs into one line.
// The model sometimes returns these characters, which can break name checks and display.
// ----------------------------------------------------------------------------
function clean(text) {
  return text.replace(/[\u2010\u2011\u2012]/g, "-").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, " ").trim();
}

// ----------------------------------------------------------------------------
// check(text, name): returns null if the reply is acceptable, or a short reason if not.
// The checks, in order:
//   - Length: 60 to 130 words. The target is 80 to 100; this allows some slack.
//   - Opening: the reply must start with the town name (or the bracketed alias,
//     e.g. "Dzaoudzi" for "Mayotte (Dzaoudzi)"). Only the first 6 characters are compared.
//   - Banned phrase: "join us". Add more here if needed, but only where a word
//     truly doesn't belong; each ban can cause a rejection.
// ----------------------------------------------------------------------------
function check(text, name) {
  const words = text.split(/\s+/).length;
  if (words < 60 || words > 130) return "length " + words + " words";
  const names = [name.split(",")[0].split(" (")[0], (name.match(/\(([^)]+)\)/) || [])[1]].filter(Boolean);
  if (!names.some(n => text.toLowerCase().startsWith(n.toLowerCase().slice(0, 6)))) return "does not start with the town name";
  if (/join us/i.test(text)) return "contains 'join us'";
  return null;
}

// ----------------------------------------------------------------------------
// townList(): the towns to write, in the order the game uses (PLACE_ORDER in data.js).
// Reads each region file for the town's name and flags. Landmark-only rows (flag "l")
// are skipped, because they aren't towns and don't appear in the planner.
// Returns [{ id, name }, ...].
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
    // Each row: id|name|lat|lon|country-code|flags
    for (const m of t.matchAll(/([a-z0-9]{2,4})\|([^|;"]+)\|(-?[\d.]+)\|(-?[\d.]+)\|([^|]*)\|([^|;"]*)/g)) {
      if (!names[m[1]] && !m[6].includes("l")) names[m[1]] = m[2];
    }
  }
  return ids.filter(id => names[id]).map(id => ({ id, name: names[id] }));
}

// ----------------------------------------------------------------------------
// countryNames(): maps each town id to its country name, from PLACE_COUNTRY_LISTS
// in data/countries.js. Used to add the country to the prompt.
// ----------------------------------------------------------------------------
function countryNames() {
  const src = fs.readFileSync(path.join(root, "data", "countries.js"), "utf8");
  const out = {};
  for (const m of src.matchAll(/"([^"]+)":\[([^\]]*)\]/g)) {
    for (const id of m[2].matchAll(/"([a-z0-9]{2,4})"/g)) out[id[1]] = m[1];
  }
  return out;
}

// sleep(ms): waits for the given number of milliseconds.
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ----------------------------------------------------------------------------
// groq(text): sends one prompt to Groq and returns the reply text.
//   - Retries on 429 (rate limit) and 5xx (server) errors, up to RETRIES attempts.
//     The wait is taken from the retry-after header if Groq sends one.
//   - Logs token usage for each successful reply, so budgets can be checked.
//     "reasoning" counts tokens spent thinking. It's part of the limit but not the text.
//   - Throws on other errors, or an empty reply. The caller decides what to do.
// ----------------------------------------------------------------------------
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
      // retry-after is in seconds. If missing or zero, wait 15s, 30s, 45s...
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

// ----------------------------------------------------------------------------
// placeholder(name): dry-run text. Used instead of a real reply when --dry-run is set.
// ----------------------------------------------------------------------------
function placeholder(name) {
  return name + " (dry run: placeholder text, not generated).";
}

// ----------------------------------------------------------------------------
// main(): runs one batch.
//   - Picks up to BATCH towns that have no entry yet.
//   - For each: asks Groq, checks the reply, retries once if rejected, saves the entry.
//   - A town that fails (after the retry, or on an API error) is left out, so the next
//     run tries it again. Existing entries are never overwritten.
//   - Writes data/intros.json at the end, sorted by town id.
//   - Pauses PAUSE_MS between towns, but not before the first one.
// ----------------------------------------------------------------------------
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
      let text = DRY ? placeholder(t.name) : clean(await groq(prompt(t.name, countries[t.id])));
      let problem = DRY ? null : check(text, t.name);
      if (problem && !DRY) {
        // One retry. The reason is given back to the model, so it knows what to fix.
        console.log("     first reply rejected (" + problem + "), retrying once");
        await sleep(PAUSE_MS);
        text = clean(await groq(prompt(t.name, countries[t.id]) + "\nYour previous reply was rejected because: " + problem + ". Write it again."));
        problem = check(text, t.name);
      }
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
