# Food model training workspace

Training code for the Turkish food recognition model. The plan, data rules,
and quality gates are in [docs/food-model.md](../docs/food-model.md); this file
only says how to run things on Windows.

Nothing here is part of the app build. Only `runs/<name>/model.onnx` and
`labels.json` are ever used by the web app.

## Layout

```text
ml/
├── classes.yaml        the dishes: ids, Turkish names, meals, tiers, look-alike groups
├── requirements.txt
├── scripts/            collect_commons, prepare_splits, train, evaluate, export_onnx, verify_env
├── data/               ignored by Git
│   ├── raw/<class>/    training photos (+ _meta.jsonl with license and author)
│   ├── test_phone/<class>/   real phone photos, never trained on
│   └── splits.json
└── runs/<name>/        ignored by Git: weights, metrics, exported model
```

## Setup (once)

RTX 50-series GPUs need the CUDA 12.8 build of PyTorch, so it is installed
first from PyTorch's own index. Run from the repository root:

```powershell
python -m venv ml\.venv
ml\.venv\Scripts\python -m pip install --upgrade pip
ml\.venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
ml\.venv\Scripts\pip install -r ml\requirements.txt
ml\.venv\Scripts\python ml\scripts\verify_env.py
```

`verify_env.py` must end with "training step on the GPU works".

## Typical run

```powershell
cd ml
.venv\Scripts\python scripts\collect_commons.py --tier pilot --subcats   # freely licensed seed photos
.venv\Scripts\python scripts\prepare_splits.py --tier pilot
.venv\Scripts\python scripts\train.py --name pilot-v1 --epochs 15
.venv\Scripts\python scripts\evaluate.py --name pilot-v1
.venv\Scripts\python scripts\evaluate.py --name pilot-v1 --phone          # after adding data\test_phone\
.venv\Scripts\python scripts\export_onnx.py --name pilot-v1 --quantize
```

Only photos you took yourself or that carry a license allowing reuse belong in
`data/raw/`. `collect_commons.py` keeps public domain, CC0, CC BY, and CC BY-SA
files and records author and source for attribution.

## Reviewing photos (required)

A category or folder name is not a label. Before a class can be trained, a
person looks at its photos:

```powershell
cd ml
.venv\Scripts\python scripts\contact_sheet.py yaprak-sarma            # data\review\yaprak-sarma-1.jpg, 30 photos per page
.venv\Scripts\python scripts\review.py yaprak-sarma --pages 1 --reject 2 3 4 10
```

Write down the tile numbers to reject from every page first, then run
`review.py` once. Rejected photos move to `_rejected/`, photos on pages you did
not look at move to `_unreviewed/`, and `prepare_splits.py` skips any class
without a review.

## Notes

- Set `HF_HUB_DISABLE_SYMLINKS_WARNING=1` to silence the Windows symlink
  warning when the pretrained weights are downloaded.
- The first `train.py` run downloads the pretrained weights (about 20 MB) from
  the Hugging Face hub.
- Do not ship an 8-bit model until `export_onnx.py --quantize` shows it holds
  its accuracy on real photos.
