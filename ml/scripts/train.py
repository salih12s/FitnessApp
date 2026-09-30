"""Fine-tune a small pretrained image model on the prepared splits.

    python scripts/train.py --name pilot-v1 --epochs 15
    python scripts/train.py --name try-effnet --model efficientnet_lite0 --epochs 20

Everything a run needs later (weights, class order, preprocessing) is saved in
runs/<name>/, so evaluate.py and export_onnx.py only need the run name.
"""

from __future__ import annotations

import argparse
import json
import math
import time

import timm
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms

from common import RAW_DIR, RUNS_DIR, SPLITS_FILE

MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)


class FoodImages(Dataset):
    def __init__(self, items: list[list], transform) -> None:
        self.items = items
        self.transform = transform

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, index: int):
        relative, label = self.items[index]
        with Image.open(RAW_DIR / relative) as image:
            return self.transform(image.convert("RGB")), label


def make_transforms(size: int):
    train = transforms.Compose(
        [
            transforms.RandomResizedCrop(size, scale=(0.5, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.TrivialAugmentWide(),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    evaluate = transforms.Compose(
        [
            transforms.Resize(int(size * 1.14)),
            transforms.CenterCrop(size),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    return train, evaluate


@torch.no_grad()
def accuracy(model, loader, device) -> tuple[float, float]:
    model.eval()
    top1 = top3 = total = 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        with torch.autocast(device.type, dtype=torch.bfloat16, enabled=device.type == "cuda"):
            logits = model(images)
        top = logits.float().topk(min(3, logits.shape[1]), dim=1).indices
        top1 += (top[:, 0] == labels).sum().item()
        top3 += (top == labels[:, None]).any(dim=1).sum().item()
        total += labels.numel()
    return top1 / max(total, 1), top3 / max(total, 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True)
    parser.add_argument("--model", default="mobilenetv3_large_100", help="any timm model name")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--size", type=int, default=224)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    splits = json.loads(SPLITS_FILE.read_text(encoding="utf-8"))
    classes = splits["classes"]

    train_tf, eval_tf = make_transforms(args.size)
    train_set = FoodImages(splits["train"], train_tf)
    val_set = FoodImages(splits["val"], eval_tf)

    # Rare classes are drawn as often as common ones, so a class with 40 photos
    # is not drowned out by one with 400.
    counts = torch.bincount(torch.tensor([label for _, label in splits["train"]]), minlength=len(classes))
    weights = [1.0 / counts[label].item() for _, label in splits["train"]]
    sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)
    train_loader = DataLoader(train_set, batch_size=args.batch, sampler=sampler, num_workers=args.workers, drop_last=len(train_set) > args.batch, persistent_workers=args.workers > 0)
    val_loader = DataLoader(val_set, batch_size=args.batch, num_workers=args.workers, persistent_workers=args.workers > 0)

    model = timm.create_model(args.model, pretrained=True, num_classes=len(classes)).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.02)
    steps = args.epochs * max(len(train_loader), 1)
    warmup = max(len(train_loader), 1)
    schedule = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lambda step: (step + 1) / warmup if step < warmup else 0.5 * (1 + math.cos(math.pi * (step - warmup) / max(steps - warmup, 1))),
    )
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    run_dir = RUNS_DIR / args.name
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "labels.json").write_text(json.dumps(classes, ensure_ascii=False), encoding="utf-8")
    (run_dir / "config.json").write_text(
        json.dumps({"model": args.model, "size": args.size, "mean": MEAN, "std": STD, "classes": len(classes)}),
        encoding="utf-8",
    )
    print(f"{len(classes)} classes | train {len(train_set)} | val {len(val_set)} | {args.model} on {device}")

    best, history = -1.0, []
    for epoch in range(1, args.epochs + 1):
        model.train()
        started, loss_sum, batches = time.time(), 0.0, 0
        for images, labels in train_loader:
            images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device.type, dtype=torch.bfloat16, enabled=device.type == "cuda"):
                loss = criterion(model(images).float(), labels)
            loss.backward()
            optimizer.step()
            schedule.step()
            loss_sum += loss.item()
            batches += 1

        top1, top3 = accuracy(model, val_loader, device)
        history.append({"epoch": epoch, "loss": loss_sum / max(batches, 1), "val_top1": top1, "val_top3": top3})
        marker = ""
        if top1 > best:
            best = top1
            torch.save(model.state_dict(), run_dir / "best.pt")
            marker = "  <- best"
        print(f"epoch {epoch:>2}/{args.epochs}  loss {loss_sum / max(batches, 1):.3f}  val top1 {top1:.3f}  top3 {top3:.3f}  ({time.time() - started:.0f}s){marker}")

    (run_dir / "history.json").write_text(json.dumps(history, indent=1), encoding="utf-8")
    print(f"best val top1 {best:.3f} -> {run_dir / 'best.pt'}")


if __name__ == "__main__":
    main()
