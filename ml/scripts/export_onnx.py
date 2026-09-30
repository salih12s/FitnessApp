"""Export a trained run to ONNX for the browser and check it matches PyTorch.

    python scripts/export_onnx.py --name pilot-v1
    python scripts/export_onnx.py --name pilot-v1 --quantize

The exported graph takes a float32 image tensor (1x3x224x224, RGB, values in
0-1) and returns class logits; the normalization is inside the model, so the
web app only has to resize, crop, and scale to 0-1. labels.json (class ids in
output order) is written next to it.
"""

from __future__ import annotations

import argparse
import json
import shutil

import numpy as np
import onnxruntime as ort
import timm
import torch
from PIL import Image
from torch import nn

from common import RAW_DIR, RUNS_DIR, SPLITS_FILE


class WithNormalization(nn.Module):
    def __init__(self, model: nn.Module, mean, std) -> None:
        super().__init__()
        self.model = model
        self.register_buffer("mean", torch.tensor(mean).view(1, 3, 1, 1))
        self.register_buffer("std", torch.tensor(std).view(1, 3, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model((x - self.mean) / self.std)


def preprocess(path, size: int) -> np.ndarray:
    """Resize the short side to 1.14x the input size, center-crop, scale to 0-1 (what the web app must do too)."""
    with Image.open(path) as image:
        image = image.convert("RGB")
        width, height = image.size
        scale = int(size * 1.14) / min(width, height)
        image = image.resize((round(width * scale), round(height * scale)), Image.Resampling.BILINEAR)
        width, height = image.size
        left, top = (width - size) // 2, (height - size) // 2
        image = image.crop((left, top, left + size, top + size))
    return np.asarray(image, dtype=np.float32).transpose(2, 0, 1) / 255.0


def compare_on_test_photos(full, quantized, size: int) -> None:
    """Accuracy of both models on the held-out photos: random input says nothing about a compressed model."""
    if not SPLITS_FILE.exists():
        print("No data/splits.json: run prepare_splits.py to compare the compressed model on real photos.")
        return
    test = json.loads(SPLITS_FILE.read_text(encoding="utf-8"))["test"]
    images = np.stack([preprocess(RAW_DIR / relative, size) for relative, _ in test])
    labels = np.array([label for _, label in test])
    results = {}
    for name, path in (("fp32", full), ("int8", quantized)):
        session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        results[name] = session.run(None, {"image": images})[0].argmax(1)
        print(f"  {name} top-1 on {len(labels)} test photos: {(results[name] == labels).mean():.2f}")
    print(f"  int8 gives the same answer as fp32 on {(results['fp32'] == results['int8']).mean():.0%} of them")
    if (results["int8"] == labels).mean() < (results["fp32"] == labels).mean() - 0.02:
        print("  WARNING: the 8-bit model is less accurate. Do not ship it; use static quantization with calibration or a smaller model.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True)
    parser.add_argument("--quantize", action="store_true", help="also write an 8-bit weights version")
    args = parser.parse_args()

    run_dir = RUNS_DIR / args.name
    config = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    labels = json.loads((run_dir / "labels.json").read_text(encoding="utf-8"))

    backbone = timm.create_model(config["model"], pretrained=False, num_classes=len(labels))
    backbone.load_state_dict(torch.load(run_dir / "best.pt", map_location="cpu"))
    model = WithNormalization(backbone, config["mean"], config["std"]).eval()

    size = config["size"]
    example = torch.rand(1, 3, size, size)
    target = run_dir / "model.onnx"
    export_args = dict(
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    try:
        torch.onnx.export(model, example, str(target), dynamo=False, **export_args)
    except TypeError:  # older PyTorch without the `dynamo` argument
        torch.onnx.export(model, example, str(target), **export_args)

    # The exported model must give the same answers as the PyTorch one.
    batch = torch.rand(4, 3, size, size)
    with torch.no_grad():
        expected = model(batch).numpy()
    session = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"])
    actual = session.run(None, {"image": batch.numpy()})[0]
    difference = float(np.abs(expected - actual).max())
    same_top = bool((expected.argmax(1) == actual.argmax(1)).all())
    print(f"model.onnx  {target.stat().st_size / 1e6:.1f} MB | max logit difference vs PyTorch {difference:.2e} | same top-1: {same_top}")
    if difference > 1e-3 or not same_top:
        raise SystemExit("The ONNX model does not match PyTorch; do not ship it.")

    if args.quantize:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        quantized = run_dir / "model.int8.onnx"
        quantize_dynamic(str(target), str(quantized), weight_type=QuantType.QUInt8)
        print(f"model.int8.onnx  {quantized.stat().st_size / 1e6:.1f} MB (8-bit weights)")
        compare_on_test_photos(target, quantized, size)

    shutil.copyfile(run_dir / "labels.json", run_dir / "labels.export.json")


if __name__ == "__main__":
    main()
