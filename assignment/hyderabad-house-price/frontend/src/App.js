import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Prediction from "./pages/Prediction";
import Navbar from "./components/Navbar";
import { logout } from "./api";

// Protected route — redirect to home if not authenticated
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername || "");
    }
  }, []);

  const handleLogin = (uname) => {
    setIsAuthenticated(true);
    setUsername(uname);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUsername("");
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar
          isAuthenticated={isAuthenticated}
          username={username}
          onLogout={handleLogout}
        />
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/predict" replace />
              ) : (
                <Home onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/predict"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Prediction />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
