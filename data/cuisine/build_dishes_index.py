#!/usr/bin/env python3
"""Build the browser index of local dishes from the cuisine source and town-area mapping."""
import ast
import csv
import json
from pathlib import Path
from urllib.parse import urlencode

HERE = Path(__file__).resolve().parent
TOWNS_FILE = HERE / "towns_areas.csv"
SOURCE_FILE = HERE / "worldcuisines.csv"
OUTPUT_FILE = HERE / "index.json"
IMAGE_FIELDS = [("Image1 name / URL", "Image1 License")]


def parse_list(value, field, line_number):
    try:
        result = ast.literal_eval(value or "[]")
    except (SyntaxError, ValueError) as error:
        raise ValueError(f"Invalid {field} list on CSV line {line_number}") from error
    if not isinstance(result, list):
        raise ValueError(f"Expected a list in {field} on CSV line {line_number}")
    return result


def main():
    town_areas = {}
    with TOWNS_FILE.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            area = (row.get("area") or "").strip()
            if row.get("town_id") and area:
                town_areas[row["town_id"]] = area.casefold()

    areas = {}
    seen = {}
    with SOURCE_FILE.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        for line_number, row in enumerate(reader, start=2):
            name = (row.get("Name") or "").strip()
            if not name:
                continue
            image_url, license_name = next(
                (
                    (row.get(url_field, "").strip(), row.get(license_field, "").strip())
                    for url_field, license_field in IMAGE_FIELDS
                    if row.get(url_field, "").strip().startswith("https://")
                ),
                ("", ""),
            )
            if not image_url:
                continue

            item = {
                "name": name,
                "description": (row.get("Text Description") or "").strip(),
                "imageUrl": image_url,
                "license": license_name,
                "url": "https://en.wikipedia.org/w/index.php?" + urlencode({"search": name}),
            }
            for value in parse_list(row.get("Area"), "Area", line_number):
                area = str(value).strip().casefold()
                if area not in town_areas.values():
                    continue
                area_seen = seen.setdefault(area, set())
                if name.casefold() in area_seen:
                    continue
                area_seen.add(name.casefold())
                areas.setdefault(area, []).append(item)

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="\n") as output:
        json.dump({"townAreas": town_areas, "areas": areas}, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")

    print(f"Indexed {sum(map(len, areas.values()))} dishes across {len(areas)} areas for {len(town_areas)} towns.")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
