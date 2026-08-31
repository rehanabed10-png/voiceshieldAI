import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Fingerprint,
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Flag,
  Radio,
  Download,
  Ban,
  Lock,
  Globe,
  Languages
} from "lucide-react";
import { AnalyzeResponse } from "../types";
import { SecondaryVerificationPanel } from "./SecondaryVerificationPanel";

interface AnalysisResultProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState(false);

  const isFake = result.deepfake_detection.prediction === "FAKE";
  const isHighRisk = result.risk_level === "HIGH" || result.risk_level === "CRITICAL" || result.risk_score >= 60;
  const isLowRisk = result.risk_level === "LOW" && result.risk_score < 40;

  const fakePct = (result.deepfake_detection.fake_probability * 100).toFixed(1);
  const realPct = (result.deepfake_detection.real_probability * 100).toFixed(1);

  // SVG Gauge calculations
  const circumference = 2 * Math.PI * 45; // ~282.74
  const strokeOffset = circumference - (result.risk_score / 100) * circumference;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionTheme = (action: string) => {
    switch (action) {
      case "ALLOW":
        return {
          bg: "bg-[#009668] text-white",
          border: "border-[#009668]/40",
          text: "text-emerald-400",
          label: "ALLOW (Safe to Proceed)",
        };
      case "WARN":
        return {
          bg: "bg-amber-600 text-white",
          border: "border-amber-500/40",
          text: "text-amber-400",
          label: "WARN (Caution Advised)",
        };
      case "SECONDARY_VERIFICATION":
        return {
          bg: "bg-rose-600 text-white",
          border: "border-rose-500/40",
          text: "text-rose-400",
          label: "SECONDARY VERIFICATION REQUIRED",
        };
      case "BLOCK":
        return {
          bg: "bg-[#ba1a1a] text-white",
          border: "border-[#ba1a1a]/50",
          text: "text-red-400",
          label: "TERMINATE CALL / BLOCK THREAT",
        };
      default:
        return {
          bg: "bg-slate-800 text-white",
          border: "border-slate-700",
          text: "text-slate-200",
          label: action,
        };
    }
  };

  const actionTheme = getActionTheme(result.recommended_action);

  return (
    <div id="analysis-result-container" className="space-y-6">
      
      {/* 1. Primary Verdict Banner (Stitch High-Risk vs Low-Risk) */}
      {isHighRisk ? (
        /* Stitch HIGH-RISK Hero Alert Banner */
        <section className="glass-error rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pulse-border-threat">
          <div className="z-10 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="bg-red-600 text-white px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
                HIGH RISK THREAT
              </span>
              <span className="text-xs font-mono bg-red-950/60 px-3 py-1 rounded-full border border-red-500/40 text-red-300">
                VERDICT: FAKE CLONE
              </span>
            </div>
            
            <h2 className="text-5xl font-black text-red-500 uppercase tracking-tight font-display">
              FAKE
            </h2>
            
            <p className="text-sm text-slate-300 max-w-2xl font-medium">
              Neural acoustic feature extraction indicates synthetic voice reproduction and adversarial cloning signatures.
            </p>
          </div>

          {/* Right Gauge & Immediate Action CTA */}
          <div className="z-10 flex flex-col items-end gap-4 glass-card p-5 rounded-2xl shadow-xl w-full md:w-auto shrink-0 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-mono text-slate-400 uppercase">FRAUD PROBABILITY</p>
                <p className="text-3xl font-black text-white leading-none font-mono">
                  {result.risk_score}<span className="text-base text-slate-500 font-normal">/100</span>
                </p>
              </div>
              
              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-black/40 rounded-full shadow-inner p-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="45"
                    stroke="#ef4444"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-bold font-mono text-red-400">
                  {result.risk_score}
                </span>
              </div>
            </div>

            <button
              onClick={onReset}
              className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 squish-btn font-mono"
            >
              <Ban className="w-4 h-4" />
              {result.recommended_action === "BLOCK" ? "TERMINATE CALL IMMEDIATELY" : actionTheme.label}
            </button>
          </div>
        </section>
      ) : (
        /* Stitch LOW-RISK Hero Header */
        <section className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                LOW RISK &bull; AUTHENTIC
              </span>
              <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-full border border-white/10 text-slate-300">
                VERDICT: REAL
              </span>
            </div>

            <h2 className="text-5xl font-black text-emerald-400 uppercase tracking-tight font-display">
              REAL
            </h2>

            <p className="text-sm text-slate-300 font-medium max-w-2xl">
              Natural prosody, verified biometric voiceprint, and acoustic signatures correspond to legitimate human speech.
            </p>
          </div>

          {/* Right Gauge & Safe Action */}
          <div className="flex flex-col items-end gap-3 glass-card p-5 rounded-2xl shadow-xl w-full md:w-auto shrink-0 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-mono text-slate-400 uppercase">RISK SCORE</p>
                <p className="text-3xl font-black text-white leading-none font-mono">
                  {result.risk_score}<span className="text-base text-slate-500 font-normal">/100</span>
                </p>
              </div>

              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-black/40 rounded-full shadow-inner p-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="45"
                    stroke="#10b981"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-bold font-mono text-emerald-400">
                  {result.risk_score}
                </span>
              </div>
            </div>

            <div className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 font-mono">
              {actionTheme.label}
            </div>
          </div>
        </section>
      )}

      {/* 2. Detailed Technical Bento Grid (Spans 3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Neural Synthetic Probability */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Deepfake AI Probability</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Wav2Vec2</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-medium">Synthetic (AI) Confidence:</span>
              <span className={`font-mono font-bold ${isFake ? "text-red-400" : "text-slate-300"}`}>
                {fakePct}%
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${fakePct}%` }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${realPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Real Probability: <strong className="text-emerald-400">{realPct}%</strong></span>
              <span>Latency: <strong>{result.deepfake_detection.inference_time_ms}ms</strong></span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="truncate text-slate-300">Model: {result.deepfake_detection.model_id}</div>
            <div>Architecture: {result.deepfake_detection.model_type}</div>
          </div>
        </div>

        {/* Card 2: Biometric Speaker Match (ECAPA-TDNN) */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Fingerprint className="w-4 h-4 text-purple-400" />
              <span>Biometric Speaker Match</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">ECAPA-TDNN</span>
          </div>

          {result.speaker_verification.status === "EVALUATED" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Target Speaker:</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  {result.speaker_verification.speaker_id}
                </span>
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                result.speaker_verification.is_match
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}>
                <div className="flex items-center gap-2.5">
                  {result.speaker_verification.is_match ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">
                      {result.speaker_verification.is_match ? "Biometric Match" : "Speaker Mismatch"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Signal Flag (M): <span className="font-mono font-bold text-white">{result.speaker_verification.speaker_mismatch_flag}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${
                    result.speaker_verification.is_match ? "text-emerald-400" : "text-red-400"
                  }`}>
                    Sim: {result.speaker_verification.similarity_score}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Thresh: {result.speaker_verification.threshold}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex justify-between">
                <span>Vector: 192-D</span>
                <span>Latency: {result.speaker_verification.inference_time_ms}ms</span>
              </div>
            </div>
          ) : result.speaker_verification.status === "NOT_ENROLLED" ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Speaker Not Enrolled
              </div>
              <p className="text-[11px] text-slate-400">
                Speaker &lsquo;{result.speaker_verification.speaker_id}&rsquo; was not found in active profile store. Enroll reference audio in Speaker Profiles.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">
                Biometrics Skipped
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                No claimed speaker ID was supplied. Biometric voiceprint matching was bypassed.
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Acoustic Signal Telemetry */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Acoustic Signal Telemetry</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Phase 1 Preprocessed</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-slate-400 text-[11px] font-mono">Sample Rate</div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {result.audio_metadata.sample_rate} Hz
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-slate-400 text-[11px] font-mono">Duration (Proc / Orig)</div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {result.audio_metadata.processed_duration_sec}s / {result.audio_metadata.original_duration_sec}s
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-slate-400 text-[11px] font-mono">Estimated SNR</div>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                {result.audio_metadata.estimated_snr_db} dB
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <div className="text-slate-400 text-[11px] font-mono">RMS Energy</div>
              <div className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                {result.audio_metadata.rms_db} dB
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono truncate">
            Call Identifier: {result.call_id}
          </div>
        </div>

        {/* Card 4: Multilingual / Indian Speech Readiness Profile */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-indigo-500/20">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Multilingual Speech Profile</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Indian Multilingual
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                Active Language:
              </span>
              <span className="font-bold text-white">
                {result.speech_profile?.selected_language || result.speech_profile?.language || (result as any).context_intelligence?.selected_language || "Auto Detect (Multilingual)"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Regional Accent:
              </span>
              <span className="font-bold text-cyan-300">
                {result.speech_profile?.accent_region || (result as any).context_intelligence?.accent_region || "Pan-Indian / General Standard"}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-mono">
              {result.speech_profile?.note || "Acoustic deepfake features, prosody anomalies, and ECAPA-TDNN biometric verification operate invariants across Indian multilingual speech."}
            </p>
          </div>
        </div>

      </div>

      {/* 3. Explainable Flags Container */}
      <div id="explainable-flags-section" className="glass-card rounded-2xl p-5 space-y-3 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-400" />
            Explainable Risk Signals & Detection Flags ({result.flags.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">Multi-Signal Fusion</span>
        </div>

        {result.flags.length > 0 ? (
          <div className="space-y-2">
            {result.flags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 font-mono"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{flag}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-medium font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No suspicious fraud indicators, executive impersonation rules, or biometric mismatches triggered.</span>
          </div>
        )}
      </div>

      {/* 4. Secondary Verification Step-Up Protocol Panel */}
      <SecondaryVerificationPanel
        callId={result.call_id}
        initialSession={result.verification_session}
        recommendedAction={result.recommended_action}
        riskScore={result.risk_score}
        riskLevel={result.risk_level}
      />

      {/* 5. Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          id="btn-analyze-another"
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all squish-btn font-mono"
        >
          <RotateCcw className="w-4 h-4" />
          Analyze Another Audio Stream
        </button>

        <button
          id="btn-copy-json"
          onClick={copyJson}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-sm border border-white/10 squish-btn"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          {copied ? "Report Copied to Clipboard" : "Copy Raw JSON Report"}
        </button>
      </div>

    </div>
  );
};


