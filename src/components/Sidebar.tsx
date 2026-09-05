import React from "react";
import {
  ShieldCheck,
  Radio,
  FileAudio,
  UserCheck,
  Sliders,
  ChevronRight,
  ExternalLink,
  Shield,
  Activity,
  Cpu,
  Lock
} from "lucide-react";

export type NavTab = "live" | "analysis" | "speakers" | "policy";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  enrolledCount: number;
  threatCount?: number;
  isStreaming?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  enrolledCount,
  isStreaming = false,
}) => {
  const navItems = [
    {
      id: "live" as NavTab,
      label: "Live Analysis",
      subtext: "Real-time stream & biometrics",
      icon: Radio,
      badge: isStreaming ? "STREAMING" : "LIVE",
      badgeColor: isStreaming
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
        : "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.3)]",
    },
    {
      id: "analysis" as NavTab,
      label: "Payload Inspection",
      subtext: "Audio forensic deep scan",
      icon: FileAudio,
    },
    {
      id: "speakers" as NavTab,
      label: "Speaker Profiles",
      subtext: "ECAPA-TDNN 192-d voiceprints",
      icon: UserCheck,
      count: enrolledCount,
    },
    {
      id: "policy" as NavTab,
      label: "Policy Engine",
      subtext: "Thresholds & fraud routing",
      icon: Sliders,
    },
  ];

  return (
    <aside
      id="stitch-sidebar"
      className="hidden lg:flex flex-col w-64 sidebar-glass h-screen sticky top-0 z-40 border-r border-white/10 select-none justify-between p-4 overflow-y-auto"
    >
      {/* Top Header & Logo */}
      <div className="space-y-6">
        {/* Brand Ribbon */}
        <div className="flex items-center gap-3 px-2 py-1.5 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl liquid-pill flex items-center justify-center border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.35)] relative overflow-hidden shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-purple-500/20 opacity-90"></div>
            <ShieldCheck className="w-5 h-5 text-cyan-300 relative z-10 glow-cyan" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-white tracking-tight font-display">
                VoiceShield
              </span>
              <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase truncate">
              Real Voices • Safe World
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-2">
          <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
            Command Systems
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all group squish-btn ${
                    isActive
                      ? "nav-active-glow text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isActive
                          ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                          : "bg-white/5 border border-white/5 text-slate-400 group-hover:text-cyan-300 group-hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold leading-snug">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">{item.subtext}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-1">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-cyan-400/30 text-cyan-200 border border-cyan-400/40"
                            : "bg-black/40 text-slate-400 group-hover:text-slate-200 border border-white/5"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Telemetry & Status Capsule (Figma Spec) */}
      <div className="pt-4 space-y-3">
        {/* Engine Cosine τ Well */}
        <div className="liquid-card p-3.5 rounded-2xl flex flex-col gap-2 relative overflow-hidden border-white/15">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Engine Cosine τ
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300 glow-cyan">
              0.72 Calibrated
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_#22d3ee]"></div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-white/5">
            <span className="font-mono text-[9.5px] text-slate-400 uppercase font-medium">LATENCY</span>
            <span className="font-mono text-xs text-white font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              14.2ms
            </span>
          </div>
        </div>

        {/* Operator Profile Pill */}
        <div className="liquid-card-subtle rounded-2xl p-3 flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm shrink-0 border border-white/20">
              PX
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200 truncate">Agent Phoenix</div>
              <div className="text-[9.5px] text-cyan-400/90 font-mono uppercase tracking-wider truncate">
                SOC Forensics L3
              </div>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] shrink-0" title="Active Defense Core Online" />
        </div>

        <div className="px-2 flex items-center justify-between text-slate-500 text-[10px] font-mono">
          <span>SEC-SPEC v4.9.1</span>
          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
};
