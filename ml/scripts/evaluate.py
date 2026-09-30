"""Score a trained run on held-out images and report where it goes wrong.

    python scripts/evaluate.py --name pilot-v1
    python scripts/evaluate.py --name pilot-v1 --phone     # real phone photos in data/test_phone/

Besides top-1 and top-3, it reports accuracy at the level of look-alike groups
(mixing up two kinds of pide costs little; mixing up pide and baklava costs a
lot), the weakest classes, the most common confusions, and calibration
(whether "80% sure" is right about 80% of the time).
"""

from __future__ import annotations

import argparse
import json
from collections import Counter

import timm
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from common import PHONE_TEST_DIR, RAW_DIR, RUNS_DIR, SPLITS_FILE, image_files


class Files(Dataset):
    def __init__(self, items: list[tuple[str, int]], transform) -> None:
        self.items, self.transform = items, transform

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, index: int):
        path, label = self.items[index]
        with Image.open(path) as image:
            return self.transform(image.convert("RGB")), label


def expected_calibration_error(confidences: torch.Tensor, correct: torch.Tensor, bins: int = 10) -> float:
    edges = torch.linspace(0, 1, bins + 1)
    error = 0.0
    for low, high in zip(edges[:-1], edges[1:]):
        mask = (confidences > low) & (confidences <= high)
        if mask.any():
            error += mask.float().mean().item() * abs(correct[mask].float().mean().item() - confidences[mask].mean().item())
    return error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True)
    parser.add_argument("--phone", action="store_true", help="use data/test_phone/ instead of the test split")
    args = parser.parse_args()

    run_dir = RUNS_DIR / args.name
    config = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    classes = json.loads((run_dir / "labels.json").read_text(encoding="utf-8"))
    splits = json.loads(SPLITS_FILE.read_text(encoding="utf-8"))
    groups = splits["look_alike"]
    index_of = {name: i for i, name in enumerate(classes)}

    if args.phone:
        items = [(str(p), index_of[c]) for c in classes for p in image_files(PHONE_TEST_DIR / c)]
        source = "phone photos"
    else:
        items = [(str(RAW_DIR / rel), label) for rel, label in splits["test"]]
        source = "held-out test split"
    if not items:
        raise SystemExit("No images to evaluate. Put phone photos in data/test_phone/<class-id>/ first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = timm.create_model(config["model"], pretrained=False, num_classes=len(classes))
    model.load_state_dict(torch.load(run_dir / "best.pt", map_location="cpu"))
    model.to(device).eval()

    size = config["size"]
    tf = transforms.Compose(
        [
            transforms.Resize(int(size * 1.14)),
            transforms.CenterCrop(size),
            transforms.ToTensor(),
            transforms.Normalize(config["mean"], config["std"]),
        ]
    )
    loader = DataLoader(Files(items, tf), batch_size=32, num_workers=2)

    probabilities, labels = [], []
    with torch.no_grad():
        for images, y in loader:
            probabilities.append(torch.softmax(model(images.to(device)).float(), dim=1).cpu())
            labels.append(y)
    probabilities, labels = torch.cat(probabilities), torch.cat(labels)

    top = probabilities.topk(min(3, len(classes)), dim=1).indices
    confidence = probabilities.max(dim=1).values
    correct = top[:, 0] == labels
    top1 = correct.float().mean().item()
    top3 = (top == labels[:, None]).any(dim=1).float().mean().item()
    group_of = [groups[c] for c in classes]
    group_hits = sum(group_of[p] == group_of[t] for p, t in zip(top[:, 0].tolist(), labels.tolist()))
    group_top1 = group_hits / len(labels)

    per_class = {}
    for i, name in enumerate(classes):
        mask = labels == i
        if mask.any():
            per_class[name] = (correct[mask].float().mean().item(), int(mask.sum()))
    confusions = Counter(
        (classes[t], classes[p]) for t, p in zip(labels.tolist(), top[:, 0].tolist()) if t != p
    )
    ece = expected_calibration_error(confidence, correct)

    print(f"{source}: {len(labels)} images, {len(classes)} classes")
    print(f"top-1 {top1:.3f} | top-3 {top3:.3f} | look-alike group top-1 {group_top1:.3f} | calibration error {ece:.3f}")
    print("\nweakest classes (recall, images):")
    for name, (recall, count) in sorted(per_class.items(), key=lambda kv: kv[1][0])[:8]:
        print(f"  {name:<24} {recall:.2f}  ({count})")
    print("\nmost common mix-ups (true -> predicted):")
    for (true, predicted), count in confusions.most_common(8):
        print(f"  {true:<24} -> {predicted:<24} x{count}")

    (run_dir / ("metrics_phone.json" if args.phone else "metrics.json")).write_text(
        json.dumps(
            {"source": source, "images": len(labels), "top1": top1, "top3": top3, "group_top1": group_top1, "ece": ece,
             "per_class": {k: {"recall": v[0], "images": v[1]} for k, v in per_class.items()}},
            indent=1,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
