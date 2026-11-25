#!/usr/bin/env python3
"""Replace dish photos with Wikipedia lead images and refresh Commons attribution."""
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

INDEX_FILE = Path(__file__).resolve().parent / "index.json"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = (
    "RoamAcrossTheWorld/1.0 "
    "(https://github.com/stopherjones/roam-across-the-world; contact via repository)"
)
BATCH_SIZE = 50
REQUEST_DELAY = 0.15


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain_text(value):
    parser = PlainText()
    parser.feed(value or "")
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def request_json(endpoint, params):
    body = urlencode(params).encode("utf-8")
    request = Request(
        endpoint,
        data=body,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    for attempt in range(3):
        try:
            with urlopen(request, timeout=45) as response:
                data = json.load(response)
            if "error" in data:
                raise RuntimeError(f"Wikimedia API error: {data['error']}")
            return data
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 2:
                raise RuntimeError(f"Wikimedia request failed: {error}") from error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("Wikimedia request failed after retries")


def aliases_from(query):
    aliases = {}
    for field in ("normalized", "redirects"):
        for item in query.get(field, []):
            aliases[item["from"].casefold()] = item["to"]
    return aliases


def canonical_title(title, aliases):
    current = title
    seen = set()
    while current.casefold() in aliases and current.casefold() not in seen:
        seen.add(current.casefold())
        current = aliases[current.casefold()]
    return current


def batches(values):
    values = list(values)
    for start in range(0, len(values), BATCH_SIZE):
        yield values[start:start + BATCH_SIZE]


def wikipedia_pages(titles):
    found = {}
    groups = list(batches(titles))
    for number, group in enumerate(groups, start=1):
        print(f"Wikipedia pages: batch {number}/{len(groups)} ({len(group)} titles)")
        data = request_json(WIKIPEDIA_API, {
            "action": "query",
            "format": "json",
            "prop": "pageimages|info|pageprops",
            "inprop": "url",
            "piprop": "name|thumbnail",
            "pithumbsize": "800",
            "redirects": "1",
            "titles": "|".join(group),
        })
        query = data.get("query", {})
        aliases = aliases_from(query)
        pages = {
            page.get("title", "").casefold(): page
            for page in query.get("pages", {}).values()
        }
        for title in group:
            page = pages.get(canonical_title(title, aliases).casefold())
            if not page or "missing" in page or "disambiguation" in page.get("pageprops", {}):
                continue
            thumbnail = page.get("thumbnail", {}).get("source", "")
            photo = page.get("pageimage", "")
            found[title] = {
                "articleUrl": page.get("fullurl", ""),
                "imageUrl": thumbnail if thumbnail.startswith("https://") else "",
                "photoTitle": photo,
            }
        time.sleep(REQUEST_DELAY)
    return found


def commons_files(titles):
    found = {}
    groups = list(batches(titles))
    for number, group in enumerate(groups, start=1):
        print(f"Commons credits: batch {number}/{len(groups)} ({len(group)} files)")
        requested = ["File:" + title for title in group]
        data = request_json(COMMONS_API, {
            "action": "query",
            "format": "json",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "redirects": "1",
            "titles": "|".join(requested),
        })
        query = data.get("query", {})
        aliases = aliases_from(query)
        pages = {
            page.get("title", "").casefold(): page
            for page in query.get("pages", {}).values()
        }
        for title, requested_title in zip(group, requested):
            page = pages.get(canonical_title(requested_title, aliases).casefold())
            image_info = (page or {}).get("imageinfo", [])
            metadata = image_info[0].get("extmetadata", {}) if image_info else {}
            artist = metadata.get("Artist", {}).get("value", "")
            credit = metadata.get("Credit", {}).get("value", "")
            license_name = metadata.get("LicenseShortName", {}).get("value", "")
            license_url = metadata.get("LicenseUrl", {}).get("value", "")
            description_url = image_info[0].get("descriptionurl", "") if image_info else ""
            found[title] = {
                "photoCredit": plain_text(artist) or plain_text(credit),
                "license": plain_text(license_name),
                "licenseUrl": license_url if license_url.startswith("https://") else "",
                "photoUrl": description_url if description_url.startswith("https://") else "",
            }
        time.sleep(REQUEST_DELAY)
    return found


def main():
    with INDEX_FILE.open(encoding="utf-8") as source:
        index = json.load(source)
    dishes = {}
    for area_dishes in index.get("areas", {}).values():
        for dish in area_dishes:
            if dish.get("name"):
                dishes.setdefault(dish["name"], []).append(dish)
    names = list(dishes)

    articles = wikipedia_pages(names)
    photo_titles = sorted({
        article["photoTitle"]
        for article in articles.values()
        if article["photoTitle"]
    })
    credits = commons_files(photo_titles)

    updated = no_lead_photo = no_article = 0
    for name, matching_dishes in dishes.items():
        article = articles.get(name)
        if not article:
            no_article += 1
        elif article["imageUrl"]:
            updated += 1
        else:
            no_lead_photo += 1

        for dish in matching_dishes:
            if not article:
                dish["url"] = (
                    "https://en.wikipedia.org/w/index.php?"
                    + urlencode({"search": name})
                )
                dish["imageUrl"] = ""
                dish["photoCredit"] = ""
                dish["photoUrl"] = ""
                dish["license"] = ""
                dish["licenseUrl"] = ""
                continue

            if article["articleUrl"]:
                dish["url"] = article["articleUrl"]
            dish["imageUrl"] = article["imageUrl"]
            if article["photoTitle"]:
                dish.update(credits.get(article["photoTitle"], {}))
            else:
                dish["photoCredit"] = ""
                dish["photoUrl"] = ""
                dish["license"] = ""
                dish["licenseUrl"] = ""

    with INDEX_FILE.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(index, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")

    print(
        f"Updated {updated} lead photos; {no_lead_photo} matched pages had no lead photo; "
        f"{no_article} titles had no matching Wikipedia page."
    )
    print(f"Updated {INDEX_FILE}")


if __name__ == "__main__":
    main()
