// Builds a timeline quiz for one city from its Wikipedia article.
// Every event must quote a sentence that really is in the fetched article, and a second call must confirm it.
//   node tools/quiz-build.mjs Gothenburg
//   node tools/quiz-build.mjs --selftest
// Output: data/quiz/<city>.json (accepted events) and data/quiz/<city>.rejects.json (what was dropped, and why).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROXY = "https://groq-proxy.chrisjones59.workers.dev/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const THEMES = ["power_conflict", "civic", "commerce_industry", "culture", "food_daily", "environment"];
const UA = "role-around-the-world-quiz-builder/0.1 (personal project)";

// ---- text helpers ----
export function norm(s) {
  return s.normalize("NFKC").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
}
export function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20);
}
// Only sentences that mention a year can become events, so only those are sent to the model.
export function yearSentences(text) {
  return sentences(text).filter(s => /\b1\d{3}\b|\b20[0-2]\d\b/.test(s));
}
// Splits sentences into groups that fit comfortably in one request.
export function batches(items, maxChars = 12000) {
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
// A candidate passes only if its quote is a real sentence in the article and contains its year.
export function checkCandidate(c, articleText) {
  if (!c || typeof c.year !== "number" || !Number.isInteger(c.year)) return "year is not a whole number";
  if (c.year < 1000 || c.year > 2026) return "year out of range";
  if (!THEMES.includes(c.theme)) return "unknown theme " + c.theme;
  if (!c.event || c.event.split(/\s+/).length > 25) return "event text missing or too long";
  if (!c.quote) return "no quote";
  if (!norm(articleText).includes(norm(c.quote))) return "quote is not in the article";
  if (!norm(c.quote).includes(String(c.year))) return "quoted sentence does not contain the year";
  return null;
}

// ---- model calls ----
export function candidatesPrompt(city, articleText) {
  return [
    `You are building a timeline quiz about ${city}. Use ONLY the sentences below, which come from the article. Do not use outside knowledge.`,
    `Return a JSON array of up to 15 events. Each item: {"year": whole number, "theme": one of ${THEMES.join(", ")}, "event": a short description of 10 to 15 words, "quote": the exact sentence from the text that states the event and year}.`,
    `Cover a mix of themes, including power and conflict, civic development, commerce and industry, and popular culture. Do not invent events or years. If the text does not support an event, leave it out.`,
    `Return only the JSON array, with no commentary.`,
    `SENTENCES:\n${articleText}`
  ].join("\n\n");
}
export function verifyPrompt(c) {
  return [
    `A quiz claims this event happened in ${c.year}: "${c.event}"`,
    `The source sentence is: "${c.quote}"`,
    `Does the source sentence support both the event and the year? Answer with only JSON: {"supported": true or false, "reason": "short reason"}.`
  ].join("\n");
}

async function askModel(prompt, fetchFn = fetch) {
  const r = await fetchFn(PROXY, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.2 })
  });
  if (!r.ok) throw new Error("model call failed: " + r.status + " " + (await r.text()).slice(0, 300));
  const j = await r.json();
  return j.choices[0].message.content;
}

// ---- selection: one of each theme first, then the strongest of the rest, spread across time ----
export function select(accepted, n = 10) {
  const byYear = [...accepted].sort((a, b) => a.year - b.year);
  const chosen = [];
  for (const t of THEMES) {
    const c = byYear.find(e => e.theme === t && !chosen.includes(e));
    if (c && chosen.length < n) chosen.push(c);
  }
  for (const e of byYear) {
    if (chosen.length >= n) break;
    if (!chosen.includes(e)) chosen.push(e);
  }
  chosen.sort((a, b) => a.year - b.year);
  return { events: chosen, pool: byYear.filter(e => !chosen.includes(e)) };
}

// ---- the pipeline, with the model and the article passed in so it can be tested ----
export async function build({ city, title, articleText, sourceUrl, askFn }) {
  const rejects = [], accepted = [];
  // Candidates come from the year sentences, batch by batch, and are de-duplicated by year and quote
  const seen = new Set(), raw = [];
  for (const batch of batches(yearSentences(articleText))) {
    for (const c of parseJsonLoose(await askFn(candidatesPrompt(city, batch)))) {
      const key = c.year + "|" + norm(String(c.quote || ""));
      if (!seen.has(key)) { seen.add(key); raw.push(c); }
    }
  }
  for (const c of raw) {
    const why = checkCandidate(c, articleText);
    if (why) { rejects.push({ ...c, stage: "code check", why }); continue; }
    const v = parseJsonLoose(await askFn(verifyPrompt(c)));
    if (!v.supported) { rejects.push({ ...c, stage: "verification", why: v.reason || "not supported" }); continue; }
    accepted.push({ year: c.year, theme: c.theme, event: c.event, quote: c.quote, source: sourceUrl });
  }
  const { events, pool } = select(accepted);
  return { city, source: { title, url: sourceUrl }, events, pool, rejects };
}

// ---- Wikipedia ----
export async function fetchArticle(title, fetchFn = fetch) {
  const url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=" + encodeURIComponent(title);
  const r = await fetchFn(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("Wikipedia request failed: " + r.status);
  const page = Object.values((await r.json()).query.pages)[0];
  if (!page || page.missing !== undefined) throw new Error("No Wikipedia article called " + title);
  return { text: page.extract, title: page.title, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")) };
}

// ---- self-test: fixture text and a fake model, so the checks can be seen working ----
async function selftest() {
  const text = "Gothenburg was founded in 1621 by King Gustav II Adolf as a trading port. In 1879 horse-drawn trams began operating in the city. The shipyard Gotaverken was founded in 1841 and grew into a large industrial complex. A film festival started in 1979 and has run every year since. Volvo was founded in Gothenburg in 1927.";
  const fake = async (prompt) => {
    if (prompt.includes("Return a JSON array")) return JSON.stringify([
      { year: 1621, theme: "civic", event: "Gothenburg founded as a trading port.", quote: "Gothenburg was founded in 1621 by King Gustav II Adolf as a trading port." },
      { year: 1879, theme: "civic", event: "Horse-drawn trams begin.", quote: "In 1879 horse-drawn trams began operating in the city." },
      { year: 1841, theme: "commerce_industry", event: "Shipyard founded.", quote: "The shipyard Gotaverken was founded in 1841 and grew into a large industrial complex." },
      { year: 1990, theme: "culture", event: "Invented event.", quote: "A big marathon began in 1990 with 100000 runners." },
      { year: 1927, theme: "commerce_industry", event: "Volvo founded.", quote: "Volvo was founded in Gothenburg in 1927." }
    ]);
    // the second call: pretend it doubts the shipyard claim
    if (prompt.includes("Gotaverken")) return '{"supported": false, "reason": "quote is about a shipyard, not a founding in the stated sense"}';
    return '{"supported": true, "reason": "matches"}';
  };
  const out = await build({ city: "Gothenburg", title: "Gothenburg", articleText: text, sourceUrl: "https://en.wikipedia.org/wiki/Gothenburg", askFn: fake });
  const ok = (n, c) => console.log((c ? "PASS " : "FAIL ") + n);
  ok("invented event is dropped by the code check", out.rejects.some(r => r.year === 1990 && r.stage === "code check"));
  ok("unsupported event is dropped by verification", out.rejects.some(r => r.year === 1841 && r.stage === "verification"));
  ok("accepted events carry the article link", out.events.every(e => e.source === "https://en.wikipedia.org/wiki/Gothenburg"));
  ok("accepted events are in date order", out.events.every((e, i, a) => i === 0 || a[i - 1].year <= e.year));
  ok("events cover more than one theme", new Set(out.events.map(e => e.theme)).size >= 2);
  const big = Array.from({ length: 400 }, (_, i) => "Event number " + i + " happened in " + (1000 + i) + " and was recorded in full.");
  ok("a long article is split into several requests", batches(big).length > 1 && batches(big).every(b => b.length <= 12000 + 200));
  const mixed = text + " The harbour is busy with ships from many countries.";
  ok("only year sentences are sent", yearSentences(mixed).every(s => /\b1\d{3}\b|\b20\d\d\b/.test(s)) && yearSentences(mixed).length < sentences(mixed).length);
  console.log(out.events.length + " accepted, " + out.rejects.length + " rejected");
  process.exit(0);
}

// ---- command line ----
if (process.argv.includes("--selftest")) await selftest();
else if (import.meta.url === "file://" + process.argv[1] || process.argv[1]?.endsWith("quiz-build.mjs")) {
  const city = process.argv[2] || "Gothenburg";
  const article = await fetchArticle(city);
  const out = await build({ city, title: article.title, articleText: article.text, sourceUrl: article.url, askFn: askModel });
  const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  fs.writeFileSync(path.join(root, "data/quiz", slug + ".json"), JSON.stringify(out, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "data/quiz", slug + ".rejects.json"), JSON.stringify(out.rejects, null, 2) + "\n");
  console.log(`${out.events.length} events chosen, ${out.pool.length} in the pool, ${out.rejects.length} rejected. See data/quiz/${slug}.json`);
}
