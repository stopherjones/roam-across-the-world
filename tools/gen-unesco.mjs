// =============================================================================
// gen-unesco.mjs: builds data/unesco.json, listing UNESCO World Heritage sites near each town.
//
// Usage (from the repo root), after downloading the World Heritage List export as CSV:
//   node tools/gen-unesco.mjs --file path/to/whc-sites.csv
//   node tools/gen-unesco.mjs --file path/to/whc-sites.csv --radius 30 --max 6
//
// Column names are read from the CSV header. The defaults below match the usual
// UNESCO export; if the header differs, change COLUMNS.
//
// How it works:
//   1. Reads the town coordinates from data/regions/*.js (same rows the game uses).
//   2. Reads each site's coordinates from the CSV.
//   3. Attaches each site to the nearest town within RADIUS_KM. Sites further away are dropped.
//   4. Keeps at most MAX_PER_TOWN sites per town, nearest first.
//   5. Writes data/unesco.json, sorted by town id.
//
// Images: each site's photo is looked up on Wikidata (P757 = UNESCO ID, P18 = image). The image is stored with its
// Wikimedia Commons file page, which holds the photographer and licence. Sites with no image stay text-only.
// Pass --no-images to skip the lookup.
//
// The output is static, so the game never calls UNESCO or Wikidata at play time. The list changes
// only when UNESCO adds sites, so re-run this occasionally rather than on a schedule.
// Check UNESCO's terms of use before publishing the output.
// =============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "unesco.json");

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------

// Search radius around each town, in kilometres. A site further away than this is not
// attached to any town. 30 km matches the painting rule. Raise it for remote towns, or
// lower it if the lists look too loose.
const RADIUS_KM = 30;

// Most sites a town can show. Large cities near many sites would otherwise get long lists.
const MAX_PER_TOWN = 6;

// Column names in the CSV header. Change these if UNESCO's export uses different names.
const COLUMNS = {
  id: "id_no",            // the site's UNESCO number, used for the link
  name: "name_en",        // site name in English
  year: "date_inscribed", // year the site was inscribed
  category: "category",   // Cultural, Natural or Mixed
  lat: "latitude",
  lon: "longitude",
  states: "states_names"  // country names, used only for display
};

// ----------------------------------------------------------------------------
// Command-line arguments
// ----------------------------------------------------------------------------
const args = process.argv.slice(2);
const argVal = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
const FILE = argVal("--file", null);
const RADIUS = parseFloat(argVal("--radius", RADIUS_KM));
const MAX = parseInt(argVal("--max", MAX_PER_TOWN), 10);
const WITH_IMAGES = !args.includes("--no-images");

// Wikidata asks for an identifying User-Agent. Put your own contact details here.
const UA = "roam-across-the-world-build/1.0 (contact: your-email-or-repo-url)";
const WD_URL = "https://query.wikidata.org/sparql";

// ----------------------------------------------------------------------------
// parseCSV(text): splits CSV text into rows of values. Handles quoted fields, commas inside
// quotes and doubled quotes. Returns an array of arrays. Blank lines are skipped.
// ----------------------------------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== "")) rows.push(row);
  return rows;
}

// ----------------------------------------------------------------------------
// readSites(file): reads the CSV and returns the sites with usable coordinates.
// Throws a clear error if a required column is missing, so a changed export is easy to spot.
// ----------------------------------------------------------------------------
function readSites(file) {
  const rows = parseCSV(fs.readFileSync(file, "utf8"));
  const header = rows.shift().map(h => h.trim());
  const col = name => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error("CSV column not found: " + name + " (headers: " + header.join(", ") + ")");
    return i;
  };
  const idx = {};
  for (const k of Object.keys(COLUMNS)) {
    if (k === "states") { idx[k] = header.indexOf(COLUMNS[k]); continue; }
    idx[k] = col(COLUMNS[k]);
  }
  return rows.map(r => ({
    id: r[idx.id], name: r[idx.name], year: r[idx.year], category: r[idx.category],
    lat: parseFloat(r[idx.lat]), lon: parseFloat(r[idx.lon]),
    states: idx.states >= 0 ? r[idx.states] : ""
  })).filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon));
}

// ----------------------------------------------------------------------------
// readTowns(): town id, name and coordinates, from the game's own data (PLACE_ORDER and the region files).
// Landmark-only rows (flag "l") are skipped.
// ----------------------------------------------------------------------------
function readTowns() {
  const data = fs.readFileSync(path.join(root, "data.js"), "utf8");
  const order = (data.match(/var PLACE_ORDER="([^"]*)"/) || [])[1];
  const ids = order ? order.split(/\s+/).filter(Boolean) : [];
  const info = {};
  const dir = path.join(root, "data", "regions");
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of t.matchAll(/([a-z0-9]{2,4})\|([^|;"]+)\|(-?[\d.]+)\|(-?[\d.]+)\|([^|]*)\|([^|;"]*)/g)) {
      if (!info[m[1]] && !m[6].includes("l")) info[m[1]] = { name: m[2], lat: parseFloat(m[3]), lon: parseFloat(m[4]) };
    }
  }
  return ids.filter(id => info[id]).map(id => ({ id, ...info[id] }));
}

// ----------------------------------------------------------------------------
// distanceKm(a, b): great-circle distance in kilometres between two points.
// ----------------------------------------------------------------------------
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, p = Math.PI / 180;
  const x = Math.sin((lat2 - lat1) * p / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin((lon2 - lon1) * p / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ----------------------------------------------------------------------------
// attach(sites, towns): for each site, finds the nearest town within RADIUS.
// Returns { townId: [ { name, year, category, url, km }, ... ] }, nearest first, capped at MAX.
// A site is attached to one town only, so the same site doesn't appear in several lists.
// ----------------------------------------------------------------------------
function attach(sites, towns) {
  const out = {};
  for (const s of sites) {
    let best = null;
    for (const t of towns) {
      const d = distanceKm(s.lat, s.lon, t.lat, t.lon);
      if (d <= RADIUS && (!best || d < best.d)) best = { t, d };
    }
    if (!best) continue;
    (out[best.t.id] = out[best.t.id] || []).push({
      id: s.id, name: s.name, year: s.year, category: s.category,
      url: "https://whc.unesco.org/en/list/" + s.id + "/",
      km: Math.round(best.d * 10) / 10
    });
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => a.km - b.km || a.name.localeCompare(b.name));
    out[k] = out[k].slice(0, MAX);
    if (!out[k].length) delete out[k];   // a cap of 0 leaves nothing to show
  }
  return Object.keys(out).sort().reduce((o, k) => (o[k] = out[k], o), {});
}

// ----------------------------------------------------------------------------
// imagesFor(ids): asks Wikidata for a photo of each site, by its UNESCO ID.
// Returns { "404": { src, page }, ... }. Batches of 50 IDs, one second apart.
// src is a Commons image at 800 px wide. page is the Commons file page (photographer and licence).
// ----------------------------------------------------------------------------
async function imagesFor(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).map(id => '"' + String(id).replace(/[^0-9A-Za-z-]/g, "") + '"').join(" ");
    const q = "SELECT ?id ?image WHERE { VALUES ?id { " + batch + " } ?item wdt:P757 ?id . ?item wdt:P18 ?image . }";
    const r = await fetch(WD_URL + "?format=json&query=" + encodeURIComponent(q), {
      headers: { "User-Agent": UA, "Accept": "application/sparql-results+json" }
    });
    if (!r.ok) throw new Error("Wikidata returned " + r.status + " for batch starting at " + i);
    const j = await r.json();
    for (const b of (j.results && j.results.bindings) || []) {
      const id = b.id.value;
      if (out[id]) continue;   // keep the first image found for each site
      const file = decodeURIComponent(b.image.value.split("/").pop());
      out[id] = {
        src: "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=800",
        page: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file.replace(/ /g, "_"))
      };
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  return out;
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
async function main() {
  if (!FILE) { console.error("Give the CSV path with --file"); process.exit(1); }
  const sites = readSites(FILE);
  const towns = readTowns();
  const out = attach(sites, towns);
  if (WITH_IMAGES) {
    const ids = [...new Set(Object.values(out).flat().map(x => x.id))];
    const imgs = await imagesFor(ids);
    let withImg = 0;
    for (const list of Object.values(out)) for (const x of list) {
      if (imgs[x.id]) { x.image = imgs[x.id]; withImg++; }
    }
    console.log(withImg + " of " + ids.length + " sites have a Wikidata image.");
  }
  for (const list of Object.values(out)) for (const x of list) delete x.id;  // the id isn't needed in the game
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n", "utf8");
  const n = Object.values(out).reduce((a, v) => a + v.length, 0);
  console.log(sites.length + " sites read, " + towns.length + " towns checked, " + n + " sites attached to " + Object.keys(out).length + " towns.");
}

main().catch(e => { console.error(e.message); process.exit(1); });
