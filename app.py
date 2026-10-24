import os
from pathlib import Path

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

# In production, set FRONTEND_ORIGIN to your exact Vercel URL.
# For a quick demo, a wildcard is allowed, but use the exact origin in production.
frontend_origin = os.environ.get("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": frontend_origin}})

MODEL_PATH = Path(os.environ.get(
    "MODEL_PATH",
    Path(__file__).resolve().parent / "spamshield_model.joblib"
))
model = None
model_error = None

try:
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
    else:
        model_error = f"Model file not found: {MODEL_PATH}"
except Exception as exc:
    model_error = f"Could not load model: {exc}"


@app.get("/")
def home():
    return jsonify({
        "name": "SpamShield API",
        "status": "running",
        "model_loaded": model is not None
    })


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "message": model_error
    }), (200 if model is not None else 503)


@app.post("/api/predict")
def predict():
    if model is None:
        return jsonify({
            "error": "The trained model is not available on the server.",
            "details": model_error
        }), 503

    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if not isinstance(message, str):
        return jsonify({"error": "message must be a string"}), 400

    message = message.strip()
    if not message:
        return jsonify({"error": "Please enter a message."}), 400
    if len(message) > 5000:
        return jsonify({"error": "Message is too long. Maximum 5000 characters."}), 400

    prediction = str(model.predict([message])[0]).lower()
    result = "spam" if prediction == "spam" else "ham"

    spam_probability = None
    try:
        probabilities = model.predict_proba([message])[0]
        classes = list(model.named_steps["classifier"].classes_)
        if "spam" in classes:
            spam_probability = round(float(probabilities[classes.index("spam")]) * 100, 1)
    except Exception:
        # The label prediction still works if the pipeline does not expose probabilities.
        pass

    return jsonify({
        "label": result,
        "display_label": "Spam" if result == "spam" else "Not Spam",
        "spam_probability": spam_probability
    })


if __name__ == "__main__":
    # Local development only. Render uses Gunicorn.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
