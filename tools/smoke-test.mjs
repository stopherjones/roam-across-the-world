// Plays the main loop in a headless browser (jsdom) and reports any failures or runtime errors.
// Run from the project folder, after `npm i --no-save jsdom`:
//   node tools/smoke-test.mjs
// Exits with code 1 if anything fails.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let JSDOM;
try { ({ JSDOM } = await import("jsdom")); }
catch { console.error("jsdom is not installed. Run: npm i --no-save jsdom"); process.exit(1); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errs = [];
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? "PASS " : "FAIL ") + name); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// A stand-in for the Groq proxy: returns a stock list and a buyer for each item asked about
const reply = { character: "busy port town", weights: { luxury: 2, useful: 4, cultural: 3, food: 4 },
  items: [{ name: "Sea salt", craft: "Salt pans", origin_note: "Coastal pans", value: 4, supply: 8, kind: "food" },
          { name: "Rope", craft: "Ropemaker", origin_note: "Hemp", value: 3, supply: 9, kind: "useful" }], buyers: [] };

const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "file://" + root + "/index.html",
  beforeParse(w) {
    w.onerror = e => errs.push(String(e).slice(0, 160));
    w.matchMedia = q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.fetch = (url, opts) => {
      if (!opts) {
        if (String(url).indexOf("data/cuisine/food-specialties.json") >= 0) {
          const data = JSON.parse(fs.readFileSync(path.join(root, "data/cuisine/food-specialties.json"), "utf8"));
          return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); // static files such as data/intros.json
      }
      const p = JSON.parse(opts.body).messages[0].content;
      const r = JSON.parse(JSON.stringify(reply));
      const m = p.match(/Items: (\[.*\])\n?/);
      if (m) JSON.parse(m[1]).forEach(it => r.buyers.push({ ref: it.ref, name: "Buyer " + it.name, type: "dealer", line: "Keen.", demand: 6, savvy: 3 }));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(r) } }] }) });
    };
  }
});
const w = dom.window, D = w.document;

setTimeout(async () => {
  ok("town functions are globals", typeof w.restPage === "function" && typeof w.waitHtml === "function");
  ok("start screen", D.getElementById("app").textContent.toLowerCase().includes("start journey"));

  w.beginTo("lon", "rom"); await wait(4000);
  ok("journey plan renders", !!D.querySelector(".mapdock"));

  w.S.phase = "move"; w.S.ev = true; w.S.loc = w.S.start; w.roll = () => 7;
  w.hop(0, w.S.h); await wait(2500);
  const card = D.querySelector(".evcard button");
  if (card) card.click();          // the question and outcome card, shown half way along the route
  await wait(1500);
  ok("hop completes", !w.MJ.anim && !D.querySelector(".evlayer"));

  w.S.loc = w.S.goal; w.S.arrH = w.S.h; w.S.lmOn = false; w.S.phase = "arrive"; w.render();
  ok("arrival card renders", !!D.querySelector(".arrive"));
  const savedAchievements = w.S.camp.ach;
  w.S.camp.ach = { pinpoint: { at: "Day 1" } };
  const achievementCards = w.achHtml();
  ok("achievements render as locked and unlocked cards",
    achievementCards.includes("achievement-card unlocked") && achievementCards.includes("achievement-card locked"));
  w.S.camp.ach = savedAchievements;
  await w.FOOD_SPECIALTIES_READY;
  const savedLocation = w.S.loc;
  const savedTokyo = w.N.tyo;
  if (!w.N.tyo) w.N.tyo = { n: "Tokyo" };
  const hasLocalDishes = id => { w.S.loc = id; return w.thingsHtml().includes("tile-local-dishes"); };
  ok("Local dishes tile only appears for cities with specialties",
    hasLocalDishes("lon") && hasLocalDishes("tyo") && !hasLocalDishes(savedLocation));
  w.S.loc = savedLocation;
  if (!savedTokyo) delete w.N.tyo;
  ok("Local dishes data is matched to its city and country",
    w.foodSpecialtiesFor("lon", w.FOOD_SPECIALTIES).some(d => d.name === "Jellied eels"));

  const observation = (id, taxonId, name) => ({
    id, taxon: { id: taxonId, name: "Species " + taxonId, preferred_common_name: name,
      default_photo: { medium_url: "https://example.com/" + id + ".jpg", attribution: "Photographer" } },
    photos: [{ medium_url: "https://example.com/" + id + ".jpg" }]
  });
  const natureFetch = w.fetch;
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [
    observation(101, 1, "Eurasian Jay"), observation(102, 1, "Eurasian Jay"),
    observation(103, 2, "Egyptian Goose")
  ] }) });
  const localSightings = await w.natureLoad("lon");
  ok("Nature results list each species once per town", localSightings.length === 2);
  const duplicateJay = w.natureSightingRecord(observation(104, 1, "Eurasian Jay"), "lon");
  const jayElsewhere = w.natureSightingRecord(observation(105, 1, "Eurasian Jay"), "par");
  w.S.camp.sightings = [localSightings[0], duplicateJay];
  w.recordNatureSightings([localSightings[1], jayElsewhere]);
  ok("sightings log deduplicates per town but keeps sightings from other towns",
    w.S.camp.sightings.length === 3 && w.S.camp.sightings.filter(s => s.taxonId === "1").length === 2);
  w.fetch = natureFetch;
  const londonStay = w.S.camp.stays.find(stay => stay.cityId === "lon");
  const originalActiveStayId = w.S.camp.activeStayId;
  const originalFavoritePaintings = londonStay && londonStay.favoritePaintings;
  const originalVisitedHeritage = londonStay && londonStay.visitedHeritage;
  const originalLondonPaintings = w.PAINTINGS.lon;
  const originalLondonHeritage = w.UNESCO_MAP.lon;
  if (londonStay) {
    w.S.camp.activeStayId = londonStay.id;
    w.PAINTINGS.lon = [
      { title: "Test painting one", artist: "Artist A", url: "https://example.com/painting-one",
        image: "https://example.com/painting-one.jpg", image_source: "https://example.com/source" },
      { title: "Test painting two", artist: "Artist B", url: "https://example.com/painting-two" },
      { title: "Unselected painting", artist: "Artist C", url: "https://example.com/painting-three" }
    ];
    w.UNESCO_MAP.lon = [
      { name: "Test heritage site one", year: "2001", category: "Cultural", url: "https://example.com/site-one" },
      { name: "Test heritage site two", year: "2002", category: "Natural", url: "https://example.com/site-two" },
      { name: "Unselected heritage site", year: "2003", category: "Cultural", url: "https://example.com/site-three" }
    ];
    w.paintingsOpen("lon");
    const paintingChecks = D.querySelectorAll("#paint-modal input[name='saved-collection']");
    if (paintingChecks[0]) paintingChecks[0].checked = true;
    if (paintingChecks[1]) paintingChecks[1].checked = true;
    w.saveCityCollection("paintings", "lon", londonStay.id);
    ok("multiple paintings can be saved as favourites from results",
      paintingChecks.length === 3 && londonStay.favoritePaintings.length === 2);
    w.unescoOpen("lon");
    const heritageChecks = D.querySelectorAll("#paint-modal input[name='saved-collection']");
    if (heritageChecks[0]) heritageChecks[0].checked = true;
    if (heritageChecks[1]) heritageChecks[1].checked = true;
    w.saveCityCollection("heritage", "lon", londonStay.id);
    const savedCollections = w.journalPanelHtml();
    const savedStayHtml = w.cityStayContentHtml(londonStay, w.FOOD_SPECIALTIES, null);
    ok("multiple UNESCO sites can be saved and displayed in both journals",
      heritageChecks.length === 3 && londonStay.visitedHeritage.length === 2 &&
      savedCollections.includes("Test painting one") && savedCollections.includes("Test heritage site one") &&
      !savedCollections.includes("Unselected painting") && !savedCollections.includes("Unselected heritage site") &&
      savedStayHtml.includes("Favourite paintings") && savedStayHtml.includes("UNESCO sites visited") &&
      savedStayHtml.includes("Test painting one") && savedStayHtml.includes("Test heritage site one"));
    londonStay.favoritePaintings = originalFavoritePaintings;
    londonStay.visitedHeritage = originalVisitedHeritage;
    w.S.camp.activeStayId = originalActiveStayId;
    if (originalLondonPaintings === undefined) delete w.PAINTINGS.lon; else w.PAINTINGS.lon = originalLondonPaintings;
    if (originalLondonHeritage === undefined) delete w.UNESCO_MAP.lon; else w.UNESCO_MAP.lon = originalLondonHeritage;
    w.save();
  }
  const savedJournalStays = w.S.camp.stays;
  w.S.camp.stays = [{ id: "smoke-dish-stay", cityId: "lon", at: "Day 1, 08:00",
    eatenDish: { name: "Jellied eels", description: "A London dish.", url: "https://example.com/eels",
      thumbnail: { url: "https://example.com/eels.jpg" } } }];
  const journalHtml = w.journalPanelHtml();
  ok("Dishes eaten lists saved choices between journey and sightings",
    journalHtml.indexOf("Your journey") < journalHtml.indexOf("Dishes eaten (1)") &&
    journalHtml.indexOf("Dishes eaten (1)") < journalHtml.indexOf("Sightings (") &&
    journalHtml.includes("Jellied eels") && !journalHtml.includes("Pie and mash") &&
    journalHtml.includes("sighting-grid"));
  w.S.camp.stays = savedJournalStays;
  const originalMeal = londonStay && londonStay.eatenDish;
  const originalStays = w.S.camp.stays.slice();
  w.S.camp.stays.push({ id: "smoke-liverpool-stay", cityId: "liv", at: "Day 2", eatenDish: null });
  w.openCountryStays("United Kingdom");
  ok("country journal offers a city choice when multiple cities were visited",
    D.querySelectorAll("#paint-modal .city-journal-choice").length === 2);
  w.S.camp.stays = originalStays;
  w.openCountryStays("United Kingdom"); await wait(50);
  const dishRadio = D.querySelector("#paint-modal input[name='stay-dish'][value='0']");
  ok("city stay journal shows automatic nature records and dish choices",
    !!dishRadio && D.querySelector("#paint-modal .stay-saved-note").textContent.includes("saved here automatically") &&
    !!D.querySelector("#paint-modal .stay-dish-option.sighting-card") &&
    !!D.querySelector("#paint-modal .stay-nature-list .sighting-card"));
  if (dishRadio && londonStay) {
    dishRadio.checked = true;
    w.saveStayDish(londonStay.id);
    ok("one local dish can be saved as eaten for a stay",
      !!londonStay.eatenDish && londonStay.eatenDish.name === "Jellied eels");
    londonStay.eatenDish = originalMeal;
    w.save();
  }
  w.paintingsClose();

  w.S.phase = "rest"; w.S.camp.marketOpen = false; w.render();
  ok("rest page renders with things to do", D.querySelectorAll(".tiles a.btn").length >= 5 && [...D.querySelectorAll(".tiles a.btn")].some(a => a.textContent.includes("Atlas Obscura")) && [...D.querySelectorAll("button")].some(b => b.textContent === "City Timeline"));

  w.restVisit(); await wait(300);
  ok("market opens on rest day", !!D.querySelector(".mgrid"));
  w.restBuyAt(0); ok("buy works", w.S.camp.pack.length === 1);
  w.restVisit(); await wait(300);
  ok("buyer found for pack item", !!w.S.camp.pack[0].buyer);
  w.restSell(w.S.camp.pack[0].uid); ok("sell works", w.S.camp.pack.length === 0);

  w.S.phase = "move"; w.S.loc = w.S.start; w.S.ev = false;
  const realSched = w.sched; w.sched = (o, f, t) => ({ dep: t + 4, night: 0, ns: 0, nn: 1 });
  w.go(0); ok("wait screen renders", w.S.phase === "wait" && /Waiting for/.test(D.getElementById("app").textContent));
  w.sched = realSched;
  w.cancelWait(); ok("cancel returns to options", w.S.phase === "move");

  w.S.interimUsed = 1; w.S.cash = 0; w.render();
  ok("stranded ends the leg as a rest day", w.S.phase === "rest" && w.S.stranded === 1);
  ok("stranded page renders", /Stranded in/.test(D.getElementById("app").textContent));

  // Berths: a sailing heard of at a port appears as a route option, leaves at a fixed time, and is paid for at boarding
  w.S.phase = "move"; w.S.cash = 1000; w.S.loc = "por"; w.S.ev = false;
  w.S.camp.heard = { "por-mia-cargo": w.absH(w.S.h) };
  w.S.camp.agentOpen = true;
  await w.loadRegion("usa"); w.rebuildWorld();   // as opening the travel agent does
  const berthOpt = w.opts(1).find(o => o.berth === "por-mia-cargo");
  ok("heard sailing is a route option at its port", !!berthOpt && berthOpt.m === "ferry" && berthOpt.c === 340);
  if (berthOpt) {
    const before = w.S.cash, idx = w.opts().findIndex(o => o.berth === "por-mia-cargo");
    w.hop(idx, w.S.h);
    ok("berth pays the fare and arrives at Miami", w.S.cash === before - 340 && w.S.loc === "mia");
  }
  // Ordinary routes never use a berth
  ok("plan avoids berth lanes", (w.plan(0, 1e9, { from: "lon", to: "par" }) || []).every(s => !w.E[s.j].berth));
  // Test picker: a chosen starting money is used exactly
  await w.beginTo("lon", "par", 600); await wait(1500);
  ok("test journey starts with the chosen money", !!w.S && w.S.cash === 600);
  // Arriving at Dakar hears of the Cape Verde cruise, and loads Cape Verde so it can be listed
  w.S.loc = "dak"; w.S.camp.heard = {}; w.render(); await wait(1500);
  ok("cruise heard on arrival at Dakar", w.S.camp.heard["dak-pia-cruise"] != null && !!w.LOADED_REGIONS["atlantic-islands"]);
  // Test picker search: the id is read from the bracketed part of the chosen suggestion
  ok("test picker reads the place id", w.testIdOf("Valencia [val]") === "val" && w.testIdOf("Valencia") === null && w.testIdOf("Naples [nap]  ") === "nap");
  // A designated port is always an agent town, even if the loaded links do not show it
  ok("Dakar always has a travel agent", w.berthAgentIn([], "dak") === true);
  // A cruise returns to its start as a rest day, with no checkpoint
  w.S.phase = "rest"; w.S.loc = "pia"; w.S.camp.cruise = { back: "dak", at: "pia", queue: [{ to: "dak", h: 60 }] }; w.render();
  w.cruiseContinue(); await wait(4000);
  ok("cruise returns to its start on the arrival card", w.S.loc === "dak" && w.S.phase === "arrive" && w.S.berthArrival === true && !w.S.camp.cruise);
  w.arriveContinue();
  ok("arrival card continues to a rest day, with no checkpoint", w.S.phase === "rest" && w.S.loc === "dak");
  // Multi-stop cruise: boards to the first stop and carries the rest of the route, out and back
  w.S.phase = "move"; w.S.loc = "lis"; w.S.cash = 5000; w.S.camp.heard = { "lis-pia-cruise": w.absH(w.S.h) };
  const lisCruise = w.opts(1).find(o => o.berth === "lis-pia-cruise");
  ok("Lisbon cruise boards to its first stop", !!lisCruise && lisCruise.to === "pdl" && lisCruise.h === 40);
  ok("Lisbon cruise carries the rest of its route, then returns straight to Lisbon", !!lisCruise && lisCruise.queue.map(q => q.to).join(",") === "fnc,pia,lis");
  // Honolulu is a stop on the Pacific cargo, in both directions
  await w.loadRegion("japan"); await w.loadRegion("hawaii"); w.rebuildWorld();
  w.S.phase = "move"; w.S.loc = "yok"; w.S.cash = 5000; w.S.camp.cruise = null; w.S.camp.heard = { "tyo-lax-cargo": w.absH(w.S.h) };
  const outHnl = w.opts(1).find(o => o.berth === "tyo-lax-cargo");
  ok("Yokohama to Los Angeles cargo stops at Honolulu first", !!outHnl && outHnl.to === "hnl" && outHnl.queue.map(q => q.to).join(",") === "lax");
  w.S.loc = "lax"; w.S.camp.heard = { "tyo-lax-cargo-return": w.absH(w.S.h) };
  const backHnl = w.opts(1).find(o => o.berth === "tyo-lax-cargo-return");
  ok("Los Angeles to Yokohama cargo stops at Honolulu first", !!backHnl && backHnl.to === "hnl" && backHnl.queue.map(q => q.to).join(",") === "yok");
  // Shortlist: three places in reach that the campaign has not visited, and the choice is kept for the next leg
  w.S.loc = "lon"; w.S.camp.visited = ["lon"]; w.S.camp.shortlist = undefined; w.S.bonus = 1;
  const list = w.shortlistFor("lon");
  ok("shortlist offers up to three unvisited places", list.length <= 3 && list.every(i => i !== "lon" && w.S.camp.visited.indexOf(i) < 0));
  w.chooseDest(list[0] || "par"); ok("chosen destination is kept for the next leg", w.S.camp.chosen === (list[0] || "par"));
  w.S.bonus = 0;
  // Shortlist cards show the country: each place has one
  ok("places know their country", w.PLACE_COUNTRY.par === "France" && w.PLACE_COUNTRY.syd === "Australia" && w.PLACE_COUNTRY.osl === "Norway");
  console.log("runtime errors: " + (errs.length ? errs.join(" | ") : "none"));
  if (errs.length) failed++;
  console.log(failed ? "\nSMOKE TEST FAILED" : "\nSmoke test passed");
  process.exit(failed ? 1 : 0);
}, 4000);
