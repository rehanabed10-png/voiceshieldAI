import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  Fingerprint,
  Cpu,
  User,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
  Shield,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  X,
  Radio,
  FileText,
  UserCheck,
  UserX,
  Phone,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  SecurityEvent,
  SecurityEventsSummary,
  SecurityEventFilterType,
  VerificationSessionState,
} from "../types";
import {
  fetchSecurityEvents,
  fetchSecuritySummary,
  resolveSecurityEvent,
  escalateSecurityEvent,
} from "../api";
import { SecondaryVerificationPanel } from "./SecondaryVerificationPanel";

export const SecurityEventsView: React.FC = () => {
  const [filterLevel, setFilterLevel] = useState<SecurityEventFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<SecurityEventsSummary>({
    total_events: 0,
    active_threats: 0,
    critical_events: 0,
    calls_requiring_verification: 0,
    transactions_on_hold: 0,
    blocked_calls: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [inspectEvent, setInspectEvent] = useState<SecurityEvent | null>(null);
  const [activeVerificationCallId, setActiveVerificationCallId] = useState<string | null>(null);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load events and summary from authoritative API
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await fetchSecurityEvents(filterLevel, searchQuery);
      if (response && response.events) {
        setEvents(response.events);
        if (response.summary) {
          setSummary(response.summary);
        }
        // Auto-expand first critical event if none expanded yet
        if (!expandedEventId && response.events.length > 0) {
          const firstCrit = response.events.find(
            (e) => e.severity === "CRITICAL" || e.severity === "HIGH"
          );
          if (firstCrit) {
            setExpandedEventId(firstCrit.id);
          }
        }
      }
    } catch (err: any) {
      console.error("[SecurityEventsView] Error fetching events:", err);
      setError(err.message || "Failed to fetch security events.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [filterLevel, searchQuery, expandedEventId]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadData();
  }, [filterLevel, searchQuery]);

  // Polling for live SOC feed updates
  useEffect(() => {
    if (!isLivePolling) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [isLivePolling, loadData]);

  // Action: Mark resolved
  const handleResolve = async (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionInProgress(eventId);
    try {
      await resolveSecurityEvent(eventId, "Resolved via Security Operations Center");
      setActionMessage("Incident successfully marked as RESOLVED.");
      setTimeout(() => setActionMessage(null), 3500);
      await loadData(true);
      if (inspectEvent && inspectEvent.id === eventId) {
        setInspectEvent((prev) => prev ? { ...prev, status: "RESOLVED", verification_status: "VERIFIED" } : null);
      }
    } catch (err: any) {
      alert(`Failed to resolve incident: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Escalate to supervisor
  const handleEscalate = async (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionInProgress(eventId);
    try {
      await escalateSecurityEvent(eventId, "Escalated to SOC Supervisor for advanced forensics");
      setActionMessage("Incident ESCALATED to Tier-2 SOC Supervisor.");
      setTimeout(() => setActionMessage(null), 3500);
      await loadData(true);
      if (inspectEvent && inspectEvent.id === eventId) {
        setInspectEvent((prev) => prev ? { ...prev, status: "ESCALATED", verification_status: "ESCALATED" } : null);
      }
    } catch (err: any) {
      alert(`Failed to escalate incident: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Open verification modal
  const handleOpenVerification = (callId: string, event: SecurityEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveVerificationCallId(callId);
    setInspectEvent(event);
  };

  // Helper: Format relative or timestamp
  const formatTime = (ts: number | string) => {
    const num = typeof ts === "string" ? new Date(ts).getTime() : ts;
    if (isNaN(num)) return String(ts);
    const diffSec = Math.floor((Date.now() - num) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(num).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Severity styles
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "bg-red-500/20 text-red-300 border-red-500/40",
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />,
          cardBorder: "border-red-500/30 bg-red-950/20 hover:border-red-500/50",
          accentText: "text-red-400",
        };
      case "HIGH":
        return {
          bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          cardBorder: "border-amber-500/30 bg-amber-950/15 hover:border-amber-500/40",
          accentText: "text-amber-400",
        };
      case "MEDIUM":
        return {
          bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
          icon: <Activity className="w-3.5 h-3.5 text-yellow-400" />,
          cardBorder: "border-yellow-500/20 bg-yellow-950/10 hover:border-yellow-500/30",
          accentText: "text-yellow-400",
        };
      case "LOW":
      default:
        return {
          bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          cardBorder: "border-white/10 bg-slate-900/40 hover:border-white/20",
          accentText: "text-emerald-400",
        };
    }
  };

  // Event type icon & label
  const getEventTypeMeta = (type: string) => {
    switch (type) {
      case "DEEPFAKE_VOICE_CLONE":
        return { label: "Voice Clone Attack", icon: <Cpu className="w-3.5 h-3.5" />, color: "text-red-400" };
      case "EXECUTIVE_IMPERSONATION":
        return { label: "Executive Impersonation", icon: <UserX className="w-3.5 h-3.5" />, color: "text-red-400" };
      case "ROLE_MISMATCH":
        return { label: "Role Registry Mismatch", icon: <User className="w-3.5 h-3.5" />, color: "text-amber-400" };
      case "TRANSACTION_AUTO_HOLD":
        return { label: "Transaction Auto-Hold", icon: <DollarSign className="w-3.5 h-3.5" />, color: "text-amber-400" };
      case "SPEAKER_MISMATCH":
        return { label: "Biometric Mismatch", icon: <Fingerprint className="w-3.5 h-3.5" />, color: "text-amber-400" };
      case "ACOUSTIC_ANOMALY":
        return { label: "Acoustic Artifacts", icon: <Radio className="w-3.5 h-3.5" />, color: "text-yellow-400" };
      case "CALL_BLOCKED":
        return { label: "Call Terminated / Blocked", icon: <Ban className="w-3.5 h-3.5" />, color: "text-red-400" };
      case "VERIFICATION_FAILED":
        return { label: "Verification Failed", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400" };
      case "VERIFICATION_ESCALATED":
        return { label: "Escalated to Supervisor", icon: <ArrowUpRight className="w-3.5 h-3.5" />, color: "text-purple-400" };
      default:
        return { label: type.replace(/_/g, " "), icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "text-blue-400" };
    }
  };

  return (
    <div id="security-events-view" className="space-y-6">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="glass-card p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 text-xs font-mono flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-400 hover:text-white text-xs px-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top SOC Metrics Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Events */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Intercepts
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{summary.total_events}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Authoritative</p>
          </div>
        </div>

        {/* Metric 2: Active Threats */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/30 bg-red-950/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-wider">
              Active Threats
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400 font-mono">{summary.active_threats}</span>
              {summary.active_threats > 0 && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/30 text-red-200">
                  ACTION
                </span>
              )}
            </div>
            <p className="text-[10px] text-red-300/80 font-mono mt-0.5">High / Critical</p>
          </div>
        </div>

        {/* Metric 3: Critical Clones */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Critical Clones
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{summary.critical_events}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Wav2Vec2 Confidence</p>
          </div>
        </div>

        {/* Metric 4: Verification Required */}
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-950/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              Verifications
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {summary.calls_requiring_verification}
            </span>
            <p className="text-[10px] text-amber-300/80 font-mono mt-0.5">MFA / Challenge</p>
          </div>
        </div>

        {/* Metric 5: Transactions On Hold */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Holds Active
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{summary.transactions_on_hold}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Step-Up Shield</p>
          </div>
        </div>

        {/* Metric 6: Blocked Calls */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Calls Blocked
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-400 font-mono">{summary.blocked_calls}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Threats Blacklisted</p>
          </div>
        </div>
      </div>

      {/* Main SOC Control Ribbon */}
      <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/10 shadow-xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Call ID, ANI, Role, Flag, or Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner"
            />
          </div>

          {/* Right Controls: Live Toggle & Manual Refresh */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              onClick={() => setIsLivePolling(!isLivePolling)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold border flex items-center gap-2 transition-all ${
                isLivePolling
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"
              }`}
              title="Toggle continuous live telemetry polling"
            >
              <span className={`w-2 h-2 rounded-full ${isLivePolling ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {isLivePolling ? "LIVE FEED ACTIVE" : "FEED PAUSED"}
            </button>

            <button
              onClick={() => loadData(false)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title="Refresh Security Events"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { key: "ALL", label: "All Events", count: summary.total_events },
            { key: "CRITICAL", label: "Critical", count: summary.critical_events, isCrit: true },
            { key: "HIGH", label: "High Risk", isHigh: true },
            { key: "MEDIUM", label: "Medium" },
            { key: "LOW", label: "Safe / Low" },
            { key: "UNRESOLVED", label: "Unresolved / Open" },
            { key: "VERIFICATION_REQUIRED", label: "Verification Required", count: summary.calls_requiring_verification },
            { key: "BLOCKED", label: "Blocked Calls", count: summary.blocked_calls },
          ].map((tab) => {
            const isActive = filterLevel === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterLevel(tab.key as SecurityEventFilterType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                    : tab.isCrit
                    ? "bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20"
                    : tab.isHigh
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                    : "bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-black/30 text-slate-300"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Security Incident Stream */}
        <div className="space-y-3 pt-1">
          {loading && events.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/10 text-slate-400 text-xs font-mono flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span>Querying threat intelligence database and in-memory intercept telemetry...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center rounded-2xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs font-mono">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-red-400" />
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/10 text-slate-400 text-xs font-mono">
              <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              No security incidents matching current query parameters.
            </div>
          ) : (
            events.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              const sev = getSeverityBadge(evt.severity);
              const meta = getEventTypeMeta(evt.event_type);
              const fakeProb = evt.contributing_signals?.fake_probability ?? 0;
              const isPendingVerification =
                evt.verification_status === "PENDING" ||
                evt.verification_status === "CHALLENGE_REQUIRED" ||
                evt.verification_status === "VERIFICATION_IN_PROGRESS";

              return (
                <div
                  key={evt.id}
                  id={`security-event-${evt.id}`}
                  className={`rounded-2xl border transition-all overflow-hidden ${sev.cardBorder}`}
                >
                  {/* Row Summary Bar */}
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left Meta & Identity */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${sev.bg}`}>
                        {sev.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white tracking-wide">
                            {evt.call_id}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${sev.bg}`}>
                            {evt.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatTime(evt.timestamp)}
                          </span>
                          {evt.is_held && evt.transaction_amount && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              ${evt.transaction_amount.toLocaleString()} ON HOLD
                            </span>
                          )}
                          {evt.status === "RESOLVED" && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              RESOLVED
                            </span>
                          )}
                        </div>

                        {/* Caller Info */}
                        <div className="text-[11px] text-slate-300 truncate mt-1 flex items-center gap-2 flex-wrap font-mono">
                          <span className="text-slate-400">ANI:</span>
                          <span className="text-white font-bold">{evt.caller_id || "Unregistered VoIP"}</span>
                          {evt.claimed_role && (
                            <>
                              <span className="text-slate-600">&bull;</span>
                              <span className="text-slate-400">Role:</span>
                              <span className="text-slate-200">{evt.claimed_role}</span>
                            </>
                          )}
                          {evt.contact_name && (
                            <>
                              <span className="text-slate-600">&bull;</span>
                              <span className="text-slate-400">Claimed:</span>
                              <span className="text-blue-300">{evt.contact_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Signals & Action Triggers */}
                    <div className="flex items-center gap-4 self-end lg:self-center shrink-0 flex-wrap">
                      {/* Deepfake Confidence */}
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">AI SYNTHESIS</div>
                        <div className={`text-xs font-mono font-bold ${fakeProb > 0.5 ? "text-red-400" : "text-emerald-400"}`}>
                          {(fakeProb * 100).toFixed(1)}%
                        </div>
                      </div>

                      {/* Risk Score */}
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">RISK SCORE</div>
                        <div className={`text-sm font-mono font-black ${sev.accentText}`}>
                          {evt.risk_score}<span className="text-[10px] text-slate-500 font-normal">/100</span>
                        </div>
                      </div>

                      {/* Status / Action Pill */}
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                        evt.recommended_action === "BLOCK"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : evt.recommended_action === "SECONDARY_VERIFICATION" || evt.recommended_action === "CHALLENGE_CALLER"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}>
                        {evt.recommended_action}
                      </div>

                      {/* Quick Inspect Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectEvent(evt);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold transition-all flex items-center gap-1"
                        title="Inspect Full Incident Details"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Incident Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-white/10 bg-black/40 space-y-4 text-xs">
                      {/* Threat Explanation */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-blue-400" />
                          Authoritative Threat Analysis
                        </div>
                        <p className="text-slate-200 text-xs font-mono leading-relaxed">
                          {evt.explanation}
                        </p>
                      </div>

                      {/* Multi-Signal Fusion Flags */}
                      {evt.flags.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="font-mono text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-amber-400" />
                            Multi-Signal Risk Fusion Telemetry ({evt.flags.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {evt.flags.map((flag, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-200 text-[11px] font-mono flex items-start gap-2"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                <span>{flag}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Forensic Signal Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-slate-500 text-[10px]">Speaker Voiceprint</div>
                          <div className="text-white font-bold truncate mt-0.5">{evt.speaker_id || "Unenrolled"}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-slate-500 text-[10px]">Biometric Cosine Match</div>
                          <div className={`font-bold mt-0.5 ${
                            evt.contributing_signals?.speaker_match ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {evt.contributing_signals?.speaker_similarity !== undefined
                              ? evt.contributing_signals.speaker_similarity.toFixed(2)
                              : "N/A"}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-slate-500 text-[10px]">Verification State</div>
                          <div className="text-blue-300 font-bold mt-0.5">{evt.verification_status || "NONE"}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-slate-500 text-[10px]">Transaction Shield</div>
                          <div className={`font-bold mt-0.5 ${evt.is_held ? "text-purple-400" : "text-emerald-400"}`}>
                            {evt.is_held ? "Step-Up ON HOLD" : "Normal Flow"}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Verify Caller Button */}
                          <button
                            onClick={(e) => handleOpenVerification(evt.call_id, evt, e)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {isPendingVerification ? "Execute Secondary Verification" : "Inspect Verification Workflow"}
                          </button>

                          {/* Escalate Button */}
                          {evt.status !== "ESCALATED" && (
                            <button
                              onClick={(e) => handleEscalate(evt.id, e)}
                              disabled={actionInProgress === evt.id}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Escalate to Supervisor
                            </button>
                          )}

                          {/* Resolve Button */}
                          {evt.status !== "RESOLVED" && (
                            <button
                              onClick={(e) => handleResolve(evt.id, e)}
                              disabled={actionInProgress === evt.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Resolved
                            </button>
                          )}
                        </div>

                        <div className="text-[10px] font-mono text-slate-500">
                          ID: {evt.id} &bull; Org: {evt.organization_id}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Slide-over Inspection Sheet Modal */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/20 shadow-2xl flex flex-col overflow-hidden bg-slate-950/90">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getSeverityBadge(inspectEvent.severity).bg}`}>
                  {getSeverityBadge(inspectEvent.severity).icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">{inspectEvent.call_id}</h3>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(inspectEvent.severity).bg}`}>
                      {inspectEvent.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {getEventTypeMeta(inspectEvent.event_type).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Logged: {new Date(inspectEvent.timestamp).toLocaleString()} &bull; Org: {inspectEvent.organization_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setInspectEvent(null);
                  setActiveVerificationCallId(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Telemetry Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Risk Level / Score</div>
                  <div className="text-2xl font-black text-white">{inspectEvent.risk_score} / 100</div>
                  <div className="text-[10px] text-red-400 font-bold">{inspectEvent.risk_level} VERDICT</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Caller Identity</div>
                  <div className="text-sm font-bold text-white truncate">{inspectEvent.caller_id || "Unknown"}</div>
                  <div className="text-[10px] text-blue-300 truncate">
                    {inspectEvent.claimed_role || "Unspecified Role"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Verification Status</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {inspectEvent.verification_status || "NONE"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {inspectEvent.is_held ? "Transaction ON HOLD" : "Normal Processing"}
                  </div>
                </div>
              </div>

              {/* Threat Narrative */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Forensic Threat Narrative
                </div>
                <p className="text-slate-300 font-mono text-xs leading-relaxed">
                  {inspectEvent.explanation}
                </p>
                {inspectEvent.hold_reason && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-300 font-mono text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Hold Policy: {inspectEvent.hold_reason}</span>
                  </div>
                )}
              </div>

              {/* Embedded Secondary Verification Workflow Panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    Interactive Secondary Verification Panel
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Authoritative State Machine Sync
                  </span>
                </div>

                <SecondaryVerificationPanel
                  callId={inspectEvent.call_id}
                  initialSession={inspectEvent.verification_session}
                  recommendedAction={inspectEvent.recommended_action}
                  riskScore={inspectEvent.risk_score}
                  riskLevel={inspectEvent.risk_level}
                  onSessionUpdated={(updatedSession) => {
                    setInspectEvent((prev) =>
                      prev
                        ? {
                            ...prev,
                            verification_session: updatedSession,
                            verification_status: updatedSession.status,
                            is_held: updatedSession.is_held,
                            hold_reason: updatedSession.hold_reason,
                            status: updatedSession.status === "VERIFIED" ? "RESOLVED" : prev.status,
                          }
                        : null
                    );
                    loadData(true);
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400">
                VoiceShield SIH 26104 Security Operations Center &bull; Zero Raw Audio Persistence
              </div>

              <div className="flex items-center gap-2">
                {inspectEvent.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleResolve(inspectEvent.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Incident Resolved
                  </button>
                )}
                <button
                  onClick={() => {
                    setInspectEvent(null);
                    setActiveVerificationCallId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

