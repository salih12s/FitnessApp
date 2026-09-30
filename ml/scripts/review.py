"""Record a person's review of a class's photos.

Look at the contact sheets (scripts/contact_sheet.py), write down the numbers of
the bad tiles on the pages you looked at, then run this once. Photos on the
reviewed pages that you did not reject are approved. Rejected photos move to
`_rejected/`; photos on pages you did not look at move to `_unreviewed/` so they
can never reach training by accident. prepare_splits.py only accepts classes
that have been reviewed.

    python scripts/review.py yaprak-sarma --pages 1 --reject 2 3 4 10
    python scripts/review.py baklava --pages 3 --reject 5 17 21
    python scripts/review.py menemen --reject-all          # no usable photos at all

Numbers refer to the file order when the sheets were made, so note the numbers
from every page first and run this a single time.
"""

from __future__ import annotations

import argparse
import shutil

from common import RAW_DIR, image_files

PER_PAGE = 30  # must match contact_sheet.py (6 columns x 5 rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("class_id")
    parser.add_argument("--pages", type=int, default=1, help="how many contact-sheet pages you looked at")
    parser.add_argument("--reject", type=int, nargs="*", default=[], help="tile numbers to reject")
    parser.add_argument("--reject-all", action="store_true")
    args = parser.parse_args()

    folder = RAW_DIR / args.class_id
    files = image_files(folder)
    if not files:
        raise SystemExit(f"No images in {folder}.")

    reviewed = files[: args.pages * PER_PAGE]
    if args.reject_all:
        rejected = set(range(1, len(reviewed) + 1))
    else:
        rejected = set(args.reject)
        outside = sorted(n for n in rejected if not 1 <= n <= len(reviewed))
        if outside:
            raise SystemExit(f"Tile numbers outside the {len(reviewed)} reviewed photos: {outside}")

    for directory in ("_rejected", "_unreviewed"):
        (folder / directory).mkdir(exist_ok=True)
    approved = 0
    for number, path in enumerate(files, start=1):
        if number > len(reviewed):
            shutil.move(path, folder / "_unreviewed" / path.name)
        elif number in rejected:
            shutil.move(path, folder / "_rejected" / path.name)
        else:
            approved += 1

    (folder / "_reviewed").write_text(f"{approved} approved, {len(rejected)} rejected\n", encoding="utf-8")
    print(f"{args.class_id}: {approved} approved, {len(rejected)} rejected, {len(files) - len(reviewed)} left unreviewed")


if __name__ == "__main__":
    main()
