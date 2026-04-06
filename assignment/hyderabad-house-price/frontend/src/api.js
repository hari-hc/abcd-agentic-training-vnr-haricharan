import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — clear token and redirect to home
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────
export const signup = (username, password) =>
  api.post("/signup", { username, password });

export const login = async (username, password) => {
  const res = await api.post("/login", { username, password });
  const { access_token } = res.data;
  localStorage.setItem("token", access_token);
  localStorage.setItem("username", username);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
};

// ─── Prediction ─────────────────────────────
export const predict = (payload) => api.post("/predict", payload);

// ─── Locations ──────────────────────────────
export const getLocations = () => api.get("/locations");

export default api;
