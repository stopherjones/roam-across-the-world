#!/usr/bin/env python3
"""Map RAtW towns to dish-dataset areas (regions) using Nominatim bounding boxes.

1. Geocode each distinct area name (with its country) via Nominatim, caching results.
2. For each town, choose the smallest-bounding-box area that contains it,
   preferring areas whose country matches. If none contains it, use the nearest
   area centre within MAX_KM.

Run from the ratw folder:
    python3 map_towns_to_areas.py /path/to/worldcuisines_csv.txt towns_areas.csv
Cache: area_geocache.json (re-runs only geocode new names).
Nominatim usage policy: max 1 request/second, identify the app in User-Agent.
Results derived from OpenStreetMap need OSM attribution if you publish them.
"""
import ast
import csv
import glob
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

UA = "ratw-area-mapper/0.1 (personal project; replace with your contact)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
CACHE = "area_geocache.json"
MAX_KM = 150
SKIP_AREAS = {"Global"}


def load_towns():
    countries = {}
    with open("tools/cities.json", encoding="utf-8") as f:
        for c in json.load(f):
            countries[c["id"]] = c["country"]
    towns = []
    for path in glob.glob("data/regions/*.js"):
        if path.endswith("index.js"):
            continue
        src = open(path, encoding="utf-8").read()
        m = re.search(r'var REGION_\w+="((?:[^"\\]|\\.)*)";', src, re.S)
        if not m:
            continue
        for row in m.group(1).split(";"):
            if not row:
                continue
            p = row.split("|")
            towns.append({
                "id": p[0], "name": p[1],
                "lat": float(p[2]), "lon": float(p[3]),
                "country": countries.get(p[0], ""),
            })
    return towns


def load_areas(csv_path):
    counts = {}
    with open(csv_path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            areas = ast.literal_eval(r["Area"] or "[]")
            countries = ast.literal_eval(r["Countries"] or "[]")
            country = str(countries[0]) if countries else ""
            for a in areas:
                a = str(a)
                if a in SKIP_AREAS:
                    continue
                key = (a, country)
                counts[key] = counts.get(key, 0) + 1
    return counts


def geocode(area, country, cache):
    key = f"{area}|{country}"
    if key in cache:
        return cache[key]
    q = area if country.lower() in area.lower() else f"{area}, {country}"
    url = NOMINATIM + "?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "limit": 1})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except Exception as e:
        print(f"  error {key}: {e} (not cached, will retry next run)")
        time.sleep(5)
        return None
    time.sleep(1.1)  # stay under Nominatim's 1 req/s limit
    if data:
        d = data[0]
        s, n, w, e = (float(x) for x in d["boundingbox"])
        res = {"lat": float(d["lat"]), "lon": float(d["lon"]),
               "bbox": [s, n, w, e], "display": d.get("display_name", "")}
    else:
        res = None
    cache[key] = res
    return res


def km(lat1, lon1, lat2, lon2):
    r = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def box_area(b):
    s, n, w, e = b
    return (n - s) * (e - w)


def inside(lat, lon, b):
    s, n, w, e = b
    return s <= lat <= n and w <= lon <= e


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    csv_path, out_path = sys.argv[1], sys.argv[2]

    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    towns = load_towns()
    counts = load_areas(csv_path)
    print(f"towns: {len(towns)}  distinct areas: {len(counts)}")

    areas = []
    for (name, country), dishes in counts.items():
        g = geocode(name, country, cache)
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        if g:
            areas.append({"name": name, "country": country, "dishes": dishes, **g})
    print(f"geocoded: {len(areas)} of {len(counts)}")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["town_id", "town", "country", "area", "area_country",
                    "method", "dishes_in_area", "area_display"])
        method_counts = {}
        for t in towns:
            containing = [a for a in areas if inside(t["lat"], t["lon"], a["bbox"])]
            if containing:
                same_country = [a for a in containing
                                if a["country"].lower() == t["country"].lower()]
                pool = same_country or containing
                best = min(pool, key=lambda a: box_area(a["bbox"]))
                method = "contains"
            else:
                near = [(km(t["lat"], t["lon"], a["lat"], a["lon"]), a) for a in areas]
                near = [(d, a) for d, a in near if d <= MAX_KM]
                if not near:
                    method = "none"
                    best = None
                else:
                    d, best = min(near, key=lambda x: x[0])
                    method = f"nearest_{int(d)}km"
            method_counts[method.split("_")[0]] = method_counts.get(method.split("_")[0], 0) + 1
            if best:
                w.writerow([t["id"], t["name"], t["country"], best["name"],
                            best["country"], method, best["dishes"],
                            best["display"]])
            else:
                w.writerow([t["id"], t["name"], t["country"], "", "", method, 0, ""])

    print("towns by method:", method_counts)
    print("written:", out_path)


if __name__ == "__main__":
    main()