# Lumpy Skin Disease Detection

An educational student project with a green-themed website and a Flask API for a TensorFlow/Keras image-classification model.

## Model classes

The training notebook defines this output order:

1. `healthy`
2. `lumpy`
3. `foot-and-mouth`

The Flask app displays friendly labels for these three classes. This is an experimental screening aid, not a veterinary diagnosis. Model predictions may be wrong; consult a qualified veterinarian about animal health concerns.

## Project structure

```text
LumpySkinDisease/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## Add the trained model

The trained model file is named `best_stage2.keras`. It is intentionally excluded from this public repository by `.gitignore`. Keep the file in a secure model-storage location or place it beside `app.py` on a private development machine/server. Do not commit large model files or private training data to this public repository.

By default, the app expects `best_stage2.keras` beside `app.py`. To use another location, set the `MODEL_PATH` environment variable to the full path of the model file.

## Run locally

Use Python 3.10 or 3.11 in a virtual environment where supported.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Put `best_stage2.keras` beside `app.py`, then visit http://127.0.0.1:5000. Check http://127.0.0.1:5000/health to see whether the model loaded.

## Deployment notes

GitHub stores the source code but does not run Flask or TensorFlow. Deploy the Python app to a Python-capable hosting service and configure secure model storage there. The model must be available to the deployed process at `MODEL_PATH`. Do not use GitHub Pages alone for the prediction endpoint.

## Image preprocessing

Images are converted to RGB, resized to 224×224, and passed as float32 pixel values. This matches the 0–255 input convention documented for the EfficientNet training pipeline. Confirm this preprocessing against the exact saved model before relying on predictions.

## Animal records

The demo animal register uses browser localStorage. Records stay in the current browser and are not sent to a database or shared across devices.
