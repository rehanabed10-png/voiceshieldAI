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
  Lock
} from "lucide-react";
import { AnalyzeResponse } from "../types";

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
          border: "border-[#009668]/30",
          text: "text-[#009668]",
          label: "ALLOW (Safe to Proceed)",
        };
      case "WARN":
        return {
          bg: "bg-amber-600 text-white",
          border: "border-amber-500/40",
          text: "text-amber-600",
          label: "WARN (Caution Advised)",
        };
      case "SECONDARY_VERIFICATION":
        return {
          bg: "bg-rose-600 text-white",
          border: "border-rose-500/40",
          text: "text-rose-600",
          label: "SECONDARY VERIFICATION REQUIRED",
        };
      case "BLOCK":
        return {
          bg: "bg-[#ba1a1a] text-white",
          border: "border-[#ba1a1a]/50",
          text: "text-[#ba1a1a]",
          label: "TERMINATE CALL / BLOCK THREAT",
        };
      default:
        return {
          bg: "bg-slate-900 text-white",
          border: "border-slate-300",
          text: "text-slate-900",
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
        <section className="glass-error rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pulse-border-threat">
          <div className="z-10 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-[#ba1a1a] text-white px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
                HIGH RISK THREAT
              </span>
              <span className="text-xs font-mono bg-white/60 px-3 py-1 rounded-full border border-red-200 text-red-900">
                VERDICT: FAKE CLONE
              </span>
            </div>
            
            <h2 className="text-5xl font-black text-[#ba1a1a] uppercase tracking-tight">
              FAKE
            </h2>
            
            <p className="text-sm text-slate-700 max-w-2xl font-medium">
              Neural acoustic feature extraction indicates synthetic voice reproduction and adversarial cloning signatures.
            </p>
          </div>

          {/* Right Gauge & Immediate Action CTA */}
          <div className="z-10 flex flex-col items-end gap-4 glass-card p-5 rounded-2xl shadow-md w-full md:w-auto shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-mono text-slate-500 uppercase">FRAUD PROBABILITY</p>
                <p className="text-3xl font-black text-slate-900 leading-none">
                  {result.risk_score}<span className="text-base text-slate-400 font-normal">/100</span>
                </p>
              </div>
              
              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-white/40 rounded-full shadow-inner p-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(0,0,0,0.1)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="45"
                    stroke="#ba1a1a"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-bold font-mono text-[#ba1a1a]">
                  {result.risk_score}
                </span>
              </div>
            </div>

            <button
              onClick={onReset}
              className="w-full bg-[#ba1a1a] hover:bg-red-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95"
            >
              <Ban className="w-4 h-4" />
              {result.recommended_action === "BLOCK" ? "TERMINATE CALL IMMEDIATELY" : actionTheme.label}
            </button>
          </div>
        </section>
      ) : (
        /* Stitch LOW-RISK Hero Header */
        <section className="glass-panel rounded-2xl p-6 sm:p-8 shadow-lg border border-[#009668]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#009668]/10 text-[#009668] border border-[#009668]/30 px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                LOW RISK &bull; AUTHENTIC
              </span>
              <span className="text-xs font-mono bg-white/80 px-3 py-1 rounded-full border border-slate-200 text-slate-700">
                VERDICT: REAL
              </span>
            </div>

            <h2 className="text-5xl font-black text-[#009668] uppercase tracking-tight">
              REAL
            </h2>

            <p className="text-sm text-slate-600 font-medium max-w-2xl">
              Natural prosody, verified biometric voiceprint, and acoustic signatures correspond to legitimate human speech.
            </p>
          </div>

          {/* Right Gauge & Safe Action */}
          <div className="flex flex-col items-end gap-3 glass-panel-darker p-5 rounded-2xl shadow-sm w-full md:w-auto shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-mono text-slate-500 uppercase">RISK SCORE</p>
                <p className="text-3xl font-black text-slate-900 leading-none">
                  {result.risk_score}<span className="text-base text-slate-400 font-normal">/100</span>
                </p>
              </div>

              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-inner p-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="45"
                    stroke="#009668"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-bold font-mono text-[#009668]">
                  {result.risk_score}
                </span>
              </div>
            </div>

            <div className="px-4 py-1.5 rounded-lg bg-[#009668]/15 border border-[#009668]/30 text-xs font-bold text-[#009668]">
              {actionTheme.label}
            </div>
          </div>
        </section>
      )}

      {/* 2. Detailed Technical Bento Grid (Spans 3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Neural Synthetic Probability */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Deepfake AI Probability</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Wav2Vec2</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Synthetic (AI) Confidence:</span>
              <span className={`font-mono font-bold ${isFake ? "text-[#ba1a1a]" : "text-slate-700"}`}>
                {fakePct}%
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-[#ba1a1a] h-full transition-all duration-500"
                style={{ width: `${fakePct}%` }}
              />
              <div
                className="bg-[#009668] h-full transition-all duration-500"
                style={{ width: `${realPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Real Probability: <strong className="text-[#009668]">{realPct}%</strong></span>
              <span>Latency: <strong>{result.deepfake_detection.inference_time_ms}ms</strong></span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border border-slate-200/70 text-[11px] font-mono text-slate-600 space-y-1">
            <div className="truncate text-slate-800">Model: {result.deepfake_detection.model_id}</div>
            <div>Architecture: {result.deepfake_detection.model_type}</div>
          </div>
        </div>

        {/* Card 2: Biometric Speaker Match (ECAPA-TDNN) */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Fingerprint className="w-4 h-4 text-blue-600" />
              <span>Biometric Speaker Match</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">ECAPA-TDNN</span>
          </div>

          {result.speaker_verification.status === "EVALUATED" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Target Speaker Profile:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {result.speaker_verification.speaker_id}
                </span>
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                result.speaker_verification.is_match
                  ? "bg-emerald-50/80 border-emerald-200"
                  : "bg-red-50/80 border-red-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  {result.speaker_verification.is_match ? (
                    <CheckCircle2 className="w-5 h-5 text-[#009668]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#ba1a1a]" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {result.speaker_verification.is_match ? "Biometric Match" : "Speaker Mismatch"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Signal Flag (M): <span className="font-mono font-bold">{result.speaker_verification.speaker_mismatch_flag}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${
                    result.speaker_verification.is_match ? "text-[#009668]" : "text-[#ba1a1a]"
                  }`}>
                    Sim: {result.speaker_verification.similarity_score}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Thresh: {result.speaker_verification.threshold}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                <span>Vector: 192-D</span>
                <span>Latency: {result.speaker_verification.inference_time_ms}ms</span>
              </div>
            </div>
          ) : result.speaker_verification.status === "NOT_ENROLLED" ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Speaker Not Enrolled
              </div>
              <p className="text-[11px] text-slate-600">
                Speaker &lsquo;{result.speaker_verification.speaker_id}&rsquo; was not found in active profile store. Enroll reference audio in Speaker Profiles.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white/70 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">
                Biometrics Skipped
              </div>
              <p className="text-[11px] text-slate-500">
                No claimed speaker ID was supplied. Biometric voiceprint matching was bypassed.
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Acoustic Signal Telemetry */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Acoustic Signal Telemetry</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Phase 1 Preprocessed</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Sample Rate</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {result.audio_metadata.sample_rate} Hz
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Duration (Proc / Orig)</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {result.audio_metadata.processed_duration_sec}s / {result.audio_metadata.original_duration_sec}s
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Estimated SNR</div>
              <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                {result.audio_metadata.estimated_snr_db} dB
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200">
              <div className="text-slate-500 text-[11px]">RMS Energy</div>
              <div className="text-sm font-mono font-bold text-slate-700 mt-0.5">
                {result.audio_metadata.rms_db} dB
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono truncate">
            Call Identifier: {result.call_id}
          </div>
        </div>

      </div>

      {/* 3. Explainable Flags Container */}
      <div id="explainable-flags-section" className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600" />
            Explainable Risk Signals & Detection Flags ({result.flags.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Multi-Signal Fusion</span>
        </div>

        {result.flags.length > 0 ? (
          <div className="space-y-2">
            {result.flags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-900"
              >
                <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{flag}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#009668] shrink-0" />
            <span>No suspicious fraud indicators, executive impersonation rules, or biometric mismatches triggered.</span>
          </div>
        )}
      </div>

      {/* 4. Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          id="btn-analyze-another"
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Analyze Another Audio Stream
        </button>

        <button
          id="btn-copy-json"
          onClick={copyJson}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-card hover:bg-white text-slate-700 font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          {copied ? "Report Copied to Clipboard" : "Copy Raw JSON Report"}
        </button>
      </div>

    </div>
  );
};

