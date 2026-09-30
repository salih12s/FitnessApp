"""Paths and helpers shared by the training scripts."""

from __future__ import annotations

from pathlib import Path

import yaml

ML_DIR = Path(__file__).resolve().parents[1]
CLASSES_FILE = ML_DIR / "classes.yaml"
DATA_DIR = ML_DIR / "data"
RAW_DIR = DATA_DIR / "raw"  # downloaded, license-checked images, one folder per class
PHONE_TEST_DIR = DATA_DIR / "test_phone"  # real phone photos, never used for training
SPLITS_FILE = DATA_DIR / "splits.json"
RUNS_DIR = ML_DIR / "runs"

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def load_classes() -> list[dict]:
    with CLASSES_FILE.open(encoding="utf-8") as file:
        return yaml.safe_load(file)["classes"]


def select_classes(ids: list[str] | None = None, tier: str | None = None) -> list[dict]:
    """Classes by id, or by tier: `pilot` is the pilot set, `core` adds the core set."""
    classes = load_classes()
    if ids:
        known = {c["id"]: c for c in classes}
        missing = [i for i in ids if i not in known]
        if missing:
            raise SystemExit(f"Unknown class ids: {', '.join(missing)}")
        return [known[i] for i in ids]
    if tier == "pilot":
        return [c for c in classes if c["tier"] == "pilot"]
    if tier == "core":
        return [c for c in classes if c["tier"] in ("pilot", "core")]
    return classes


def image_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
