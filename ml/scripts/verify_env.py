"""Check that this machine can train: PyTorch, the GPU, and the ONNX tools.

    python scripts/verify_env.py
"""

from __future__ import annotations

import sys

import numpy as np
import onnx
import onnxruntime
import timm
import torch
import torchvision


def main() -> None:
    print(f"python {sys.version.split()[0]} | torch {torch.__version__} (CUDA {torch.version.cuda}) | torchvision {torchvision.__version__}")
    print(f"timm {timm.__version__} | onnx {onnx.__version__} | onnxruntime {onnxruntime.__version__} | numpy {np.__version__}")

    if not torch.cuda.is_available():
        print("\nNo CUDA GPU is visible: training would run on the CPU (slow).")
        print("RTX 50-series cards need the CUDA 12.8 build of PyTorch; see ml/README.md.")
        raise SystemExit(1)

    print(f"\nGPU: {torch.cuda.get_device_name(0)} | {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB | capability {torch.cuda.get_device_capability(0)}")

    model = timm.create_model("mobilenetv3_large_100", pretrained=False, num_classes=10).cuda()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    batch = torch.randn(32, 3, 224, 224, device="cuda")
    labels = torch.randint(0, 10, (32,), device="cuda")
    for _ in range(3):
        optimizer.zero_grad()
        with torch.autocast("cuda", dtype=torch.bfloat16):
            loss = torch.nn.functional.cross_entropy(model(batch).float(), labels)
        loss.backward()
        optimizer.step()
    torch.cuda.synchronize()
    print(f"training step on the GPU works (loss {loss.item():.3f}, peak memory {torch.cuda.max_memory_allocated() / 1e9:.2f} GB)")


if __name__ == "__main__":
    main()
