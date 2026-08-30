import React, { useState } from "react";
import { Sliders, User, DollarSign, AlertOctagon, ChevronDown, ChevronUp, Zap, ShieldAlert } from "lucide-react";
import { CallContextState, EnrolledSpeaker } from "../types";

interface ContextFormProps {
  context: CallContextState;
  onChange: (updated: Partial<CallContextState>) => void;
  enrolledSpeakers: EnrolledSpeaker[];
  disabled: boolean;
}

export const ContextForm: React.FC<ContextFormProps> = ({
  context,
  onChange,
  enrolledSpeakers,
  disabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const applyPreset = (type: "ceo_fraud" | "normal_call" | "spoof_attempt") => {
    if (type === "ceo_fraud") {
      onChange({
        speaker_id: enrolledSpeakers.length > 0 ? enrolledSpeakers[0].speaker_id : "EMP-9001",
        verification_threshold: 0.70,
        caller_id: "+1-555-0199",
        is_caller_recognized: false,
        is_previously_flagged: false,
        claimed_role: "CEO",
        requested_transaction_amount: "85000",
        normal_transaction_amount: "5000",
        is_urgent: true,
        urgency_reason: "Immediate overseas vendor acquisition deadline",
        transcript_text: "Please wire the 85,000 USD immediately before banking cutoff.",
      });
      setIsExpanded(true);
    } else if (type === "normal_call") {
      onChange({
        speaker_id: enrolledSpeakers.length > 0 ? enrolledSpeakers[0].speaker_id : "EMP-9001",
        verification_threshold: 0.70,
        caller_id: "+1-555-0100",
        is_caller_recognized: true,
        is_previously_flagged: false,
        claimed_role: "Account Manager",
        requested_transaction_amount: "1500",
        normal_transaction_amount: "2000",
        is_urgent: false,
        urgency_reason: "",
        transcript_text: "Following up on standard monthly invoice approval.",
      });
      setIsExpanded(true);
    } else if (type === "spoof_attempt") {
      onChange({
        speaker_id: "EMP-9001",
        verification_threshold: 0.80,
        caller_id: "+1-800-BANK-FRAUD",
        is_caller_recognized: false,
        is_previously_flagged: true,
        claimed_role: "Chief Financial Officer",
        requested_transaction_amount: "120000",
        normal_transaction_amount: "10000",
        is_urgent: true,
        urgency_reason: "Urgent confidential board settlement",
        transcript_text: "Transfer immediately, do not verify via secondary channel.",
      });
      setIsExpanded(true);
    }
  };

  return (
    <div id="context-configuration-panel" className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header with toggle and presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          id="toggle-context-form-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shadow-sm">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Contextual Anti-Fraud Signals & Biometric Parameters
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="text-xs text-slate-500">
              {context.speaker_id || context.claimed_role || context.requested_transaction_amount
                ? `Configured: ${context.speaker_id ? `Speaker [${context.speaker_id}]` : ""}${context.claimed_role ? ` • Role [${context.claimed_role}]` : ""}${context.requested_transaction_amount ? ` • $${context.requested_transaction_amount}` : ""}`
                : "Optionally specify claimed speaker identity, authority role, and financial amounts for composite risk assessment."}
            </div>
          </div>
        </button>

        {/* Quick Simulation Preset Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
            <Zap className="w-3 h-3 text-amber-500" />
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("ceo_fraud")}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-semibold text-amber-700 border border-amber-500/30 transition-colors"
          >
            CEO Impersonation
          </button>
          <button
            type="button"
            onClick={() => applyPreset("normal_call")}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-semibold text-emerald-700 border border-emerald-500/30 transition-colors"
          >
            Normal Call
          </button>
        </div>
      </div>

      {/* Expandable Form Body */}
      {isExpanded && (
        <div className="pt-4 border-t border-slate-200/80 space-y-4 text-xs">
          
          {/* Row 1: Speaker Selection & Verification Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="context-speaker-id" className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Claimed Speaker ID (Phase 5 Biometrics):
              </label>
              <div className="flex gap-2">
                <input
                  id="context-speaker-id"
                  type="text"
                  placeholder="e.g. EMP-9001, CEO-JANE"
                  value={context.speaker_id}
                  onChange={(e) => onChange({ speaker_id: e.target.value })}
                  disabled={disabled}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
                {enrolledSpeakers.length > 0 && (
                  <select
                    id="select-enrolled-speaker"
                    onChange={(e) => e.target.value && onChange({ speaker_id: e.target.value })}
                    disabled={disabled}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none shadow-sm"
                    value=""
                  >
                    <option value="" disabled>Select Profile</option>
                    {enrolledSpeakers.map((s) => (
                      <option key={s.speaker_id} value={s.speaker_id}>
                        {s.speaker_id} {s.speaker_name ? `(${s.speaker_name})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Matches against 192-D ECAPA-TDNN embedding in profile store.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="context-threshold-slider" className="font-semibold text-slate-800">
                  Verification Threshold (τ):
                </label>
                <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {context.verification_threshold.toFixed(2)}
                </span>
              </div>
              <input
                id="context-threshold-slider"
                type="range"
                min="0.50"
                max="0.95"
                step="0.01"
                value={context.verification_threshold}
                onChange={(e) => onChange({ verification_threshold: parseFloat(e.target.value) })}
                disabled={disabled}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.50 (Relaxed)</span>
                <span>0.70 (Standard Default)</span>
                <span>0.95 (Strict High-Sec)</span>
              </div>
            </div>
          </div>

          {/* Row 2: Authority Role & Financial Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="context-claimed-role" className="font-semibold text-slate-800">
                Claimed Authority Role:
              </label>
              <input
                id="context-claimed-role"
                type="text"
                placeholder="e.g. CEO, CFO, Banker"
                value={context.claimed_role}
                onChange={(e) => onChange({ claimed_role: e.target.value })}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="context-requested-amount" className="font-semibold text-slate-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                Requested Amount ($):
              </label>
              <input
                id="context-requested-amount"
                type="number"
                placeholder="e.g. 75000"
                value={context.requested_transaction_amount}
                onChange={(e) => onChange({ requested_transaction_amount: e.target.value })}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="context-normal-amount" className="font-semibold text-slate-800">
                Normal Baseline ($):
              </label>
              <input
                id="context-normal-amount"
                type="number"
                placeholder="e.g. 5000"
                value={context.normal_transaction_amount}
                onChange={(e) => onChange({ normal_transaction_amount: e.target.value })}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Row 3: Caller Status & Urgency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="context-caller-id" className="font-semibold text-slate-800">
                Caller Phone / ANI:
              </label>
              <input
                id="context-caller-id"
                type="text"
                placeholder="+1-555-0199"
                value={context.caller_id}
                onChange={(e) => onChange({ caller_id: e.target.value })}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
              />
            </div>

            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={context.is_caller_recognized}
                  onChange={(e) => onChange({ is_caller_recognized: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Recognized Contact</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={context.is_urgent}
                  onChange={(e) => onChange({ is_urgent: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-slate-300 text-amber-600 focus:ring-0"
                />
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Urgency Pressure
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="context-transcript" className="font-semibold text-slate-800">
                Transcript Snippet:
              </label>
              <input
                id="context-transcript"
                type="text"
                placeholder="e.g. Wire immediately to overseas account"
                value={context.transcript_text}
                onChange={(e) => onChange({ transcript_text: e.target.value })}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

