import React, { useState, useEffect } from "react";
import {
  MapPin, Home, Maximize2, Layers, Wallet,
  Calculator, CheckCircle, XCircle, TrendingDown,
  ChevronDown, AlertCircle, RefreshCw,
} from "lucide-react";
import { predict, getLocations } from "../api";

// ─── Canonical location labels ──────────────
const FALLBACK_LOCATIONS = [
  "gachibowli", "banjara_hills", "kukatpally", "manikonda", "miyapur",
  "madhapur", "kondapur", "hitech_city", "jubilee_hills", "begumpet",
  "ameerpet", "secunderabad", "uppal", "lb_nagar", "dilsukhnagar",
  "kompally", "bachupally", "nizampet", "shamshabad", "attapur",
];

function toLabel(slug) {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const BUILDING_STATUS_OPTIONS = [
  { value: "ready_to_move", label: "Ready to Move" },
  { value: "under_construction", label: "Under Construction" },
];

const BHK_OPTIONS = [1, 2, 3, 4, 5, 6];

// ─── Reusable form field components ─────────
function FieldLabel({ icon: Icon, label }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </label>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3.5 py-2.5 rounded-lg border border-slate-300
                   text-slate-900 text-sm bg-white
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                   outline-none transition-all cursor-pointer
                   disabled:bg-slate-50 disabled:text-slate-400"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) =>
          typeof opt === "object" ? (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ) : (
            <option key={opt} value={opt}>
              {opt}
            </option>
          )
        )}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

function NumberField({ value, onChange, placeholder, min, step = "1" }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300
                 text-slate-900 text-sm placeholder-slate-400
                 focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                 outline-none transition-all"
    />
  );
}

// ─── Result card ─────────────────────────────
function ResultCard({ result }) {
  const { predicted_price, budget, budget_status } = result;

  const statusConfig = {
    within_budget: {
      label: "Within Budget",
      sublabel: "This property fits your budget.",
      icon: CheckCircle,
      bg: "bg-green-50",
      border: "border-green-200",
      iconColor: "text-green-500",
      labelColor: "text-green-700",
      priceColor: "text-green-800",
      badgeBg: "bg-green-100",
      badgeText: "text-green-700",
    },
    above_budget: {
      label: "Above Budget",
      sublabel: `Exceeds your budget by ${(predicted_price - budget).toFixed(2)} L.`,
      icon: XCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-500",
      labelColor: "text-red-700",
      priceColor: "text-red-800",
      badgeBg: "bg-red-100",
      badgeText: "text-red-700",
    },
    below_expected: {
      label: "Below Expected",
      sublabel: "Predicted price is significantly below your budget.",
      icon: TrendingDown,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-500",
      labelColor: "text-amber-700",
      priceColor: "text-amber-800",
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-700",
    },
  };

  const cfg = statusConfig[budget_status] || statusConfig.within_budget;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-6 animate-fadeIn`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            Estimated Market Value
          </p>
          <p className={`text-4xl font-bold ${cfg.priceColor}`}>
            ₹ {predicted_price.toFixed(2)}
            <span className="text-lg font-medium ml-1">L</span>
          </p>
        </div>
        <div className={`${cfg.badgeBg} rounded-full p-2.5`}>
          <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
        </div>
      </div>

      {/* Budget comparison bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Predicted</span>
          <span>Your Budget: ₹ {budget} L</span>
        </div>
        <div className="h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700
              ${budget_status === "above_budget" ? "bg-red-400" :
                budget_status === "below_expected" ? "bg-amber-400" : "bg-green-400"}`}
            style={{
              width: `${Math.min((predicted_price / (budget * 1.5)) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${cfg.badgeBg}`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
        <span className={`text-sm font-semibold ${cfg.labelColor}`}>{cfg.label}</span>
      </div>
      <p className={`text-sm mt-2 ${cfg.labelColor}`}>{cfg.sublabel}</p>

      {/* Property summary */}
      <div className="mt-4 pt-4 border-t border-slate-200/70 grid grid-cols-3 gap-3">
        {[
          { label: "Location", value: toLabel(result.location) },
          { label: "BHK", value: `${result.bhk} BHK` },
          { label: "Area", value: `${result.area_insqft} sqft` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Prediction Page ────────────────────
export default function Prediction() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    location: "",
    building_status: "",
    bhk: "",
    area_insqft: "",
    budget: "",
  });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getLocations()
      .then((res) => setLocations(res.data.locations || FALLBACK_LOCATIONS))
      .catch(() => setLocations(FALLBACK_LOCATIONS));
  }, []);

  const set = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
    setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!form.location) e.location = "Please select a location.";
    if (!form.building_status) e.building_status = "Please select building status.";
    if (!form.bhk) e.bhk = "Please select BHK.";
    if (!form.area_insqft || Number(form.area_insqft) <= 0)
      e.area_insqft = "Enter a valid area (> 0 sqft).";
    if (!form.budget || Number(form.budget) <= 0)
      e.budget = "Enter a valid budget (> 0 Lakhs).";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        location: form.location,
        building_status: form.building_status,
        bhk: Number(form.bhk),
        area_insqft: Number(form.area_insqft),
        budget: Number(form.budget),
      };
      const res = await predict(payload);
      setResult(res.data);
    } catch (err) {
      setApiError(
        err.response?.data?.detail || "Prediction failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ location: "", building_status: "", bhk: "", area_insqft: "", budget: "" });
    setResult(null);
    setErrors({});
    setApiError("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Property Valuation</h1>
        <p className="text-slate-500 text-sm">
          Enter property details to receive an AI-powered market value estimate.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* ── Form panel ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-base font-semibold text-slate-800 mb-6 pb-4 border-b border-slate-100">
              Property Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Location */}
              <div>
                <FieldLabel icon={MapPin} label="Location" />
                <SelectField
                  value={form.location}
                  onChange={set("location")}
                  placeholder="Select area"
                  options={locations.map((l) => ({ value: l, label: toLabel(l) }))}
                />
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
              </div>

              {/* Row 2: BHK + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel icon={Home} label="BHK" />
                  <SelectField
                    value={form.bhk}
                    onChange={set("bhk")}
                    placeholder="Select BHK"
                    options={BHK_OPTIONS.map((b) => ({ value: String(b), label: `${b} BHK` }))}
                  />
                  {errors.bhk && (
                    <p className="text-red-500 text-xs mt-1">{errors.bhk}</p>
                  )}
                </div>
                <div>
                  <FieldLabel icon={Layers} label="Building Status" />
                  <SelectField
                    value={form.building_status}
                    onChange={set("building_status")}
                    placeholder="Select status"
                    options={BUILDING_STATUS_OPTIONS}
                  />
                  {errors.building_status && (
                    <p className="text-red-500 text-xs mt-1">{errors.building_status}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Area + Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel icon={Maximize2} label="Area (sqft)" />
                  <NumberField
                    value={form.area_insqft}
                    onChange={set("area_insqft")}
                    placeholder="e.g. 1200"
                    min="1"
                  />
                  {errors.area_insqft && (
                    <p className="text-red-500 text-xs mt-1">{errors.area_insqft}</p>
                  )}
                </div>
                <div>
                  <FieldLabel icon={Wallet} label="Budget (Lakhs)" />
                  <NumberField
                    value={form.budget}
                    onChange={set("budget")}
                    placeholder="e.g. 80"
                    min="1"
                    step="0.5"
                  />
                  {errors.budget && (
                    <p className="text-red-500 text-xs mt-1">{errors.budget}</p>
                  )}
                </div>
              </div>

              {/* API error */}
              {apiError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{apiError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2
                             bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                             text-white font-medium py-2.5 rounded-lg text-sm
                             transition-colors shadow-sm"
                >
                  <Calculator className="h-4 w-4" />
                  {loading ? "Calculating..." : "Estimate Price"}
                </button>
                {result && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300
                               text-slate-600 hover:text-slate-800 hover:bg-slate-50
                               text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── Result panel ── */}
        <div className="lg:col-span-2">
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <div className="bg-slate-50 rounded-full h-14 w-14 flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium text-sm mb-1">No estimate yet</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Fill in the property details and click{" "}
                <span className="font-medium text-slate-500">Estimate Price</span> to get a
                market value prediction.
              </p>
            </div>
          )}

          {/* Info sidebar */}
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              How it works
            </p>
            <ul className="space-y-2.5">
              {[
                "Enter the location, size, and configuration of the property.",
                "Our Gradient Boosting model analyzes 3,600+ market listings.",
                "Receive an estimated price compared against your budget.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-500 text-xs leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
            <p className="text-slate-400 text-xs mt-4 pt-3 border-t border-slate-200">
              Predictions are indicative. Consult a registered property agent for formal valuation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
