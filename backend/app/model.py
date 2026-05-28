import pickle
import numpy as np
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

_model = None

def load_model():
    global _model
    with open(MODEL_PATH, "rb") as f:
        _model = pickle.load(f)
    print("Model loaded successfully.")

def predict(features: dict) -> float:
    if _model is None:
        raise RuntimeError("Model not loaded.")
    X = np.array([[
        features["sqft"],
        features["bedrooms"],
        features["bathrooms"],
        features["age_years"],
        features["garage"],
        features["neighborhood"],
    ]])
    return float(_model.predict(X)[0])