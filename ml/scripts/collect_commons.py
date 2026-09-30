"""Download freely licensed dish photos from Wikimedia Commons.

Only files under a license that allows reuse (public domain, CC0, CC BY,
CC BY-SA) are kept, and the author, license and source page of every file are
written next to it so attribution can be produced later. Commons is a small
seed for most Turkish dishes; see docs/food-model.md for the rest of the data plan.

    python scripts/collect_commons.py --tier pilot
    python scripts/collect_commons.py --classes menemen baklava --limit 80 --subcats
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import requests

from common import RAW_DIR, select_classes

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "FitnessAppResearch/0.1 (https://fitnessapp.salihsydm.com; salihsaydam0@gmail.com)"}
THUMB_WIDTH = 640
MIN_SIDE = 300
PAUSE = 0.35  # seconds between requests, to stay polite to Wikimedia

session = requests.Session()
session.headers.update(HEADERS)


def license_allowed(short_name: str | None) -> bool:
    """True for public domain, CC0, CC BY and CC BY-SA; false for NC, ND and unknown."""
    name = (short_name or "").lower().strip()
    if name.startswith(("cc0", "public domain", "pd")):
        return True
    return bool(re.match(r"^cc[ -]by(-sa)?[ -]\d", name))


def api_get(params: dict) -> dict:
    response = session.get(API, params={**params, "format": "json"}, timeout=30)
    response.raise_for_status()
    time.sleep(PAUSE)
    return response.json()


def category_members(category: str, member_type: str) -> list[str]:
    titles: list[str] = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{category}",
        "cmtype": member_type,
        "cmlimit": "500",
    }
    while True:
        data = api_get(params)
        titles += [m["title"] for m in data["query"]["categorymembers"]]
        if "continue" not in data:
            return titles
        params["cmcontinue"] = data["continue"]["cmcontinue"]


def file_titles(categories: list[str], include_subcategories: bool) -> list[str]:
    titles: list[str] = []
    for category in categories:
        titles += category_members(category, "file")
        if include_subcategories:
            for sub in category_members(category, "subcat"):
                titles += category_members(sub.removeprefix("Category:"), "file")
    return list(dict.fromkeys(titles))


def image_info(titles: list[str]) -> list[dict]:
    """Size, type, license and thumbnail URL for up to 50 files."""
    data = api_get(
        {
            "action": "query",
            "titles": "|".join(titles),
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": THUMB_WIDTH,
        }
    )
    results = []
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [None])[0]
        if info:
            results.append({"title": page["title"], **info})
    return results


def plain(html: str | None) -> str:
    return re.sub(r"<[^>]+>", "", html or "").strip()[:200]


def safe_name(title: str) -> str:
    stem = re.sub(r"[^\w.-]+", "_", title.removeprefix("File:"), flags=re.UNICODE)
    return re.sub(r"\.[A-Za-z]+$", "", stem)[:80] + ".jpg"


def collect_class(entry: dict, limit: int, include_subcategories: bool) -> tuple[int, int]:
    folder = RAW_DIR / entry["id"]
    folder.mkdir(parents=True, exist_ok=True)
    meta_path = folder / "_meta.jsonl"
    have = {json.loads(line)["title"] for line in meta_path.read_text(encoding="utf-8").splitlines()} if meta_path.exists() else set()

    kept = skipped = 0
    titles = [t for t in file_titles(entry["commons"], include_subcategories) if t not in have]
    for start in range(0, len(titles), 50):
        for info in image_info(titles[start : start + 50]):
            if len(have) + kept >= limit:
                return kept, skipped
            meta = info.get("extmetadata", {})
            license_name = meta.get("LicenseShortName", {}).get("value")
            small = min(info.get("width", 0), info.get("height", 0)) < MIN_SIDE
            if info.get("mime") not in ("image/jpeg", "image/png") or small or not license_allowed(license_name):
                skipped += 1
                continue
            url = info.get("thumburl") or info["url"]
            target = folder / safe_name(info["title"])
            try:
                response = session.get(url, timeout=60)
                response.raise_for_status()
            except requests.RequestException:
                skipped += 1
                continue
            time.sleep(PAUSE)
            target.write_bytes(response.content)
            with meta_path.open("a", encoding="utf-8") as file:
                file.write(
                    json.dumps(
                        {
                            "title": info["title"],
                            "file": target.name,
                            "license": license_name,
                            "author": plain(meta.get("Artist", {}).get("value")),
                            "source": info.get("descriptionurl"),
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
            kept += 1
    return kept, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--classes", nargs="*", help="class ids to collect")
    parser.add_argument("--tier", choices=["pilot", "core"], help="collect a whole tier")
    parser.add_argument("--limit", type=int, default=120, help="stop a class at this many images (default 120)")
    parser.add_argument("--subcats", action="store_true", help="also read one level of subcategories")
    args = parser.parse_args()

    selected = [c for c in select_classes(args.classes, args.tier) if c.get("commons")]
    if not selected:
        raise SystemExit("None of the selected classes has a `commons` category in classes.yaml.")

    for entry in selected:
        kept, skipped = collect_class(entry, args.limit, args.subcats)
        total = len(list((RAW_DIR / entry["id"]).glob("*.jpg")))
        print(f"{entry['id']:<22} +{kept:<4} kept, {skipped:<4} skipped (license/size/type) -> {total} total")


if __name__ == "__main__":
    main()
