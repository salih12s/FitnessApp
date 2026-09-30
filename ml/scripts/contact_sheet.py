"""Make a picture grid of a class's photos so a person can review them quickly.

Every image must be looked at once before training: not food, the wrong dish,
watermarks, collages. Each tile shows a number; note the bad ones and move them
to a `_rejected` folder next to the class (they are ignored by prepare_splits).

    python scripts/contact_sheet.py menemen
    python scripts/contact_sheet.py menemen --page 2
"""

from __future__ import annotations

import argparse

from PIL import Image, ImageDraw

from common import DATA_DIR, RAW_DIR, image_files

TILE = 200
COLUMNS = 6
ROWS = 5


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("class_id")
    parser.add_argument("--page", type=int, default=1)
    args = parser.parse_args()

    files = image_files(RAW_DIR / args.class_id)
    per_page = COLUMNS * ROWS
    chunk = files[(args.page - 1) * per_page : args.page * per_page]
    if not chunk:
        raise SystemExit(f"No images on page {args.page} ({len(files)} in total).")

    sheet = Image.new("RGB", (COLUMNS * TILE, ROWS * TILE), "white")
    draw = ImageDraw.Draw(sheet)
    for position, path in enumerate(chunk):
        x, y = (position % COLUMNS) * TILE, (position // COLUMNS) * TILE
        with Image.open(path) as image:
            image = image.convert("RGB")
            image.thumbnail((TILE - 4, TILE - 4))
            sheet.paste(image, (x + 2, y + 2))
        number = (args.page - 1) * per_page + position + 1
        draw.rectangle((x + 2, y + 2, x + 34, y + 20), fill="black")
        draw.text((x + 6, y + 5), str(number), fill="white")

    output = DATA_DIR / "review" / f"{args.class_id}-{args.page}.jpg"
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=88)
    print(f"{output}  ({len(chunk)} of {len(files)} images; numbers follow the file order)")


if __name__ == "__main__":
    main()
