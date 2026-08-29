import React from "react";
import { Loader2, AudioWaveform, Cpu, Fingerprint, ShieldAlert, CheckCircle2 } from "lucide-react";

interface ProcessingViewProps {
  currentStage?: number;
}

export const ProcessingView: React.FC<ProcessingViewProps> = () => {
  const stages = [
    {
      title: "Audio Preprocessing & Signal Normalization",
      desc: "Resampling to 16 kHz Mono, silence removal (< -45 dB), and signal-to-noise ratio (SNR) calculation.",
      icon: AudioWaveform,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      title: "Deepfake Feature Extraction",
      desc: "Transformer acoustic feature analysis (Wav2Vec2) computing synthetic artifact likelihood (P_fake).",
      icon: Cpu,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Biometric Speaker Verification",
      desc: "192-D ECAPA-TDNN neural embedding extraction and cosine similarity verification against voice profile.",
      icon: Fingerprint,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
    },
    {
      title: "Multi-Signal Risk Fusion Engine",
      desc: "Mathematical risk scoring fusion (w1*P_fake + w2*M + w3*A + w4*C) and deterministic context rules evaluation.",
      icon: ShieldAlert,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
  ];

  return (
    <div id="processing-view-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      
      {/* Header with spinner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              VoiceShield Pipeline Active
            </h3>
            <p className="text-xs text-slate-400">
              Executing multi-signal neural inference on uploaded audio payload...
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 self-start sm:self-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Inference In Progress</span>
        </div>
      </div>

      {/* 4 Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5"
            >
              <div className={`w-9 h-9 rounded-lg ${stage.bgColor} border ${stage.borderColor} flex items-center justify-center ${stage.color} shrink-0 mt-0.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">
                    STAGE 0{idx + 1}
                  </span>
                  <h4 className="text-xs font-semibold text-slate-200">
                    {stage.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy Notice Footer */}
      <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Zero Raw Audio Retention: Temporary payloads are pruned immediately following vector extraction.
        </span>
        <span className="font-mono">16kHz &bull; FP16 / Batch Size = 1</span>
      </div>

    </div>
  );
};
