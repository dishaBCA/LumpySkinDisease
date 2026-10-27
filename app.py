import os
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image, UnidentifiedImageError
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("MODEL_PATH", BASE_DIR / "best_stage2.keras"))
CLASSES = ["Healthy", "Lumpy Skin Disease", "Foot-and-Mouth Disease"]
IMAGE_SIZE = (224, 224)
MAX_IMAGE_BYTES = 8 * 1024 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES

model = None
model_error = None
try:
    if MODEL_PATH.exists():
        model = tf.keras.models.load_model(MODEL_PATH)
    else:
        model_error = f"Model file not found at {MODEL_PATH}. Add best_stage2.keras beside app.py or set MODEL_PATH."
except Exception as exc:
    model_error = f"Could not load the model: {exc}"
    app.logger.exception("Model loading failed")


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None, "model_error": model_error})


@app.post("/predict")
def predict():
    if model is None:
        return jsonify({"error": model_error or "The trained model is not loaded on the server."}), 503

    uploaded = request.files.get("image")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Please upload an image file."}), 400

    try:
        image = Image.open(uploaded.stream).convert("RGB")
        image = image.resize(IMAGE_SIZE)
        # The training notebook's EfficientNet input pipeline uses RGB pixels
        # in the 0-255 range; do not divide by 255 here.
        array = np.asarray(image, dtype=np.float32)
        batch = np.expand_dims(array, axis=0)
        scores = model.predict(batch, verbose=0)[0]
        if len(scores) != len(CLASSES):
            return jsonify({"error": f"Expected {len(CLASSES)} output classes, got {len(scores)}."}), 500
        index = int(np.argmax(scores))
        confidence = float(scores[index]) * 100.0
        return jsonify({
            "prediction": CLASSES[index],
            "confidence": round(confidence, 2),
            "class_scores": {CLASSES[i]: round(float(scores[i]) * 100.0, 2) for i in range(len(CLASSES))},
            "disclaimer": "Educational screening only; not a veterinary diagnosis."
        })
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "The uploaded file is not a readable image. Please choose a JPG or PNG image."}), 400
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "The image could not be analyzed. Check the model and server logs."}), 500


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Image is too large. Maximum allowed size is 8 MB."}), 413


if __name__ == "__main__":
    # Local development only. Use a production WSGI server when deploying.
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=False)