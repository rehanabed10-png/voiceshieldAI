import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { AudioUpload } from "./components/AudioUpload";
import { ContextForm } from "./components/ContextForm";
import { ProcessingView } from "./components/ProcessingView";
import { AnalysisResult } from "./components/AnalysisResult";
import { ErrorAlert } from "./components/ErrorAlert";
import { SpeakerProfiles } from "./components/SpeakerProfiles";
import {
  AnalyzeResponse,
  CallContextState,
  EnrolledSpeaker,
  HealthResponse,
  SampleAudio,
} from "./types";
import {
  analyzeAudio,
  fetchHealth,
  fetchSamples,
  fetchSpeakers,
} from "./api";
import { ShieldCheck, ArrowRight, Clock } from "lucide-react";

export default function App() {
  // Global Navigation
  const [activeTab, setActiveTab] = useState<"analysis" | "speakers">("analysis");

  // Health & Catalog Data
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [speakers, setSpeakers] = useState<EnrolledSpeaker[]>([]);
  const [samples, setSamples] = useState<SampleAudio[]>([]);

  // Selected Audio State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleName, setSampleName] = useState<string | null>(null);

  // Contextual Parameters
  const [context, setContext] = useState<CallContextState>({
    speaker_id: "",
    verification_threshold: 0.70,
    caller_id: "",
    is_caller_recognized: false,
    is_previously_flagged: false,
    claimed_role: "",
    requested_transaction_amount: "",
    normal_transaction_amount: "",
    is_urgent: false,
    urgency_reason: "",
    transcript_text: "",
  });

  // Pipeline Status & Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<{ message: string; error_type?: string; status?: number } | null>(null);

  // Load initial backend health, enrolled speakers, and test samples
  const loadInitialData = async () => {
    try {
      const [hData, spkData, sampleData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchSpeakers(),
        fetchSamples(),
      ]);
      if (hData) setHealth(hData);
      setSpeakers(spkData);
      setSamples(sampleData);
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFileSelected = (file: File, name: string) => {
    setSelectedFile(file);
    setSampleName(name);
    setResult(null);
    setError(null);
  };

  const handleSelectSample = async (sample: SampleAudio) => {
    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: "audio/wav" });
      setSelectedFile(file);
      setSampleName(sample.filename);
      setResult(null);
      setError(null);
    } catch (e) {
      console.error("Failed to load sample audio", e);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setSampleName(null);
    setResult(null);
    setError(null);
  };

  const handleContextChange = (updated: Partial<CallContextState>) => {
    setContext((prev) => ({ ...prev, ...updated }));
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeAudio(selectedFile, sampleName || selectedFile.name, context);
      setResult(analysisResult);
    } catch (err: any) {
      setError({
        message: err.message || "An unexpected error occurred during audio processing.",
        error_type: err.error_type || "AnalysisError",
        status: err.status || 500,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="voiceshield-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Sticky Header with Live Status Indicator */}
      <Header
        health={health}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        enrolledCount={speakers.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Tab 1: Threat Analysis Dashboard */}
        {activeTab === "analysis" && (
          <div className="space-y-6">
            
            {/* 1. Audio Upload & Selection Card */}
            <div className="space-y-4">
              <AudioUpload
                selectedFile={selectedFile}
                sampleName={sampleName}
                onFileSelected={handleFileSelected}
                onClear={handleClear}
                samples={samples}
                onSelectSample={handleSelectSample}
                isProcessing={isProcessing}
              />
            </div>

            {/* 2. Audio Selected Controls & Fraud Context Configurator */}
            {selectedFile && !result && !error && (
              <div id="analysis-controls-section" className="space-y-4">
                
                {/* Optional Anti-Fraud Context & Biometric Threshold */}
                <ContextForm
                  context={context}
                  onChange={handleContextChange}
                  enrolledSpeakers={speakers}
                  disabled={isProcessing}
                />

                {/* Primary Analyze CTA Button */}
                {!isProcessing && (
                  <div className="flex justify-end pt-1">
                    <button
                      id="btn-analyze-audio"
                      onClick={handleRunAnalysis}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/50 active:scale-[0.98]"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Execute Threat Analysis
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* 3. Processing State View */}
            {isProcessing && <ProcessingView />}

            {/* 4. Analysis Results (Low-Risk, High-Risk, Suspicious) */}
            {result && !isProcessing && (
              <AnalysisResult result={result} onReset={handleClear} />
            )}

            {/* 5. Error State Container */}
            {error && !isProcessing && (
              <ErrorAlert error={error} onReset={handleClear} />
            )}

            {/* 6. Empty Dashboard Placeholder State (When no audio is selected yet) */}
            {!selectedFile && !isProcessing && !result && !error && (
              <div
                id="empty-dashboard-guide"
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 sm:p-8 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Analysis Results: Standing By
                  </h3>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                    Upload an audio stream recording or select one of the quick validation test samples above to evaluate deepfake synthetic voice likelihood, 192-D biometric voiceprint match, and multi-signal fraud score.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Speaker Biometric Profiles Registry (Phase 5) */}
        {activeTab === "speakers" && (
          <SpeakerProfiles
            speakers={speakers}
            onRefreshSpeakers={() => fetchSpeakers().then(setSpeakers)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VoiceShield &bull; SIH 2026 Problem Statement 26104</span>
          <span className="font-mono text-[11px]">Wav2Vec2 Deepfake Detector + ECAPA-TDNN Speaker Verifier</span>
        </div>
      </footer>
    </div>
  );
}
