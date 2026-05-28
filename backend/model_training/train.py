import numpy as np
import pandas as pd
import pickle
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error
import os

np.random.seed(42)
n = 2000

data = {
    "sqft":        np.random.randint(600, 5000, n),
    "bedrooms":    np.random.randint(1, 7, n),
    "bathrooms":   np.random.randint(1, 5, n),
    "age_years":   np.random.randint(0, 80, n),
    "garage":      np.random.randint(0, 3, n),
    "neighborhood": np.random.randint(1, 5, n),
}

df = pd.DataFrame(data)
df["price"] = (
    df["sqft"] * 180
    + df["bedrooms"] * 12000
    + df["bathrooms"] * 18000
    - df["age_years"] * 900
    + df["garage"] * 22000
    + df["neighborhood"] * 35000
    + np.random.normal(0, 25000, n)
).clip(lower=80000)

X = df.drop("price", axis=1)
y = df["price"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=4, random_state=42))
])
pipeline.fit(X_train, y_train)

mae = mean_absolute_error(y_test, pipeline.predict(X_test))
print(f"MAE: ${mae:,.0f}")

# Save to app/ directory (relative to /app/model_training/ inside container)
save_path = os.path.join(os.path.dirname(__file__), "../app/model.pkl")
with open(save_path, "wb") as f:
    pickle.dump(pipeline, f)

print(f"Model saved to {os.path.abspath(save_path)}")