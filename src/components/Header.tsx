import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  Radio,
  UserCheck,
  FileAudio,
  Sliders,
  Activity,
  Terminal,
  Clock,
  Shield
} from "lucide-react";
import { HealthResponse } from "../types";
import { NavTab } from "./Sidebar";

interface HeaderProps {
  health: HealthResponse | null;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  enrolledCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  activeTab,
  onTabChange,
  enrolledCount,
}) => {
  const isHealthy = health?.status === "ok";
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case "live":
        return "Live Call Intercept & Telemetry";
      case "analysis":
        return "Audio Payload Forensic Inspection";
      case "speakers":
        return "192-D Biometric Voiceprint Registry";
      case "policy":
        return "Organization Anti-Fraud Policy Controls";
    }
  };

  return (
    <header
      id="main-header"
      className="header-glass w-full sticky top-0 z-30 px-4 sm:px-8 h-20 flex items-center justify-between border-b border-white/10"
    >
      {/* Left: Telemetry Badges & Mobile Brand */}
      <div className="flex items-center gap-4">
        {/* Mobile Brand Logo */}
        <div className="lg:hidden flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl liquid-pill border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <ShieldCheck className="w-5 h-5 glow-cyan" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">VoiceShield</span>
        </div>

        {/* Active Defense Core Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-pill border-cyan-400/30 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
          <span className="font-mono text-xs font-bold text-cyan-200 uppercase tracking-wide">
            Active Defense Core
          </span>
        </div>

        {/* WS Stream Status */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-inner-well text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-mono text-xs tracking-wide">
            WS: <strong className="text-cyan-300">CONNECTED 48kHz</strong>
          </span>
        </div>

        {/* Threat Tier Badge */}
        <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
          <span className="font-mono text-[10px] text-purple-400/90 font-bold uppercase tracking-wider">
            THREAT TIER:
          </span>
          <span className="font-mono text-[11px] font-extrabold text-purple-200 tracking-wider">
            ELEVATED-BETA
          </span>
        </div>

        {/* Desktop Breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            VOICESHIELD /
          </span>
          <span className="text-sm font-bold text-white font-display tracking-tight">
            {getTabTitle(activeTab)}
          </span>
        </div>
      </div>

      {/* Center: Tablet Navigation Switcher */}
      <nav className="hidden sm:flex lg:hidden items-center gap-1.5 liquid-inner-well p-1.5 rounded-2xl border-white/10">
        <button
          onClick={() => onTabChange("live")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "live"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Live
        </button>
        <button
          onClick={() => onTabChange("analysis")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "analysis"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileAudio className="w-3.5 h-3.5" />
          Payload
        </button>
        <button
          onClick={() => onTabChange("speakers")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "speakers"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Profiles ({enrolledCount})
        </button>
        <button
          onClick={() => onTabChange("policy")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "policy"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Policy
        </button>
      </nav>

      {/* Right: Actions, Operator Badge, Clock */}
      <div className="flex items-center gap-4">
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-xl liquid-btn-glass text-slate-300 flex items-center justify-center transition-all group"
            title="Engine Health Verification"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Operator Profile Pill */}
        <div className="hidden lg:flex items-center gap-3 pl-2 border-l border-white/10">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-white leading-tight">Agent Phoenix</span>
            <span className="text-[10px] font-mono text-cyan-400/90 uppercase tracking-wider">
              SOC Forensics L3
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-[0_0_14px_rgba(34,211,238,0.35)] shrink-0">
            <div className="w-full h-full rounded-[11px] bg-[#070e1c] flex items-center justify-center text-cyan-300 font-bold text-xs">
              PX
            </div>
          </div>
        </div>

        {/* Live Clock Widget */}
        {timeStr && (
          <div className="hidden sm:flex flex-col text-right pl-3 border-l border-white/10">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest font-mono">
              UTC SYNCHRONIZED
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300 glow-cyan">
              {timeStr}
            </span>
          </div>
        )}

        {/* Mobile Nav Toggle */}
        <div className="flex sm:hidden liquid-inner-well rounded-xl p-1 border border-white/10">
          <button
            onClick={() => onTabChange("live")}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === "live" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400"
            }`}
            title="Live Call Monitor"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTabChange("analysis")}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === "analysis" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400"
            }`}
            title="Payload Inspection"
          >
            <FileAudio className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTabChange("speakers")}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === "speakers" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400"
            }`}
            title="Speaker Profiles"
          >
            <UserCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTabChange("policy")}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === "policy" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400"
            }`}
            title="Policy Controls"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};



