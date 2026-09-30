# Turkish food recognition model

Plan for training our own image model that recognizes the dishes people eat in
Turkey at breakfast, lunch, and dinner, and runs on the user's phone. It
complements the food catalog and the Claude photo analysis (see
[roadmap.md](roadmap.md), phase 7); it does not replace them.

The training code lives in [`ml/`](../ml/README.md). It is a separate Python
workspace, outside the npm workspaces, and nothing in it runs in production:
only the exported model file (`model.onnx` and `labels.json`) is shipped.

## Goal and scope

- Recognize about 150 to 200 dishes, chosen by how often they are eaten:
  breakfast, soups, meat and kebab dishes, dough dishes, rice and pasta,
  vegetable dishes, salads and meze, street food, desserts, fruit, and
  drinks. The full list, with tiers, is [`ml/classes.yaml`](../ml/classes.yaml).
- Answer with the three most likely dishes and how sure the model is. The user
  confirms one, adjusts the portion, and saves.
- Run in the browser (`onnxruntime-web`). The photo never leaves the device, it
  costs nothing per use, and it needs no API key.

What it deliberately does not do:

- **Portion size.** A classifier names a dish; it cannot weigh it. The app
  uses a typical serving for the dish and lets the user scale it.
- **Several dishes on one plate.** The model gives one answer per photo. The
  Claude photo analysis stays available for plates with several items.
- **Unknown food.** Below a confidence threshold the model says "not sure"
  instead of guessing, and the user searches or types instead.

## Classes

`ml/classes.yaml` has 212 entries in three tiers:

| Tier       | Classes | Purpose                                                                               |
| ---------- | ------- | ------------------------------------------------------------------------------------- |
| `pilot`    | 40      | Very common dishes. Proves the whole pipeline end to end.                             |
| `core`     | 127     | The rest of the built-in set. Pilot plus core is 167, inside the promised 150 to 200. |
| `extended` | 45      | The long tail: regional dishes, rare desserts, single nuts. Custom catalog tier.      |

Classes follow how a dish looks. Dishes that are nearly identical in a photo
(lentil, ezogelin, and tomato soup; the kinds of pide; the kinds of dolma) share a
`look_alike` group. The model is scored both per class and per group, and the
app shows the top guesses so a mix-up inside a group costs the user one tap.

## Data

Data, not compute, is the bottleneck. A fine-tuned model needs on the order of
100 to 300 varied photos per dish; 150 dishes means 15,000 to 45,000 photos.

| Source                             | What we get                                       | Notes                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Our own photos                     | The best data: real plates, real phones, lighting | 30 or more per dish per person; several people, plates, and lighting conditions.                                                                          |
| Wikimedia Commons                  | A seed of freely licensed photos                  | Measured: most dishes have 10 to 50 files (Menemen 46, Lahmacun 11, Mantı none). Collected with `collect_commons.py`, license and author stored per file. |
| Public datasets                    | Extra photos for shared or Western dishes         | Food-101 images come from Foodspotting; use beyond research needs the owners' permission. Check every license before use.                                 |
| In-app contributions (later)       | Photos users choose to share, with their label    | Opt-in only. Strip EXIF and location, keep no faces, deletable with the account. Needs its own phase and a privacy notice.                                |
| Search engines and social networks | Not used                                          | Copyright and terms of service problems, and unsuitable for anything we may ship.                                                                         |

Rules that keep the numbers honest:

- **Real phone photos are the test.** `ml/data/test_phone/<class>/` holds
  photos that are never trained on. Scores on web images overstate how well the
  model works on a kitchen table.
- **Split by source, not by photo.** Photos of one dish from one session go in
  one split, and near-duplicates are removed first.
- **Every image is reviewed** once by a person: not food, wrong dish, watermark,
  collage. Bad labels cost more than missing images.

## Model

1. **Baseline.** Fine-tune a small pretrained network (MobileNetV3-Large or
   EfficientNet-Lite0, 224 px) with strong augmentation, label smoothing, and
   class-balanced sampling. Size target: 12 MB or less after export.
2. **Few photos per dish.** Small classes are the norm here, so we also test
   training only a classifier head on frozen features from a large pretrained
   model. That needs far fewer photos per dish and lets a new dish be added
   without retraining everything, which is what a custom catalog needs.
3. **Honest confidence.** Temperature scaling so "80% sure" is right about 80%
   of the time, and a threshold below which the app shows "not sure".

## Quality gates

| Gate     | Classes   | Must reach, on held-out real phone photos                                                         |
| -------- | --------- | ------------------------------------------------------------------------------------------------- |
| Pipeline | 8 to 10   | The scripts run end to end and the ONNX model matches PyTorch.                                    |
| Pilot    | About 40  | Top-3 at least 90%, top-1 at least 70%, look-alike group top-1 at least 80%.                      |
| Core     | About 150 | Top-3 at least 90%, no class below 60% recall.                                                    |
| Ship     | The above | Calibration error at most 0.08, model 12 MB or less, under 500 ms per photo on a mid-range phone. |

These numbers are targets to be revised once the first real results exist. A
gate that is missed means more data for the weak classes, not a lower bar.

## From dish to calories

A photo gives a dish; the app needs kcal and macros. For every class we keep a
standard recipe (ingredients in grams) and compute a per-serving value from the
USDA-based catalog already in the app, so each number can be traced. A typical
serving is stored with it, and the user scales it. Values are shown as
estimates, and a dietitian should review the recipes before they are called
reliable. Recipes vary, so the app never presents these as exact.

## Delivery in the app

- `model.onnx` (or the 8-bit version) and `labels.json` are versioned files
  served from the web app and cached by the PWA after the first use.
- The web app resizes the photo to 224 px, runs the model in the browser, and
  shows the top three dishes with the catalog values.
- The model file is not committed to Git: it is a build artifact, and the
  release process copies it into the web build.

## Product and pricing

Proposal, to be decided by the product owner:

| Tier           | Content                                                                                                      | Price                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Free           | The built-in dishes (about 150 to 200), recognized on the device                                             | Free                         |
| Photo analysis | Claude analysis of plates with several items and portion estimates (pay per use)                             | To be decided                |
| Custom catalog | Extra dishes for restaurants, dietitians, gyms, and companies: their menu, their branding, optionally an API | "İletişime geç" (contact us) |

The custom catalog is sold by conversation, not by a price list: each customer
needs their own photos, review, and support. The app needs only a contact page
for it (an email link or a small form); no payment integration is built now.

## Phases

| Step | Work                                                                                              | Depends on                   |
| ---- | ------------------------------------------------------------------------------------------------- | ---------------------------- |
| 0    | Environment and pipeline scripts, class list, plan (this document)                                | Done                         |
| 1    | Smoke run: collect Commons photos for a few dishes, train, evaluate, export, check the ONNX model | Done, see the findings below |
| 2    | Photo capture protocol and first collection round for the pilot classes                           | People and time              |
| 3    | Pilot model, evaluated on real phone photos; decide on the few-photo approach                     | Step 2                       |
| 4    | Web integration: "Modelle tanı" flow, top-3 with catalog values, confidence handling              | Step 3                       |
| 5    | Recipe-based nutrition for every class, dietitian review                                          | Step 3                       |
| 6    | Core classes (about 150): more collection rounds, gates, release                                  | Steps 3 to 5                 |
| 7    | Optional: in-app opt-in contributions and the custom catalog offer                                | Legal review                 |

## Findings from the smoke run

The first run (30 September 2026) went through every step on this machine
(RTX 5060, 8 GB): 7 dishes from Wikimedia Commons, 127 reviewed photos,
MobileNetV3-Large, 15 epochs in about 20 seconds. It proves the pipeline, not
the product: the test set has 20 photos, so a score of 85% top-1 and 100%
top-3 could easily be 60% or 95% on other photos.

What it showed:

1. **Reviewing is not optional.** All 100 photos in Commons' "Menemen" category
   are of the town of Menemen near Izmir (roads, a tunnel, flamingos), not the
   dish. Other categories held shop fronts, market stalls, people, packaging,
   and other dishes. `prepare_splits.py` therefore refuses any class that has
   not been reviewed (`contact_sheet.py`, then `review.py`).
2. **Usable data is far smaller than the file counts.** After review, 42
   Gözleme files became 10 usable ones, 99 Lokum files 12, and Türk kahvesi
   100 files 15 (only the first 30 of each class were reviewed). Commons is a
   supplement for a handful of dishes, not a source for 150 classes.
3. **Compressing the model naively breaks it.** The 8-bit dynamic quantization
   in ONNX Runtime cut the model from 16.8 MB to 4.4 MB but dropped top-1 from
   85% to 50% on the same photos. `export_onnx.py` now measures this on real
   photos and warns. The plan for the 12 MB budget is a smaller backbone or
   static quantization with calibration data, measured the same way.
4. **The exported model matches PyTorch.** The largest difference in the logits
   is about 1e-5, and the preprocessing (resize the short side to 256, crop
   224, scale to 0-1) gives the same answers in a plain NumPy pipeline, which
   is what the web app will do.
5. **Training is cheap.** About one second per epoch at this size. A full run
   with thousands of photos per pilot class is minutes to an hour, so the work
   is in the photos.

## Decisions needed

1. Who takes the photos, and how many people can contribute? This sets the
   calendar more than anything else.
2. Are the pilot classes right, or should the first release focus on a smaller
   set, for example breakfast only?
3. Is free use on-device with paid or contact-only extras the right split?
4. Which public datasets, if any, are acceptable given their licenses?
