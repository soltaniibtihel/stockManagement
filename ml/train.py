import pandas as pd
import pickle
from sklearn.ensemble import RandomForestRegressor
from preprocessing import load_and_clean_data, feature_engineering

# Load data
df = load_and_clean_data("data/stock_data.csv")

# Feature engineering
df = feature_engineering(df)

# Features / Target
X = df[['moving_avg', 'consumption']]
y = df['quantity']

# Model
model = RandomForestRegressor(n_estimators=100)

model.fit(X, y)

# Save model
with open("models/model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model trained and saved!")
