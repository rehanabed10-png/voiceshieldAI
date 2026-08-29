import React from "react";
import { AlertOctagon, RotateCcw, HelpCircle } from "lucide-react";

interface ErrorAlertProps {
  error: {
    message: string;
    error_type?: string;
    status?: number;
  };
  onReset: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onReset }) => {
  const getHelpTip = (errorType?: string) => {
    switch (errorType) {
      case "AudioTooShortError":
        return "The uploaded recording is shorter than 0.5 seconds. Minimum duration of 0.5s–30.0s is required for reliable feature extraction.";
      case "AudioSilentError":
        return "The audio file was detected as pure silence or very low background noise (< -45 dB energy). Please upload audio with audible speech.";
      case "AudioCorruptError":
      case "UnsupportedFormatError":
        return "The file header is corrupted or in an unsupported format. Please upload standard PCM WAV, FLAC, or MP3 files.";
      case "AudioTooLongError":
        return "The recording exceeds the maximum allowable duration of 30.0 seconds.";
      case "SpeakerNotEnrolledError":
        return "The claimed speaker ID does not exist in the active profile registry. Please enroll reference audio in the Speaker Profiles tab first.";
      default:
        return "Verify that the audio file is valid, has audible speech, and meets preprocessing constraints (0.5s–30.0s, 16kHz mono).";
    }
  };

  return (
    <div id="analysis-error-card" className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-lg shadow-rose-950/20">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              {error.error_type || "ANALYSIS FAILED"}
            </span>
            {error.status && (
              <span className="text-[11px] font-mono text-slate-400">
                HTTP {error.status}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-white">
            Audio Processing Error
          </h3>
          <p className="text-xs text-rose-200 leading-relaxed font-mono bg-rose-950/50 p-3 rounded-lg border border-rose-800/40">
            {error.message}
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-slate-200">Resolution Tip:</div>
          <div className="text-slate-400 mt-0.5 text-[11px]">
            {getHelpTip(error.error_type)}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          id="btn-error-retry"
          onClick={onReset}
          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Another File / Re-upload
        </button>
      </div>
    </div>
  );
};
