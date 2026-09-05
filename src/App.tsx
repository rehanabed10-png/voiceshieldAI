import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar, NavTab } from "./components/Sidebar";
import { AudioUpload } from "./components/AudioUpload";
import { ContextForm } from "./components/ContextForm";
import { ProcessingView } from "./components/ProcessingView";
import { AnalysisResult } from "./components/AnalysisResult";
import { ErrorAlert } from "./components/ErrorAlert";
import { SpeakerProfiles } from "./components/SpeakerProfiles";
import { LiveAnalysisView } from "./components/LiveAnalysisView";
import { PolicyConfigView } from "./components/PolicyConfigView";
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
import { ShieldCheck, ArrowRight, Activity } from "lucide-react";

export default function App() {
  // Global Navigation
  const [activeTab, setActiveTab] = useState<NavTab>("analysis");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    <div id="voiceshield-root" className="min-h-screen relative overflow-x-hidden font-sans text-slate-100 bg-[#040814] flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Liquid Ambient Light Blooms from Figma Spec */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top central cyan ambient flare */}
        <div className="absolute -top-40 left-1/3 w-[620px] h-[540px] bg-cyan-500/15 rounded-full blur-[160px]"></div>
        {/* Deep violet/purple orb mid-screen glow */}
        <div className="absolute top-1/4 -left-20 w-[520px] h-[520px] bg-purple-600/15 rounded-full blur-[170px]"></div>
        {/* Bottom right royal sapphire radiance */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[680px] h-[680px] bg-blue-600/15 rounded-full blur-[180px]"></div>
        {/* Center holographic resonance burst */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] bg-gradient-to-r from-cyan-600/10 via-purple-600/10 to-blue-600/10 rounded-full blur-[140px]"></div>
      </div>

      {/* Top Navigation Bar */}
      <Header
        health={health}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        enrolledCount={speakers.length}
      />

      {/* Main Layout Area with Responsive Sidebar + Content */}
      <div className="flex-1 flex w-full relative z-10">
        {/* Desktop Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          enrolledCount={speakers.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Container */}
        <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-7 overflow-y-auto">
          
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
                    <div className="flex justify-end pt-2">
                      <button
                        id="btn-analyze-audio"
                        onClick={handleRunAnalysis}
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl liquid-btn-primary text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 transition-all squish-btn font-mono"
                      >
                        <ShieldCheck className="w-5 h-5 text-slate-950" />
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
                  className="liquid-panel rounded-3xl p-8 sm:p-12 text-center space-y-4 border border-white/15 shadow-2xl relative overflow-hidden"
                >
                  <div className="w-14 h-14 rounded-2xl liquid-pill border border-cyan-400/30 flex items-center justify-center text-cyan-300 mx-auto shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <Activity className="w-7 h-7 glow-cyan" />
                  </div>
                  <div className="space-y-2 font-mono">
                    <h3 className="text-lg font-bold text-white font-display">
                      REAL-TIME FORENSIC PIPELINE STANDING BY
                    </h3>
                    <p className="text-xs text-slate-300/80 max-w-xl mx-auto leading-relaxed">
                      Upload an audio stream recording or select one of the curated test samples above to evaluate synthetic voice likelihood, 192-D biometric voiceprint match, and multi-signal financial fraud risk.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Tab 2: Live Real-Time Call Monitor */}
          {activeTab === "live" && (
            <LiveAnalysisView
              speakers={speakers}
              samples={samples}
              context={context}
              onContextChange={handleContextChange}
            />
          )}

          {/* Tab 3: Speaker Biometric Profiles Registry */}
          {activeTab === "speakers" && (
            <SpeakerProfiles
              speakers={speakers}
              onRefreshSpeakers={() => fetchSpeakers().then(setSpeakers)}
            />
          )}

          {/* Tab 4: Policy Engine Configuration */}
          {activeTab === "policy" && (
            <PolicyConfigView />
          )}

        </main>
      </div>

      {/* Footer matching Figma reference */}
      <footer className="w-full relative z-10 border-t border-white/10 bg-slate-950/70 backdrop-blur-2xl py-4 text-xs text-slate-400">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <span className="tracking-widest uppercase text-slate-400">
            REAL PEOPLE. REAL CONVERSATIONS. STRONGER DEFENSES.
          </span>
          <span className="text-cyan-400/90 font-semibold tracking-wider">
            BUILT FOR A SAFER TOMORROW • v1.0.0
          </span>
        </div>
      </footer>
    </div>
  );
}

