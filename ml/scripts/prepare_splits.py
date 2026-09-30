"""Turn data/raw/<class>/*.jpg into train/validation/test lists.

Exact and near-exact duplicates are dropped first (an average-hash of each
picture), because the same photo landing in both train and test would inflate
the score. Real phone photos for the final test go in data/test_phone/<class>/
and are never part of these lists.

    python scripts/prepare_splits.py --tier pilot
    python scripts/prepare_splits.py --classes menemen baklava --min-images 20
"""

from __future__ import annotations

import argparse
import json
import random

from PIL import Image

from common import RAW_DIR, SPLITS_FILE, image_files, select_classes


def average_hash(path) -> int | None:
    try:
        with Image.open(path) as image:
            small = image.convert("L").resize((8, 8), Image.Resampling.LANCZOS)
            pixels = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    except OSError:
        return None
    mean = sum(pixels) / len(pixels)
    return sum(1 << index for index, value in enumerate(pixels) if value >= mean)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--classes", nargs="*")
    parser.add_argument("--tier", choices=["pilot", "core"])
    parser.add_argument("--min-images", type=int, default=12, help="classes with fewer usable images are left out")
    parser.add_argument("--val", type=float, default=0.15)
    parser.add_argument("--test", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--allow-unreviewed", action="store_true", help="only for experiments: accept classes nobody has reviewed")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    kept_classes, look_alike = [], {}
    splits: dict[str, list] = {"train": [], "val": [], "test": []}
    report = []

    for entry in select_classes(args.classes, args.tier):
        if not args.allow_unreviewed and not (RAW_DIR / entry["id"] / "_reviewed").exists():
            report.append((entry["id"], len(image_files(RAW_DIR / entry["id"])), "left out (not reviewed: scripts/contact_sheet.py, scripts/review.py)"))
            continue
        seen: set[int] = set()
        usable = []
        for path in image_files(RAW_DIR / entry["id"]):
            digest = average_hash(path)
            if digest is None or digest in seen:
                continue
            seen.add(digest)
            usable.append(path)

        if len(usable) < args.min_images:
            report.append((entry["id"], len(usable), "left out (too few images)"))
            continue

        rng.shuffle(usable)
        n_test = max(1, round(len(usable) * args.test))
        n_val = max(1, round(len(usable) * args.val))
        index = len(kept_classes)
        kept_classes.append(entry["id"])
        look_alike[entry["id"]] = entry.get("look_alike") or entry["id"]
        for split, files in (
            ("test", usable[:n_test]),
            ("val", usable[n_test : n_test + n_val]),
            ("train", usable[n_test + n_val :]),
        ):
            splits[split] += [[str(p.relative_to(RAW_DIR)).replace("\\", "/"), index] for p in files]
        report.append((entry["id"], len(usable), f"train {len(usable) - n_test - n_val}, val {n_val}, test {n_test}"))

    if not kept_classes:
        raise SystemExit("No class has enough images. Collect data first (scripts/collect_commons.py).")

    SPLITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SPLITS_FILE.write_text(
        json.dumps({"classes": kept_classes, "look_alike": look_alike, **splits}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    for class_id, count, note in report:
        print(f"{class_id:<24} {count:>4} images  {note}")
    print(f"\n{len(kept_classes)} classes -> {SPLITS_FILE}")
    print({name: len(items) for name, items in splits.items()})


if __name__ == "__main__":
    main()
