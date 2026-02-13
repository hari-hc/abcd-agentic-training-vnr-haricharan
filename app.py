from flask import Flask, render_template, request
import pickle

app = Flask(__name__)

# Load trained model
model = pickle.load(open("model.pkl", "rb"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    area = float(request.form["area"])
    bedrooms = float(request.form["bedrooms"])

    prediction = model.predict([[area, bedrooms]])

    return render_template(
        "index.html",
        prediction_text=f"Estimated House Price: ₹ {prediction[0]:,.2f}"
    )

if __name__ == "__main__":
    app.run(debug=True)
