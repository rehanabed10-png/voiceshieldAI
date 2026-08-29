import React from "react";
import { ShieldCheck, Cpu, Radio, UserCheck } from "lucide-react";
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
    <header id="main-header" className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Branding & SIH Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                VoiceShield
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                SIH 2026 #26104
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1–5 Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-Time AI Voice-Cloning Detection & Anti-Fraud Security Defense
            </p>
          </div>
        </div>

        {/* Center/Right: Backend Status & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Health & Engine Status Badge */}
          <div id="backend-status-badge" className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              </span>
              <span className="font-medium text-slate-200">
                {isHealthy ? "Engine Active" : "Connecting..."}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>ECAPA-TDNN &bull; Wav2Vec2</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              id="nav-tab-analysis"
              onClick={() => onTabChange("analysis")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "analysis"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Threat Analysis
            </button>
            <button
              id="nav-tab-speakers"
              onClick={() => onTabChange("speakers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "speakers"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Speaker Profiles
              {enrolledCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                  {enrolledCount}
                </span>
              )}
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
