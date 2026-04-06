import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, User } from "lucide-react";

export default function Navbar({ isAuthenticated, username, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold text-base tracking-tight">
                HydeProp
              </span>
              <span className="text-slate-400 text-xs block leading-none">
                Property Valuation
              </span>
            </div>
          </div>

          {/* Right side */}
          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-slate-300 text-sm">
                <div className="bg-slate-700 rounded-full p-1">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span>{username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium
                           px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
