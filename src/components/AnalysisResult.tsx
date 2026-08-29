import React from "react";
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
  Volume2,
  FileCheck,
  Info,
} from "lucide-react";
import { AnalyzeResponse } from "../types";

interface AnalysisResultProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const [copied, setCopied] = React.useState(false);

  const isFake = result.deepfake_detection.prediction === "FAKE";
  const isHighRisk = result.risk_level === "HIGH" || result.risk_level === "CRITICAL" || result.risk_score >= 60;
  const isLowRisk = result.risk_level === "LOW" && result.risk_score < 40;

  const fakePct = (result.deepfake_detection.fake_probability * 100).toFixed(1);
  const realPct = (result.deepfake_detection.real_probability * 100).toFixed(1);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Action badge color
  const getActionBadge = (action: string) => {
    switch (action) {
      case "ALLOW":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          label: "ALLOW (Safe to Proceed)",
        };
      case "WARN":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          label: "WARN (Caution Advised)",
        };
      case "SECONDARY_VERIFICATION":
        return {
          bg: "bg-rose-500/15 text-rose-400 border-rose-500/40",
          label: "SECONDARY VERIFICATION REQUIRED",
        };
      case "BLOCK":
        return {
          bg: "bg-red-500/20 text-red-400 border-red-500/50",
          label: "BLOCK (Immediate Threat)",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          label: action,
        };
    }
  };

  const actionBadge = getActionBadge(result.recommended_action);

  return (
    <div id="analysis-result-container" className="space-y-6">
      
      {/* 1. Main Assessment Banner */}
      <div
        id="result-main-banner"
        className={`rounded-2xl p-6 border transition-all ${
          isHighRisk
            ? "bg-rose-950/40 border-rose-500/40 shadow-xl shadow-rose-950/30"
            : isLowRisk
            ? "bg-emerald-950/30 border-emerald-500/40 shadow-xl shadow-emerald-950/20"
            : "bg-amber-950/30 border-amber-500/40 shadow-xl shadow-amber-950/20"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          {/* Left: Verdict Status */}
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isHighRisk
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                  : isLowRisk
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-400"
              }`}
            >
              {isHighRisk ? (
                <ShieldAlert className="w-8 h-8" />
              ) : isLowRisk ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  id="verdict-prediction-pill"
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                    isFake
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  PREDICTION: {result.deepfake_detection.prediction}
                </span>

                <span
                  id="risk-level-pill"
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase font-mono border ${
                    isHighRisk
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : isLowRisk
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  }`}
                >
                  RISK LEVEL: {result.risk_level}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isHighRisk
                  ? "High Fraud / Voice-Cloning Threat Detected"
                  : isLowRisk
                  ? "Authentic Human Voice / Low Security Risk"
                  : "Elevated Security Suspicion"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300">
                {isHighRisk
                  ? "Multiple compounding signals indicate synthetic voice reproduction or impersonation attempt."
                  : isLowRisk
                  ? "Acoustic features and biometric profile correspond to legitimate authentic speech."
                  : "Potential anomalies detected. Review flags and biometric match before approving."}
              </p>
            </div>
          </div>

          {/* Right: Risk Score Gauge & Action */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/80">
            <div className="text-left md:text-right">
              <div className="text-[11px] font-mono text-slate-400 uppercase">
                Composite Risk Score
              </div>
              <div className="flex items-baseline gap-1 md:justify-end">
                <span
                  id="metric-risk-score"
                  className={`text-4xl font-extrabold font-mono tracking-tight ${
                    isHighRisk
                      ? "text-rose-400"
                      : isLowRisk
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {result.risk_score}
                </span>
                <span className="text-slate-500 font-mono text-sm">/ 100</span>
              </div>
            </div>

            <div
              id="recommended-action-badge"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${actionBadge.bg}`}
            >
              {actionBadge.label}
            </div>
          </div>

        </div>
      </div>

      {/* 2. Detailed Technical Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card A: Deepfake Detection Probabilities */}
        <div id="card-deepfake-metrics" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Deepfake Transformer Analysis</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Wav2Vec2</span>
          </div>

          {/* Probability Comparison Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Fake (Synthetic AI) Probability:</span>
              <span className="font-mono font-bold text-rose-400">{fakePct}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${fakePct}%` }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${realPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Real Probability: <strong className="text-emerald-400 font-mono">{realPct}%</strong></span>
              <span>Inference: <strong className="font-mono">{result.deepfake_detection.inference_time_ms} ms</strong></span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 text-[11px] text-slate-400 font-mono space-y-1">
            <div className="text-slate-300 truncate">Model: {result.deepfake_detection.model_id}</div>
            <div>Architecture: {result.deepfake_detection.model_type}</div>
          </div>
        </div>

        {/* Card B: Speaker Verification (Phase 5 Biometrics) */}
        <div id="card-speaker-verification" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              <span>Biometric Speaker Match</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">ECAPA-TDNN</span>
          </div>

          {result.speaker_verification.status === "EVALUATED" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Claimed Speaker ID:</span>
                <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                  {result.speaker_verification.speaker_id}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  {result.speaker_verification.is_match ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {result.speaker_verification.is_match ? "Biometric Match" : "Biometric Mismatch"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Signal Flag (M): <span className="font-mono">{result.speaker_verification.speaker_mismatch_flag}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    Sim: {result.speaker_verification.similarity_score}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Thresh: {result.speaker_verification.threshold}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Vector Dimension: 192-D</span>
                <span>Latency: {result.speaker_verification.inference_time_ms} ms</span>
              </div>
            </div>
          ) : result.speaker_verification.status === "NOT_ENROLLED" ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Speaker Not Enrolled
              </div>
              <p className="text-[11px] text-slate-300">
                Speaker ID &lsquo;{result.speaker_verification.speaker_id}&rsquo; was not found in the active biometric store. Enroll reference audio first in the Speaker Profiles tab.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="font-medium text-slate-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                No Speaker ID Provided
              </div>
              <p className="text-[11px] text-slate-500">
                Biometric verification was skipped. Supply a claimed speaker ID during analysis to verify voiceprints against enrolled profiles.
              </p>
            </div>
          )}
        </div>

        {/* Card C: Acoustic & Signal Telemetry */}
        <div id="card-audio-telemetry" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Acoustic Signal Telemetry</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Phase 1 Preprocessed</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
              <div className="text-slate-400 text-[11px]">Sample Rate</div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {result.audio_metadata.sample_rate} Hz
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
              <div className="text-slate-400 text-[11px]">Duration (Proc / Orig)</div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {result.audio_metadata.processed_duration_sec}s / {result.audio_metadata.original_duration_sec}s
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
              <div className="text-slate-400 text-[11px]">Estimated SNR</div>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                {result.audio_metadata.estimated_snr_db} dB
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
              <div className="text-slate-400 text-[11px]">RMS Energy</div>
              <div className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                {result.audio_metadata.rms_db} dB
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono truncate">
            Call Identifier: {result.call_id}
          </div>
        </div>

      </div>

      {/* 3. Explainable Backend Flags Container */}
      <div id="explainable-flags-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            Explainable Risk Signals & Detection Flags ({result.flags.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Multi-Signal Fusion</span>
        </div>

        {result.flags.length > 0 ? (
          <div className="space-y-2">
            {result.flags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{flag}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No suspicious fraud indicators, executive impersonation rules, or biometric mismatches triggered.</span>
          </div>
        )}
      </div>

      {/* 4. Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          id="btn-analyze-another"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Analyze Another Audio Stream
        </button>

        <button
          id="btn-copy-json"
          onClick={copyJson}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center gap-2 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          {copied ? "Report Copied to Clipboard" : "Copy Raw JSON Report"}
        </button>
      </div>

    </div>
  );
};
