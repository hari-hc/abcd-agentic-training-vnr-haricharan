import pandas as pd
from sklearn.linear_model import LinearRegression
import pickle

# Sample dataset
data = {
    "Area": [1000, 1500, 2000, 2500, 3000],
    "Bedrooms": [2, 3, 3, 4, 4],
    "Price": [300000, 450000, 500000, 650000, 700000]
}

df = pd.DataFrame(data)

X = df[["Area", "Bedrooms"]]
y = df["Price"]

model = LinearRegression()
model.fit(X, y)

# Save model
pickle.dump(model, open("model.pkl", "wb"))

print("Model trained and saved successfully!")
