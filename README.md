# Roam Across the World

A solo travel RPG: travel from place to place, manage your time and money, discover new sights, and keep a journal of your journey. Choose services as you go, balancing timetables, terminals, fares and overnight stays.

## Files
- `index.html` loads everything (MapLibre is loaded from the jsDelivr CDN by `map.js` when first needed)
- `game.js` game logic and the journey overlay layers (places, your route, ferries) on the shared map
- `map.js` the shared MapLibre map (one instance for the whole game; strips basemap labels except road names; streets, satellite and hybrid modes)
- `lastmile.js` the last-mile challenge (loads MapLibre only when you reach the destination)
- `town.js` towns: the market, the things to do grid (music, sport, folklore, nature, paintings, Heritage, link-outs), the rest page
- `timeline.js` the City Timeline (still uses a live Groq call, see below)
- `tours.js`, `itineraries.js`, `berths.js`, `prefs.js`, `achievements.js` tours, classic itineraries, cruises, settings, and the countries page
- `rules.html` the player-facing rules; keep it in step with the game's numbers
- `config.js` map sources for the last mile: vector style and satellite tiles (set a keyed satellite provider here before a public launch)
- `data.js` places and hand-set crossings (edit these to add towns or ferries)
- `styles.css` styling, light and dark

## Run locally
Browsers block `fetch` from `file://`, so use a tiny server:
`python3 -m http.server` then open http://localhost:8000

## Host on GitHub Pages
1. Put these files in a repo (keep the `data/` folder).
2. Settings, Pages, deploy from the `main` branch root.
3. Open `https://<you>.github.io/<repo>/`

## Data files (in `data/`)
These are built ahead of time by the scripts in `tools/`, so the game never calls an AI service for them.
- `data/intros.json`: a short introduction for each town. Built by `tools/gen-intros.mjs`. Complete for all 619 towns.
- `data/market.json`: the market catalogue. For each town, a pool of 5 to 10 goods and a demand profile. Built by `tools/gen-market.mjs`. The game picks 3 to 5 items from the pool each day.
- `data/paintings.js`: painting viewpoints, from `painting_locations.csv`. Hand-checked for the near matches.
- `data/unesco.json`: UNESCO World Heritage sites near each town, with Wikidata photos. Built by `tools/gen-unesco.mjs` from the UNESCO CSV export.
- `data/tasteatlas-overrides.js` and `data/atlasobscura-overrides.js`: hand-set link addresses. A value of `false` hides that tile for the town.
- `data/countries.js`, `data/regions/*.js`, `data.js`: places, crossings and country lists.

## Generators and scheduled runs
Each generator reads `GROQ_API_KEY` from the environment. Run it from the project root, for example `GROQ_API_KEY=... node tools/gen-market.mjs --batch 5`. Each run only fills towns with no entry, and never overwrites existing text. `--dry-run` lists what it would do without calling the API.
- The intros are complete. The scheduled workflow `.github/workflows/gen-intros.yml` has been removed (or disabled). The script is kept for regenerating later.
- The market workflow `.github/workflows/gen-market.yml`, if present, is separate and can be removed or disabled in the same way.
- Re-run a generator with the prompt version bumped when you change its prompt, so entries from an older prompt can be found.

## Groq and the outside services
- The market and destination intros no longer call Groq. The game reads the data files above.
- The City Timeline still calls Groq, through the `groq-proxy` Cloudflare Worker, for its ten events (`tlAskModel` in `timeline.js`). That's the last live AI call, and it's the next thing to move to a generated file.
- The old market lookup (`mkAsk`, `mkVisitPrompt`, `mkApply`) and the destination lookup were removed from the code.
- Map tiles, Wikipedia photos and Open-Meteo weather are still fetched by the game.

## Adding places
In `data.js`, each place is `id|Name|lat|lon|country|flags`. Flags: `r` rail, `a` airport, `p` port, `h` high-speed rail, `l` landmark, and a digit 1 to 3 for size. Country codes also drive prices and landmasses (see `IDX` and `G()` in `game.js`). Ferries and other special links go in `CROSSINGS` as `from to mode hours cost`.

## Last-mile challenge
When you reach the destination, a landmark photo from Wikipedia appears and you pin where it was taken. The photo is a notable sight within 10 km of the destination city.
Distance off becomes time lost (4.5 km/h) and is added to your arrival time. If the photo or map cannot load, a "Skip the last mile" button lets you finish with no penalty.

## Starting a journey
Each journey starts at a hub drawn by weight from `START_HUBS` in `config.js` (London only by default). Each leg goes to a random city in the distance band for the region it starts from, set in `DISTANCE_BANDS` in `config.js`; regions not listed use the `default` band of 1,000 to 2,000 km. Later legs start where the last one ended, so the campaign moves on from there. Cities are places of size 2 or 3 plus the `EXTRA_CITIES` list in `data.js`.

## Planning phase
Before leaving, you see the destination's name and tap where you think it is on the unlabelled map. Error converts to time at `PLAN_KM_PER_H` (150 km per hour, capped at `PLAN_MAX_H` = 8 h), which delays your departure.

## Choosing how to travel
Before setting off, a short overview introduces the kinds of connections available between your start and destination. The overview is a built-in sentence, with no AI call. Then choose individual services as you travel; fares and timetables are shown at each stop. Destination introductions come from `data/intros.json`. Towns not yet written there fall back to a live call through the Groq proxy (`FLAVOUR_URL` in `game.js`), and that text is labelled "AI generated".
