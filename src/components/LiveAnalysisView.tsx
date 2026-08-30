/**
 * Phase 7A: Simulated Real-Time Voice Analysis Dashboard.
 * 
 * Slices an audio file into sequential ~4-second windows, analyzes each chunk sequentially,
 * updates the live telemetry and dashboard timeline after each completed chunk, and maintains
 * full biometric verification and multi-signal fraud scoring against enrolled profiles.
 */

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import {
  AnalyzeResponse,
  CallContextState,
  EnrolledSpeaker,
  LiveChunkResult,
  LiveSessionStatus,
  SampleAudio,
} from "../types";
import { sliceAudioIntoWindows } from "../utils/audioChunker";
import { analyzeAudio } from "../api";

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
  // Audio Input State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleName, setSelectedSampleName] = useState<string>("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Session State
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus>("idle");
  const [chunks, setChunks] = useState<Array<{ index: number; startTimeSec: number; endTimeSec: number; blob: Blob; filename: string }>>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);
  const [liveResults, setLiveResults] = useState<LiveChunkResult[]>([]);
  const [selectedInspectChunk, setSelectedInspectChunk] = useState<LiveChunkResult | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Audio Playback during simulation
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Control Refs to manage async loop interruption
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Create Object URL for audio preview
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [selectedFile]);

  // Handle local file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedSampleName("");
      resetSession();
    }
  };

  // Handle quick sample selection
  const handleSelectSample = async (sample: SampleAudio) => {
    try {
      setIsLoadingSample(true);
      setSelectedSampleName(sample.filename);
      resetSession();

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

  const resetSession = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setSessionStatus("idle");
    setChunks([]);
    setCurrentChunkIndex(-1);
    setLiveResults([]);
    setSelectedInspectChunk(null);
    setSessionError(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
  };

  // Start Live Simulation Loop
  const handleStartSimulation = async () => {
    if (!selectedFile) {
      setSessionError("Please select or upload an audio file first.");
      return;
    }

    resetSession();
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setSessionError(null);
    setSessionStatus("chunking");

    try {
      // 1. Slice audio file into ~4-second windows
      const chunkWindows = await sliceAudioIntoWindows(selectedFile, 4.0, 1.0);
      if (chunkWindows.length === 0) {
        throw new Error("Audio is too short or contains no decodable audio frames.");
      }

      setChunks(chunkWindows);
      setSessionStatus("streaming");

      // Optional audio playback during live call
      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
      }

      // 2. Sequential Analysis Loop
      const resultsAccumulator: LiveChunkResult[] = [];

      for (let i = 0; i < chunkWindows.length; i++) {
        if (isCancelledRef.current) break;

        // Handle paused state
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (isCancelledRef.current) break;

        const currentWindow = chunkWindows[i];
        setCurrentChunkIndex(i);

        // Convert chunk Blob to File
        const chunkFile = new File([currentWindow.blob], currentWindow.filename, { type: "audio/wav" });

        const startTime = performance.now();

        // Perform genuine backend analysis on this specific chunk
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
        setLiveResults([...resultsAccumulator]);
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

  const handlePauseResume = () => {
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

  const handleStop = () => {
    isCancelledRef.current = true;
    setSessionStatus("completed");
    setCurrentChunkIndex(-1);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsAudioPlaying(false);
  };

  // Latest active result for live indicators
  const latestResult = liveResults.length > 0 ? liveResults[liveResults.length - 1] : null;
  const activeInspect = selectedInspectChunk || latestResult;

  // Max Risk across entire call stream
  const maxRiskScore = liveResults.length > 0 ? Math.max(...liveResults.map((r) => r.response.risk_score)) : 0;
  const avgFakeProb =
    liveResults.length > 0
      ? liveResults.reduce((acc, r) => acc + r.response.deepfake_detection.fake_probability, 0) / liveResults.length
      : 0;

  return (
    <div id="live-analysis-container" className="space-y-6">
      
      {/* Top Banner: Real-Time Stream Simulator Specs */}
      <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-sm">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Phase 7A: Simulated Real-Time Voice Analysis
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Sequential ~4.0s Windows
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Timeline
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Slices full audio into sequential 4-second evaluation windows, computes transformer deepfake classification, evaluates 192-D biometric similarity against enrolled profiles, and streams live risk telemetry.
            </p>
          </div>
        </div>

        {/* Global Stream Status Indicator */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border shadow-sm ${
              sessionStatus === "streaming"
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
                sessionStatus === "streaming"
                  ? "bg-emerald-500 animate-ping"
                  : sessionStatus === "chunking"
                  ? "bg-amber-500 animate-pulse"
                  : sessionStatus === "completed"
                  ? "bg-blue-500"
                  : "bg-slate-400"
              }`}
            />
            {sessionStatus === "idle" && "IDLE / READY"}
            {sessionStatus === "chunking" && "SLICING AUDIO..."}
            {sessionStatus === "streaming" && `STREAMING CHUNK ${currentChunkIndex + 1}/${chunks.length}`}
            {sessionStatus === "paused" && "STREAM PAUSED"}
            {sessionStatus === "completed" && `STREAM COMPLETED (${liveResults.length} Chunks)`}
            {sessionStatus === "error" && "STREAM ERROR"}
          </div>
        </div>
      </div>

      {/* Grid: Audio Source Setup & Speaker Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Audio Selection & Stream Controls */}
        <div className="glass-card rounded-2xl p-6 space-y-5 shadow-lg border border-white/80">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">1. Audio Source Stream</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">16kHz PCM</span>
          </div>

          {/* Upload or Drop */}
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
              <div className="text-xs font-bold text-slate-800">Select Audio File for Live Stream</div>
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

          {/* Quick Test Samples */}
          <div className="space-y-2">
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

          {/* Speaker Profile Claim */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
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

          {/* Action Stream Controls */}
          <div className="pt-2 space-y-2">
            {sessionStatus === "idle" || sessionStatus === "completed" || sessionStatus === "error" ? (
              <button
                id="btn-start-live-sim"
                onClick={handleStartSimulation}
                disabled={!selectedFile || isLoadingSample}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Real-Time Stream Analysis
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePauseResume}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  {sessionStatus === "paused" ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  {sessionStatus === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleStop}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>
            )}

            {sessionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                <span>{sessionError}</span>
              </div>
            )}
          </div>

          {/* Hidden audio player for synchronised audio playback */}
          {audioUrl && (
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsAudioPlaying(false)}
              className="hidden"
            />
          )}
        </div>

        {/* Col 2 & 3: Live Telemetry Gauges & Active Diagnostics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Metric Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Metric 1: Current Chunk Deepfake Probability */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Deepfake Probability
                </span>
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {latestResult
                    ? `${(latestResult.response.deepfake_detection.fake_probability * 100).toFixed(1)}%`
                    : "—"}
                </span>
                {latestResult && (
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      latestResult.response.deepfake_detection.prediction === "FAKE"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {latestResult.response.deepfake_detection.prediction}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {latestResult
                  ? `Inference: ${latestResult.processingLatencyMs} ms`
                  : "Awaiting active chunk stream"}
              </div>
            </div>

            {/* Metric 2: Biometric Verification */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Biometric Match
                </span>
                <Fingerprint className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                {latestResult && latestResult.response.speaker_verification ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {latestResult.response.speaker_verification.similarity_score !== undefined
                        ? (latestResult.response.speaker_verification.similarity_score * 100).toFixed(0) + "%"
                        : "—"}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        latestResult.response.speaker_verification.match
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {latestResult.response.speaker_verification.match ? "MATCH" : "MISMATCH"}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-slate-400">
                    {context.speaker_id ? "Verifying..." : "No Profile"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {context.speaker_id
                  ? `Threshold τ: ${context.verification_threshold.toFixed(2)}`
                  : "Claim identity to verify"}
              </div>
            </div>

            {/* Metric 3: Live Composite Risk */}
            <div className="glass-card rounded-2xl p-5 border border-white/80 shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Risk Score
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {latestResult ? latestResult.response.risk_score : "—"}
                </span>
                {latestResult && (
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      latestResult.response.risk_level === "CRITICAL" || latestResult.response.risk_level === "HIGH"
                        ? "bg-red-100 text-red-700"
                        : latestResult.response.risk_level === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {latestResult.response.risk_level}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {latestResult
                  ? `Action: ${latestResult.response.recommended_action}`
                  : "0–100 Multi-Signal Fusion"}
              </div>
            </div>
          </div>

          {/* Timeline Wave & Risk Evolution Graph */}
          <div className="glass-card rounded-2xl p-6 space-y-4 shadow-lg border border-white/80">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Live Call Analysis Timeline
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                <span>Max Risk: <strong className="text-slate-900">{maxRiskScore}</strong></span>
                <span>Avg Fake Prob: <strong className="text-slate-900">{(avgFakeProb * 100).toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Chunk Timeline Ribbon */}
            {chunks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Timeline Standing By</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "Start Real-Time Stream Analysis" to slice the audio into ~4s chunks and monitor real-time threat telemetry as each window completes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chunk Progress Bar with Individual Window Blocks */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span>Stream Progress: {liveResults.length} / {chunks.length} Chunks</span>
                    <span>{((liveResults.length / chunks.length) * 100).toFixed(0)}% Completed</span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${chunks.length}, minmax(0, 1fr))` }}>
                    {chunks.map((ch, idx) => {
                      const res = liveResults.find((r) => r.chunkIndex === idx);
                      const isCurrent = currentChunkIndex === idx;
                      const isSelected = activeInspect?.chunkIndex === idx;

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
                          title={`Chunk ${idx + 1} (${ch.startTimeSec}s - ${ch.endTimeSec}s)${
                            res ? ` | Risk: ${res.response.risk_score} | ${res.response.risk_level}` : ""
                          }`}
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

                {/* SVG Visual Risk Score Progression Chart */}
                {liveResults.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Dynamic Risk Progression (0–100)</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Risk Score</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Fake Prob %</span>
                      </div>
                    </div>

                    <div className="h-28 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${Math.max(liveResults.length - 1, 1) * 100} 100`} preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="25" x2="1000" y2="25" stroke="#e2e8f0" strokeDasharray="2,2" />
                        <line x1="0" y1="50" x2="1000" y2="50" stroke="#e2e8f0" strokeDasharray="2,2" />
                        <line x1="0" y1="75" x2="1000" y2="75" stroke="#e2e8f0" strokeDasharray="2,2" />

                        {/* Risk Score Path */}
                        {liveResults.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                            points={liveResults
                              .map((r, i) => `${i * 100},${100 - r.response.risk_score}`)
                              .join(" ")}
                          />
                        )}

                        {/* Deepfake Probability Path */}
                        {liveResults.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="4,3"
                            points={liveResults
                              .map((r, i) => `${i * 100},${100 - r.response.deepfake_detection.fake_probability * 100}`)
                              .join(" ")}
                          />
                        )}

                        {/* Nodes */}
                        {liveResults.map((r, i) => (
                          <circle
                            key={i}
                            cx={i * 100}
                            cy={100 - r.response.risk_score}
                            r="4"
                            className="fill-red-600 stroke-white stroke-2"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspected Chunk Diagnostics Deep-Dive */}
      {activeInspect && (
        <div id="chunk-inspect-card" className="glass-card rounded-2xl p-6 space-y-4 shadow-lg border border-white/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-mono font-bold text-xs">
                #{activeInspect.chunkIndex + 1}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chunk Diagnostics Window: [{activeInspect.startTimeSec}s &ndash; {activeInspect.endTimeSec}s]
                </h3>
                <div className="text-[11px] font-mono text-slate-500">
                  Call ID: {activeInspect.response.call_id} &bull; Round-trip Latency: {activeInspect.processingLatencyMs} ms
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${
                  activeInspect.response.risk_level === "CRITICAL" || activeInspect.response.risk_level === "HIGH"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : activeInspect.response.risk_level === "MEDIUM"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {activeInspect.response.risk_level} RISK ({activeInspect.response.risk_score}/100)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Deepfake Info */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Transformer Classifier</span>
                <span className="font-mono text-blue-600 font-bold">{activeInspect.response.deepfake_detection.prediction}</span>
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                <div>P(Fake): {(activeInspect.response.deepfake_detection.fake_probability * 100).toFixed(2)}%</div>
                <div>Model: {activeInspect.response.deepfake_detection.model_used.split("/").pop()}</div>
                <div>Inference Time: {activeInspect.response.deepfake_detection.inference_time_ms} ms</div>
              </div>
            </div>

            {/* Speaker Info */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Biometric Verification</span>
                {activeInspect.response.speaker_verification ? (
                  <span className="font-mono text-blue-600 font-bold">
                    {activeInspect.response.speaker_verification.match ? "VERIFIED" : "MISMATCH"}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">None</span>
                )}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                {activeInspect.response.speaker_verification ? (
                  <>
                    <div>Speaker: {activeInspect.response.speaker_verification.speaker_id}</div>
                    <div>Similarity: {activeInspect.response.speaker_verification.similarity_score} (τ={activeInspect.response.speaker_verification.threshold})</div>
                    <div>Mismatch Flag: {activeInspect.response.speaker_verification.speaker_mismatch_flag}</div>
                  </>
                ) : (
                  <div className="text-slate-400">No speaker enrolled/claimed</div>
                )}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4 rounded-xl bg-white/70 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Recommended Action</span>
                <span className="font-mono font-bold text-slate-900">{activeInspect.response.recommended_action}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {activeInspect.response.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
