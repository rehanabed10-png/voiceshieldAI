/**
 * True Live Microphone & Real-Time Voice Analysis Dashboard.
 * 
 * Features:
 * 1. True Live Microphone Analysis over WebSocket (/ws/live-stream):
 *    Captures browser microphone via getUserMedia(), resamples to 16 kHz mono PCM16,
 *    and streams raw audio packets to backend persistent inference worker with rolling 1.5–2s evaluation windows.
 * 2. Prerecorded File Simulation: Slices file into sequential ~4s windows.
 * 3. Real-time multi-signal telemetry (Wav2Vec2 deepfake classification, ProsodyAnalyzer acoustic anomaly,
 *    ECAPA-TDNN biometric verification, VoiceShieldRiskEngine fusion, and explainable flags).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  Square,
  Radio,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Cpu,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileAudio,
  Upload,
  RefreshCw,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  Sliders,
  Volume2,
  Gauge,
} from "lucide-react";
import {
  AnalyzeResponse,
  CallContextState,
  EnrolledSpeaker,
  LiveAnalysisMode,
  LiveChunkResult,
  LiveSessionStatus,
  LiveStreamAnalysisResult,
  SampleAudio,
} from "../types";
import { sliceAudioIntoWindows } from "../utils/audioChunker";
import { analyzeAudio } from "../api";
import { MicrophoneStreamer } from "../utils/microphoneStreamer";

interface LiveAnalysisViewProps {
  speakers: EnrolledSpeaker[];
  samples: SampleAudio[];
  context: CallContextState;
  onContextChange: (newCtx: Partial<CallContextState>) => void;
}

export const LiveAnalysisView: React.FC<LiveAnalysisViewProps> = ({
  speakers,
  samples,
  context,
  onContextChange,
}) => {
  // Mode Selector: "microphone" (True Live Stream) vs "simulation" (Audio File Slicing)
  const [activeMode, setActiveMode] = useState<LiveAnalysisMode>("microphone");

  // Audio Input State (Simulation Mode)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleName, setSelectedSampleName] = useState<string>("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Session State
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [chunks, setChunks] = useState<Array<{ index: number; startTimeSec: number; endTimeSec: number; blob: Blob; filename: string }>>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);
  
  // Historical Analysis Results
  const [streamResults, setStreamResults] = useState<LiveStreamAnalysisResult[]>([]);
  const [liveFileResults, setLiveFileResults] = useState<LiveChunkResult[]>([]);
  const [selectedInspectWindow, setSelectedInspectWindow] = useState<LiveStreamAnalysisResult | null>(null);
  const [selectedInspectChunk, setSelectedInspectChunk] = useState<LiveChunkResult | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Live Microphone Audio Level Meter
  const [micVolumeDb, setMicVolumeDb] = useState<number>(-100);
  const [micPeak, setMicPeak] = useState<number>(0);
  const micStreamerRef = useRef<MicrophoneStreamer | null>(null);

  // Audio Playback during simulation
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Control Refs to manage async loop interruption
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamerRef.current) {
        micStreamerRef.current.stop();
      }
    };
  }, []);

  // Update streamer context if speaker or context changes during live mic session
  useEffect(() => {
    if (micStreamerRef.current && sessionStatus === "listening") {
      micStreamerRef.current.updateContext(
        context,
        context.speaker_id || undefined,
        context.verification_threshold
      );
    }
  }, [context, sessionStatus]);

  // Create Object URL for file preview
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [selectedFile]);

  // ----------------------------------------------------
  // TRUE LIVE MICROPHONE STREAMING LOGIC
  // ----------------------------------------------------
  const handleStartMicrophoneStream = async () => {
    setSessionError(null);
    setStreamResults([]);
    setSelectedInspectWindow(null);

    const streamer = new MicrophoneStreamer({
      speakerId: context.speaker_id || undefined,
      threshold: context.verification_threshold,
      context: context,
      windowDurationSec: 1.5,
      onResult: (result: LiveStreamAnalysisResult) => {
        setStreamResults((prev) => {
          const updated = [...prev, result];
          // Keep most recent 50 windows for memory
          if (updated.length > 50) return updated.slice(updated.length - 50);
          return updated;
        });
        setSelectedInspectWindow(result);
      },
      onVolume: (rmsDb: number, peak: number) => {
        setMicVolumeDb(rmsDb);
        setMicPeak(peak);
      },
      onStatusChange: (status, message) => {
        if (status === "connecting") {
          setSessionStatus("chunking");
          if (message) setStatusMessage(message);
        } else if (status === "listening") {
          setSessionStatus("listening");
          if (message) setStatusMessage(message);
        } else if (status === "closed") {
          setSessionStatus("idle");
          setMicVolumeDb(-100);
          setMicPeak(0);
          if (message) setStatusMessage(message);
        } else if (status === "error") {
          setSessionStatus("error");
          setSessionError(message || "Microphone stream failed.");
          setMicVolumeDb(-100);
          setMicPeak(0);
        }
      },
    });

    micStreamerRef.current = streamer;

    try {
      await streamer.start();
    } catch (err: any) {
      setSessionError(err.message || "Failed to access microphone.");
      setSessionStatus("error");
    }
  };

  const handleStopMicrophoneStream = () => {
    if (micStreamerRef.current) {
      micStreamerRef.current.stop();
      micStreamerRef.current = null;
    }
    setSessionStatus("completed");
    setMicVolumeDb(-100);
    setMicPeak(0);
  };

  // ----------------------------------------------------
  // PRERECORDED FILE SIMULATION LOGIC
  // ----------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedSampleName("");
      resetFileSession();
    }
  };

  const handleSelectSample = async (sample: SampleAudio) => {
    try {
      setIsLoadingSample(true);
      setSelectedSampleName(sample.filename);
      resetFileSession();

      const res = await fetch(sample.url);
      if (!res.ok) throw new Error(`Failed to load sample: ${res.statusText}`);
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: "audio/wav" });
      setSelectedFile(file);
    } catch (err: any) {
      setSessionError(`Could not load test sample: ${err.message}`);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const resetFileSession = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setSessionStatus("idle");
    setChunks([]);
    setCurrentChunkIndex(-1);
    setLiveFileResults([]);
    setSelectedInspectChunk(null);
    setSessionError(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
  };

  const handleStartSimulation = async () => {
    if (!selectedFile) {
      setSessionError("Please select or upload an audio file first.");
      return;
    }

    resetFileSession();
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setSessionError(null);
    setSessionStatus("chunking");

    try {
      const chunkWindows = await sliceAudioIntoWindows(selectedFile, 4.0, 1.0);
      if (chunkWindows.length === 0) {
        throw new Error("Audio is too short or contains no decodable audio frames.");
      }

      setChunks(chunkWindows);
      setSessionStatus("streaming");

      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
      }

      const resultsAccumulator: LiveChunkResult[] = [];

      for (let i = 0; i < chunkWindows.length; i++) {
        if (isCancelledRef.current) break;

        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (isCancelledRef.current) break;

        const currentWindow = chunkWindows[i];
        setCurrentChunkIndex(i);

        const chunkFile = new File([currentWindow.blob], currentWindow.filename, { type: "audio/wav" });
        const startTime = performance.now();

        const response: AnalyzeResponse = await analyzeAudio(chunkFile, currentWindow.filename, {
          speaker_id: context.speaker_id || undefined,
          verification_threshold: context.verification_threshold,
          caller_id: context.caller_id,
          is_caller_recognized: context.is_caller_recognized,
          is_previously_flagged: context.is_previously_flagged,
          claimed_role: context.claimed_role,
          requested_transaction_amount: context.requested_transaction_amount,
          normal_transaction_amount: context.normal_transaction_amount,
          is_urgent: context.is_urgent,
          urgency_reason: context.urgency_reason,
          transcript_text: context.transcript_text,
        });

        const latencyMs = performance.now() - startTime;

        const chunkResult: LiveChunkResult = {
          chunkIndex: i,
          totalChunks: chunkWindows.length,
          startTimeSec: currentWindow.startTimeSec,
          endTimeSec: currentWindow.endTimeSec,
          durationSec: Number((currentWindow.endTimeSec - currentWindow.startTimeSec).toFixed(2)),
          processingLatencyMs: Math.round(latencyMs),
          response,
          timestamp: Date.now(),
        };

        resultsAccumulator.push(chunkResult);
        setLiveFileResults([...resultsAccumulator]);
        setSelectedInspectChunk(chunkResult);
      }

      if (!isCancelledRef.current) {
        setSessionStatus("completed");
        setCurrentChunkIndex(-1);
      }
    } catch (err: any) {
      setSessionError(err.message || "Live analysis stream failed.");
      setSessionStatus("error");
    } finally {
      setIsAudioPlaying(false);
    }
  };

  const handlePauseResumeSimulation = () => {
    if (sessionStatus === "streaming") {
      isPausedRef.current = true;
      setSessionStatus("paused");
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsAudioPlaying(false);
    } else if (sessionStatus === "paused") {
      isPausedRef.current = false;
      setSessionStatus("streaming");
      if (audioPlayerRef.current) audioPlayerRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  };

  const handleStopSimulation = () => {
    isCancelledRef.current = true;
    setSessionStatus("completed");
    setCurrentChunkIndex(-1);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsAudioPlaying(false);
  };

  // Latest active result for live metrics display
  const latestMicResult = streamResults.length > 0 ? streamResults[streamResults.length - 1] : null;
  const latestFileResult = liveFileResults.length > 0 ? liveFileResults[liveFileResults.length - 1] : null;
  
  const isMicMode = activeMode === "microphone";
  const activeWindowInspect = selectedInspectWindow || latestMicResult;

  // Max Risk across call
  const maxMicRisk = streamResults.length > 0 ? Math.max(...streamResults.map((r) => r.risk_score)) : 0;
  const avgMicFakeProb =
    streamResults.length > 0
      ? streamResults.reduce((acc, r) => acc + r.fake_probability, 0) / streamResults.length
      : 0;

  return (
    <div id="live-analysis-container" className="space-y-6">
      
      {/* Top Banner: Mode Switcher & Stream Status */}
      <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-sm">
            {isMicMode ? <Mic className="w-5 h-5 animate-pulse text-blue-600" /> : <Radio className="w-5 h-5 animate-pulse text-blue-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                {isMicMode ? "True Live Microphone Analysis" : "Simulated Audio Slicing Stream"}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {isMicMode ? "WebSocket /ws/live-stream (16kHz PCM16)" : "Sequential ~4.0s Windows"}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Wav2Vec2 + Prosody + ECAPA
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              {isMicMode
                ? "Captures live browser microphone audio, converts to 16 kHz PCM16 mono chunks, and streams to the persistent inference daemon over WebSockets with zero model re-loading."
                : "Slices audio file into sequential 4-second evaluation windows and tracks deepfake, acoustic prosody anomaly, and biometric verification telemetry."}
            </p>
          </div>
        </div>

        {/* Mode Selector Pill & Global Stream Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner">
            <button
              onClick={() => {
                if (sessionStatus === "listening") handleStopMicrophoneStream();
                if (sessionStatus === "streaming") handleStopSimulation();
                setActiveMode("microphone");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isMicMode
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Live Microphone
            </button>
            <button
              onClick={() => {
                if (sessionStatus === "listening") handleStopMicrophoneStream();
                if (sessionStatus === "streaming") handleStopSimulation();
                setActiveMode("simulation");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isMicMode
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileAudio className="w-3.5 h-3.5" />
              File Slicing
            </button>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border shadow-sm ${
              sessionStatus === "listening" || sessionStatus === "streaming"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : sessionStatus === "chunking"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : sessionStatus === "paused"
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : sessionStatus === "completed"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                sessionStatus === "listening" || sessionStatus === "streaming"
                  ? "bg-emerald-500 animate-ping"
                  : sessionStatus === "chunking"
                  ? "bg-amber-500 animate-pulse"
                  : sessionStatus === "completed"
                  ? "bg-blue-500"
                  : "bg-slate-400"
              }`}
            />
            {sessionStatus === "idle" && "READY"}
            {sessionStatus === "chunking" && (isMicMode ? "CONNECTING WS..." : "SLICING AUDIO...")}
            {sessionStatus === "listening" && `LIVE MIC STREAMING (${streamResults.length} Windows)`}
            {sessionStatus === "streaming" && `STREAMING CHUNK ${currentChunkIndex + 1}/${chunks.length}`}
            {sessionStatus === "paused" && "STREAM PAUSED"}
            {sessionStatus === "completed" && "SESSION COMPLETED"}
            {sessionStatus === "error" && "STREAM ERROR"}
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel & Live Telemetry Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Live Controls & Inputs */}
        <div className="glass-card rounded-2xl p-6 space-y-5 shadow-lg border border-white/80">
          
          {isMicMode ? (
            /* Microphone Stream Setup */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Microphone Stream</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 font-bold">16kHz Mono PCM16</span>
              </div>

              {/* Live VU / Audio Level Meter */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    Microphone Input Level
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {sessionStatus === "listening" ? `${Math.round(micVolumeDb)} dB` : "MUTED"}
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center p-0.5 border border-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${sessionStatus === "listening" ? Math.min(100, Math.max(5, (micPeak * 120))) : 0}%`,
                      backgroundColor:
                        micPeak > 0.85
                          ? "#ef4444"
                          : micPeak > 0.4
                          ? "#f59e0b"
                          : "#10b981",
                    }}
                  />
                </div>

                <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                  <span>-60 dB</span>
                  <span>-30 dB</span>
                  <span>-12 dB</span>
                  <span>0 dB</span>
                </div>
              </div>

              {/* Claimed Speaker Biometrics */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                    Claimed Speaker (Biometric Verification):
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ECAPA-TDNN</span>
                </label>
                <select
                  value={context.speaker_id}
                  onChange={(e) => onContextChange({ speaker_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  <option value="">-- No Speaker Claimed (Detection Only) --</option>
                  {speakers.map((spk) => (
                    <option key={spk.speaker_id} value={spk.speaker_id}>
                      {spk.speaker_id} {spk.speaker_name ? `— ${spk.speaker_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Streaming Controls */}
              <div className="pt-2 space-y-2">
                {sessionStatus !== "listening" ? (
                  <button
                    id="btn-start-mic-stream"
                    onClick={handleStartMicrophoneStream}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                  >
                    <Mic className="w-4 h-4" />
                    Start Live Microphone Analysis
                  </button>
                ) : (
                  <button
                    id="btn-stop-mic-stream"
                    onClick={handleStopMicrophoneStream}
                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop Live Analysis Stream
                  </button>
                )}

                {sessionError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{sessionError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Simulation File Setup */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Audio File Stream</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">16kHz PCM</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.flac"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-white/50 hover:bg-white/90 shadow-inner space-y-2"
                >
                  <Upload className="w-6 h-6 text-blue-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">Select Audio File for Stream</div>
                  <div className="text-[11px] text-slate-500">WAV, FLAC, MP3 (Will slice into ~4s windows)</div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileAudio className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sessionStatus === "streaming" || sessionStatus === "chunking"}
                      className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded hover:bg-slate-100"
                    >
                      Change
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Size: {(selectedFile.size / 1024).toFixed(1)} KB</span>
                    {chunks.length > 0 && <span>{chunks.length} Windows Prepared</span>}
                  </div>
                </div>
              )}

              {/* Sample Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Or Pick Pre-loaded Test Sample:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {samples.slice(0, 3).map((s) => (
                    <button
                      key={s.filename}
                      onClick={() => handleSelectSample(s)}
                      disabled={isLoadingSample || sessionStatus === "streaming" || sessionStatus === "chunking"}
                      className={`text-left px-3 py-2 rounded-xl text-xs border transition-all flex items-center justify-between ${
                        selectedSampleName === s.filename
                          ? "bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-sm"
                          : "bg-white/60 hover:bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="truncate">{s.filename}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">WAV</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Claimed Speaker */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                    Claimed Enrolled Speaker Profile:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ECAPA-TDNN</span>
                </label>
                <select
                  value={context.speaker_id}
                  onChange={(e) => onContextChange({ speaker_id: e.target.value })}
                  disabled={sessionStatus === "streaming" || sessionStatus === "chunking"}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  <option value="">-- No Speaker Claimed (Detection Only) --</option>
                  {speakers.map((spk) => (
                    <option key={spk.speaker_id} value={spk.speaker_id}>
                      {spk.speaker_id} {spk.speaker_name ? `— ${spk.speaker_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Simulation Controls */}
              <div className="pt-2 space-y-2">
                {sessionStatus === "idle" || sessionStatus === "completed" || sessionStatus === "error" ? (
                  <button
                    id="btn-start-live-sim"
                    onClick={handleStartSimulation}
                    disabled={!selectedFile || isLoadingSample}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Simulation Stream
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handlePauseResumeSimulation}
                      className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {sessionStatus === "paused" ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                      {sessionStatus === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={handleStopSimulation}
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  </div>
                )}

                {sessionError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{sessionError}</span>
                  </div>
                )}
              </div>

              {audioUrl && (
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsAudioPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
          )}
        </div>

        {/* Col 2 & 3: Live Telemetry Gauges & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Metric Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Metric 1: Deepfake Probability */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Deepfake Probability
                </span>
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {isMicMode
                    ? latestMicResult
                      ? `${(latestMicResult.fake_probability * 100).toFixed(1)}%`
                      : "—"
                    : latestFileResult
                    ? `${(latestFileResult.response.deepfake_detection.fake_probability * 100).toFixed(1)}%`
                    : "—"}
                </span>
                {(isMicMode ? latestMicResult : latestFileResult) && (
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      (isMicMode ? latestMicResult?.fake_probability : latestFileResult?.response.deepfake_detection.fake_probability)! > 0.5
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {(isMicMode ? latestMicResult?.fake_probability : latestFileResult?.response.deepfake_detection.fake_probability)! > 0.5
                      ? "FAKE"
                      : "REAL"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {isMicMode
                  ? latestMicResult
                    ? `Measured Latency: ${latestMicResult.server_latency_ms} ms`
                    : "Awaiting live mic windows"
                  : latestFileResult
                  ? `Inference: ${latestFileResult.processingLatencyMs} ms`
                  : "Awaiting active chunk stream"}
              </div>
            </div>

            {/* Metric 2: Biometric Verification / Acoustic Anomaly */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {context.speaker_id ? "Biometric Match" : "Acoustic Anomaly"}
                </span>
                {context.speaker_id ? <Fingerprint className="w-4 h-4 text-blue-600" /> : <Gauge className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex items-baseline gap-2">
                {isMicMode ? (
                  latestMicResult && latestMicResult.speaker_verification?.similarity_score !== null && latestMicResult.speaker_verification?.similarity_score !== undefined ? (
                    <>
                      <span className="text-3xl font-extrabold text-slate-900 font-mono">
                        {(latestMicResult.speaker_verification.similarity_score * 100).toFixed(0)}%
                      </span>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          latestMicResult.speaker_verification.is_match
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {latestMicResult.speaker_verification.is_match ? "MATCH" : "MISMATCH"}
                      </span>
                    </>
                  ) : latestMicResult ? (
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {(latestMicResult.acoustic_anomaly * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xl font-bold text-slate-400">Standby</span>
                  )
                ) : latestFileResult && latestFileResult.response.speaker_verification?.similarity_score !== undefined ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {(latestFileResult.response.speaker_verification.similarity_score! * 100).toFixed(0)}%
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        latestFileResult.response.speaker_verification.is_match
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {latestFileResult.response.speaker_verification.is_match ? "MATCH" : "MISMATCH"}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-slate-400">Standby</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {context.speaker_id
                  ? `Threshold τ: ${context.verification_threshold.toFixed(2)}`
                  : "Prosody jitter/shimmer/F0"}
              </div>
            </div>

            {/* Metric 3: Live Composite Risk Score */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Risk Score
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {isMicMode
                    ? latestMicResult ? latestMicResult.risk_score : "—"
                    : latestFileResult ? latestFileResult.response.risk_score : "—"}
                </span>
                {(isMicMode ? latestMicResult : latestFileResult) && (
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      (isMicMode ? latestMicResult?.risk_level : latestFileResult?.response.risk_level) === "HIGH" ||
                      (isMicMode ? latestMicResult?.risk_level : latestFileResult?.response.risk_level) === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : (isMicMode ? latestMicResult?.risk_level : latestFileResult?.response.risk_level) === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isMicMode ? latestMicResult?.risk_level : latestFileResult?.response.risk_level}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {isMicMode
                  ? latestMicResult
                    ? `Action: ${latestMicResult.recommended_action}`
                    : "0–100 Multi-Signal Fusion"
                  : latestFileResult
                  ? `Action: ${latestFileResult.response.recommended_action}`
                  : "0–100 Multi-Signal Fusion"}
              </div>
            </div>
          </div>

          {/* Real-time Timeline Visualization Ribbon */}
          <div className="glass-card rounded-2xl p-6 space-y-4 shadow-lg border border-white/80">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isMicMode ? "Live Stream Rolling Windows Timeline" : "Call Analysis Slicing Timeline"}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                <span>Max Risk: <strong className="text-slate-900">{isMicMode ? maxMicRisk : 0}</strong></span>
                <span>Avg Fake Prob: <strong className="text-slate-900">{(avgMicFakeProb * 100).toFixed(1)}%</strong></span>
              </div>
            </div>

            {isMicMode ? (
              /* Microphone Rolling Window History */
              streamResults.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                  <Mic className="w-8 h-8 text-slate-400 mx-auto animate-bounce" />
                  <div className="text-sm font-bold text-slate-800">Live Microphone Stream Ready</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click "Start Live Microphone Analysis" to begin streaming 16kHz audio. Continuous evaluation windows will appear here with measured latency and real-time risk scores.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rolling Window Bubbles */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {streamResults.map((win, idx) => {
                      const isSelected = activeWindowInspect?.window_index === win.window_index;
                      let bgClass = "bg-emerald-500 text-white";
                      if (win.risk_level === "HIGH" || win.risk_level === "CRITICAL") {
                        bgClass = "bg-red-500 text-white";
                      } else if (win.risk_level === "MEDIUM") {
                        bgClass = "bg-amber-500 text-slate-950";
                      }

                      return (
                        <button
                          key={win.window_index}
                          onClick={() => setSelectedInspectWindow(win)}
                          className={`min-w-[48px] h-11 rounded-xl flex flex-col items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-all ${bgClass} ${
                            isSelected ? "ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-md" : "opacity-90 hover:opacity-100"
                          }`}
                        >
                          <span>#{win.window_index}</span>
                          <span className="text-[8px] opacity-80">{win.risk_score}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SVG Risk Progression Chart */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Live Multi-Signal Progression</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Risk Score</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Fake Prob %</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Acoustic Anomaly %</span>
                      </div>
                    </div>

                    <div className="h-28 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${Math.max(streamResults.length - 1, 1) * 100} 100`} preserveAspectRatio="none">
                        <line x1="0" y1="25" x2="10000" y2="25" stroke="#e2e8f0" strokeDasharray="2,2" />
                        <line x1="0" y1="50" x2="10000" y2="50" stroke="#e2e8f0" strokeDasharray="2,2" />
                        <line x1="0" y1="75" x2="10000" y2="75" stroke="#e2e8f0" strokeDasharray="2,2" />

                        {/* Risk Line */}
                        {streamResults.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                            points={streamResults
                              .map((r, i) => `${i * 100},${100 - r.risk_score}`)
                              .join(" ")}
                          />
                        )}

                        {/* Fake Prob Line */}
                        {streamResults.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="4,3"
                            points={streamResults
                              .map((r, i) => `${i * 100},${100 - r.fake_probability * 100}`)
                              .join(" ")}
                          />
                        )}

                        {/* Acoustic Anomaly Line */}
                        {streamResults.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="2"
                            strokeDasharray="2,2"
                            points={streamResults
                              .map((r, i) => `${i * 100},${100 - r.acoustic_anomaly * 100}`)
                              .join(" ")}
                          />
                        )}

                        {/* Nodes */}
                        {streamResults.map((r, i) => (
                          <circle
                            key={i}
                            cx={i * 100}
                            cy={100 - r.risk_score}
                            r="4"
                            className="fill-red-600 stroke-white stroke-2"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Simulation Chunks Timeline */
              chunks.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-800">Timeline Standing By</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click "Start Simulation Stream" to slice audio into ~4s chunks and observe real-time pipeline telemetry.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${chunks.length}, minmax(0, 1fr))` }}>
                    {chunks.map((ch, idx) => {
                      const res = liveFileResults.find((r) => r.chunkIndex === idx);
                      const isCurrent = currentChunkIndex === idx;
                      const isSelected = selectedInspectChunk?.chunkIndex === idx;

                      let bgClass = "bg-slate-200 text-slate-400";
                      if (res) {
                        if (res.response.risk_level === "CRITICAL" || res.response.risk_level === "HIGH") {
                          bgClass = "bg-red-500 text-white shadow-sm shadow-red-500/30";
                        } else if (res.response.risk_level === "MEDIUM") {
                          bgClass = "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30";
                        } else {
                          bgClass = "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
                        }
                      } else if (isCurrent) {
                        bgClass = "bg-blue-600 text-white animate-pulse";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => res && setSelectedInspectChunk(res)}
                          disabled={!res}
                          className={`h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all ${bgClass} ${
                            isSelected ? "ring-2 ring-blue-600 ring-offset-2 scale-105" : ""
                          }`}
                        >
                          <span>#{idx + 1}</span>
                          <span className="text-[8px] opacity-80">{ch.startTimeSec.toFixed(0)}s</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Selected Window Deep-Dive Inspection Card */}
      {isMicMode && activeWindowInspect && (
        <div id="chunk-inspect-card" className="glass-card rounded-2xl p-6 space-y-4 shadow-lg border border-white/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-mono font-bold text-xs">
                #{activeWindowInspect.window_index}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Stream Window #{activeWindowInspect.window_index} Diagnostics
                </h3>
                <div className="text-[11px] font-mono text-slate-500">
                  Call ID: {activeWindowInspect.call_id} &bull; Measured Round-Trip Server Latency: {activeWindowInspect.server_latency_ms} ms &bull; Duration: {activeWindowInspect.window_duration_sec}s
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${
                  activeWindowInspect.risk_level === "CRITICAL" || activeWindowInspect.risk_level === "HIGH"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : activeWindowInspect.risk_level === "MEDIUM"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {activeWindowInspect.risk_level} RISK ({activeWindowInspect.risk_score}/100)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Deepfake Info */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Wav2Vec2 Classifier</span>
                <span className="font-mono text-blue-600 font-bold">{activeWindowInspect.deepfake_detection.prediction}</span>
              </div>
              <div className="text-slate-600 font-mono text-[11px] space-y-0.5">
                <div>P(Fake): {(activeWindowInspect.fake_probability * 100).toFixed(2)}%</div>
                <div>P(Real): {(activeWindowInspect.real_probability * 100).toFixed(2)}%</div>
                <div>Inference: {activeWindowInspect.deepfake_detection.inference_time_ms} ms</div>
              </div>
            </div>

            {/* Prosody Analysis */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Prosody & Acoustic</span>
                <span className="font-mono text-purple-600 font-bold">{(activeWindowInspect.acoustic_anomaly * 100).toFixed(0)}%</span>
              </div>
              <div className="text-slate-600 text-[11px] space-y-0.5">
                {activeWindowInspect.prosody_reasons && activeWindowInspect.prosody_reasons.length > 0 ? (
                  activeWindowInspect.prosody_reasons.map((r, i) => (
                    <div key={i} className="text-slate-700 font-medium truncate">• {r}</div>
                  ))
                ) : (
                  <div className="text-emerald-600 font-medium">Natural prosody rhythm</div>
                )}
              </div>
            </div>

            {/* Speaker Biometrics */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>ECAPA Biometrics</span>
                {activeWindowInspect.speaker_verification?.similarity_score !== null && activeWindowInspect.speaker_verification?.similarity_score !== undefined ? (
                  <span className="font-mono text-blue-600 font-bold">
                    {activeWindowInspect.speaker_verification.is_match ? "MATCH" : "MISMATCH"}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">None</span>
                )}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                {activeWindowInspect.speaker_verification?.speaker_id ? (
                  <>
                    <div>Speaker: {activeWindowInspect.speaker_verification.speaker_id}</div>
                    <div>Sim: {activeWindowInspect.speaker_verification.similarity_score}</div>
                  </>
                ) : (
                  <div className="text-slate-400">No profile claimed</div>
                )}
              </div>
            </div>

            {/* Recommended Action & Flags */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Action & Flags</span>
                <span className="font-mono font-bold text-slate-900">{activeWindowInspect.recommended_action}</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                {activeWindowInspect.flags && activeWindowInspect.flags.length > 0 ? (
                  activeWindowInspect.flags.map((f, i) => (
                    <div key={i} className="text-red-700 font-medium truncate">⚠ {f}</div>
                  ))
                ) : (
                  <div className="text-emerald-600 font-medium">No suspicious risk flags</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
