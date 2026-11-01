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
const PROMPT_VERSION = "intro-v1";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const args = process.argv.slice(2);
const batchArg = args.indexOf("--batch");
const BATCH = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 20;
const DRY = args.includes("--dry-run");

// Same prompt the game uses today, so the text stays in the same voice.
function prompt(town) {
  return "You are producing a travel TV show - provide a short, light, informative voiceover script introducing " + town +
    ". Your response should start \"" + town + "\", then cover its geographic location, history and current significance. Keep it to around 100 words.";
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
  const todo = townList().filter(t => !existing[t.id]).slice(0, BATCH);
  console.log("towns without an intro: " + todo.length + " this run (batch " + BATCH + ")");
  if (!todo.length) return;
  if (!DRY && !process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");

  let added = 0;
  for (const t of todo) {
    try {
      const text = DRY ? placeholder(t.name) : await groq(prompt(t.name));
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
