# Hyderabad House Price Prediction

A full-stack machine learning web application that predicts residential property prices across Hyderabad. Users can sign up, log in, input property details, and receive an instant price estimate with budget comparison.

---

## Features

- **Secure authentication** — JWT-based signup and login
- **ML-powered predictions** — Gradient Boosting model trained on 3,600+ Hyderabad listings
- **Budget comparison** — Instant feedback on whether the property fits your budget
- **88 locations** — Coverage across all major Hyderabad areas
- **Strict data contract** — Canonical normalization prevents category mismatch between training and prediction
- **Production-quality structure** — Modular frontend, FastAPI backend, and isolated ML pipeline

---

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18, React Router v6, Axios, Tailwind CSS, Lucide React |
| Backend    | FastAPI, Uvicorn, Python-JOSE (JWT), Passlib (bcrypt) |
| ML         | scikit-learn (Gradient Boosting, Random Forest, Linear Regression), pandas, joblib |

---

## Project Structure

```
hyderabad-house-price/
├── ml/
│   ├── train.py                  # Training pipeline
│   ├── Hyderbad_House_price.csv  # Raw dataset
│   └── artifacts/
│       ├── model.pkl             # Trained model
│       └── locations.pkl         # Known location list
├── backend/
│   ├── main.py                   # FastAPI application
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── api.js
    │   ├── index.js
    │   ├── index.css
    │   ├── components/
    │   │   └── Navbar.js
    │   └── pages/
    │       ├── Home.js
    │       └── Prediction.js
    ├── tailwind.config.js
    └── package.json
```

---

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

---

### 1. Clone the repository

```bash
git clone <repo-url>
cd hyderabad-house-price
```

---

### 2. Train the ML model

```bash
cd ml
pip install pandas scikit-learn joblib
python train.py
```

This will print model evaluation results and save artifacts to `ml/artifacts/`.

---

### 3. Run the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment         #windows:copy .env.example .env
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 4. Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

The app will open at `http://localhost:3000`.

---

## API Endpoints

| Method | Endpoint    | Auth Required | Description                |
|--------|-------------|---------------|----------------------------|
| POST   | `/signup`   | No            | Create a new account       |
| POST   | `/login`    | No            | Sign in, receive JWT token |
| POST   | `/predict`  | Yes (Bearer)  | Predict house price        |
| GET    | `/locations`| No            | List all known locations   |

### Predict request body

```json
{
  "location": "gachibowli",
  "building_status": "ready_to_move",
  "bhk": 3,
  "area_insqft": 1500,
  "budget": 90
}
```

### Predict response

```json
{
  "predicted_price": 87.45,
  "budget": 90.0,
  "budget_status": "within_budget",
  "location": "gachibowli",
  "bhk": 3,
  "area_insqft": 1500,
  "building_status": "ready_to_move"
}
```

`budget_status` values: `within_budget`, `above_budget`, `below_expected`

---

## ML Pipeline Explanation

### Data Preprocessing

1. **Drop** `Unnamed: 0` column
2. **Extract BHK** — parse numeric value from `title` using regex
3. **Normalize** — `location` and `building_status` lowercased and underscored
4. **Map statuses** — `New` → `under_construction`, `Resale` → `ready_to_move`
5. **Rare location grouping** — locations with fewer than 10 listings become `other`
6. **Feature engineering** — `area_per_bhk = area_insqft / bhk`
7. **Outlier removal** — prices above 99th percentile dropped

### Feature Set

- `location` (one-hot encoded, unknown → zeros)
- `building_status` (one-hot encoded)
- `bhk` (integer)
- `area_insqft` (numeric, scaled)
- `rate_persqft` (numeric, scaled)
- `area_per_bhk` (engineered, scaled)

### Models Evaluated

| Model              | R²     | RMSE      |
|--------------------|--------|-----------|
| Linear Regression  | 0.8582 | 43.91 L   |
| Random Forest      | 0.9911 | 10.98 L   |
| Gradient Boosting  | 0.9942 | 8.86 L    |

**Selected:** Gradient Boosting (best R² and lowest RMSE)

The trained model and preprocessor are saved as a single `sklearn.Pipeline` object, guaranteeing identical transformation at training and inference time.

---

## Security Notes

- Passwords are hashed with bcrypt via Passlib
- JWTs expire after 24 hours
- The user store is in-memory by default — replace with a proper database (PostgreSQL, SQLite) for production
- Always set a strong `JWT_SECRET` in your `.env` file

---

## License

MIT
