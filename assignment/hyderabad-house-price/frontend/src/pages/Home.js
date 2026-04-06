import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, TrendingUp, Shield, Eye, EyeOff, AlertCircle } from "lucide-react";
import { login, signup } from "../api";

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-2.5 flex-shrink-0">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>
      <div>
        <h3 className="text-slate-100 font-medium text-sm mb-1">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function Home({ onLogin }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupForm, setSignupForm] = useState({ username: "", password: "", confirm: "" });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // ── Login ──────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.username.trim() || !loginForm.password) {
      setLoginError("Please enter your username and password.");
      return;
    }
    setLoginLoading(true);
    try {
      await login(loginForm.username.trim(), loginForm.password);
      onLogin(loginForm.username.trim());
      navigate("/predict");
    } catch (err) {
      setLoginError(
        err.response?.data?.detail || "Login failed. Please check your credentials."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Signup ─────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");
    const { username, password, confirm } = signupForm;
    if (!username.trim() || !password || !confirm) {
      setSignupError("All fields are required.");
      return;
    }
    if (username.trim().length < 3) {
      setSignupError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setSignupError("Passwords do not match.");
      return;
    }
    setSignupLoading(true);
    try {
      await signup(username.trim(), password);
      setSignupSuccess("Account created. You can now sign in.");
      setSignupForm({ username: "", password: "", confirm: "" });
      setTimeout(() => {
        setActiveTab("login");
        setSignupSuccess("");
        setLoginForm({ username: username.trim(), password: "" });
      }, 1800);
    } catch (err) {
      setSignupError(
        err.response?.data?.detail || "Signup failed. Please try again."
      );
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">
              ML-Powered Valuation
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Hyderabad House<br />
            <span className="text-blue-400">Price Prediction</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Estimate residential property values across Hyderabad using a machine
            learning model trained on current market data. Enter your requirements
            and receive an instant valuation with budget comparison.
          </p>
        </div>

        <div className="space-y-1">
          <FeatureCard
            icon={MapPin}
            title="88 Hyderabad Locations"
            description="Coverage across all major areas — from Gachibowli and Banjara Hills to Kompally and Uppal."
          />
          <FeatureCard
            icon={TrendingUp}
            title="High-Accuracy Predictions"
            description="Gradient Boosting model trained on 3,600+ real listings with comprehensive feature engineering."
          />
          <FeatureCard
            icon={Shield}
            title="Secure & Private"
            description="JWT-authenticated sessions. Your search data is never stored or shared."
          />
        </div>

        <p className="text-slate-600 text-xs">
          For informational purposes only. Not a substitute for professional property valuation.
        </p>
      </div>

      {/* ── Right panel (Auth) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile heading */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building2 className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">HydeProp</h1>
            </div>
            <p className="text-slate-500 text-sm">ML-powered property valuation for Hyderabad</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {["login", "signup"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setLoginError("");
                    setSignupError("");
                    setSignupSuccess("");
                  }}
                  className={`flex-1 py-4 text-sm font-medium tracking-wide transition-colors
                    ${activeTab === tab
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {tab === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div className="p-8">
              {/* ── Login Form ── */}
              {activeTab === "login" && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Welcome back</h2>
                    <p className="text-slate-500 text-sm">Sign in to access the prediction tool.</p>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-600 text-sm">{loginError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        placeholder="Enter username"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                                   text-slate-900 text-sm placeholder-slate-400
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                   outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          placeholder="Enter password"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                                     text-slate-900 text-sm placeholder-slate-400 pr-10
                                     focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                     outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                               text-white font-medium py-2.5 rounded-lg text-sm
                               transition-colors shadow-sm"
                  >
                    {loginLoading ? "Signing in..." : "Sign In"}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signup")}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create one
                    </button>
                  </p>
                </form>
              )}

              {/* ── Signup Form ── */}
              {activeTab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Create account</h2>
                    <p className="text-slate-500 text-sm">Get instant access to property predictions.</p>
                  </div>

                  {signupError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-600 text-sm">{signupError}</p>
                    </div>
                  )}
                  {signupSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                      <p className="text-green-700 text-sm font-medium">{signupSuccess}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={signupForm.username}
                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        placeholder="Choose a username"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                                   text-slate-900 text-sm placeholder-slate-400
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                   outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        placeholder="Min. 6 characters"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                                   text-slate-900 text-sm placeholder-slate-400
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                   outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={signupForm.confirm}
                        onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                                   text-slate-900 text-sm placeholder-slate-400
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                   outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                               text-white font-medium py-2.5 rounded-lg text-sm
                               transition-colors shadow-sm"
                  >
                    {signupLoading ? "Creating account..." : "Create Account"}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
