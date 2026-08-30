import React from "react";
import { ShieldCheck, Cpu, Radio, UserCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { HealthResponse } from "../types";

interface HeaderProps {
  health: HealthResponse | null;
  activeTab: "analysis" | "speakers";
  onTabChange: (tab: "analysis" | "speakers") => void;
  enrolledCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  activeTab,
  onTabChange,
  enrolledCount,
}) => {
  const isHealthy = health?.status === "ok";

  return (
    <header id="main-header" className="glass-top-nav w-full sticky top-0 z-40 px-4 sm:px-8 h-16 flex items-center justify-between border-b border-white/40">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md border border-slate-700/50">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
              VoiceShield
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 tracking-wider">
              SIH 2026 #26104
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Real-Time AI Voice-Cloning Detection & Anti-Fraud Security
          </p>
        </div>
      </div>

      {/* Center: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-sm">
        <button
          id="nav-tab-analysis"
          onClick={() => onTabChange("analysis")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "analysis"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Signal Analysis & Live Monitor
        </button>
        <button
          id="nav-tab-speakers"
          onClick={() => onTabChange("speakers")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "speakers"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Speaker Profiles
          {enrolledCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "speakers" ? "bg-emerald-400/30 text-emerald-300" : "bg-slate-200 text-slate-700"
            }`}>
              {enrolledCount}
            </span>
          )}
        </button>
      </nav>

      {/* Right: Engine Telemetry & System Status */}
      <div className="flex items-center gap-3">
        <div id="backend-status-badge" className="flex items-center gap-2 bg-white/70 backdrop-blur-md border border-white/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? "bg-emerald-400" : "bg-amber-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}></span>
          </span>
          <span className="font-semibold text-slate-800 hidden sm:inline">
            {isHealthy ? "System Secure" : "Connecting"}
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>ECAPA + Wav2Vec2</span>
          </div>
        </div>

        {/* Mobile Tab Toggle */}
        <div className="flex md:hidden bg-white/60 rounded-lg p-1 border border-white/70">
          <button
            onClick={() => onTabChange("analysis")}
            className={`p-1.5 rounded ${activeTab === "analysis" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            title="Analysis"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTabChange("speakers")}
            className={`p-1.5 rounded ${activeTab === "speakers" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            title="Speaker Profiles"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

