import React, { useState, useRef } from "react";
import {
  UserPlus,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Clock,
  Database,
  Layers,
  XCircle,
  FileAudio,
  Shield,
  Loader2,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { EnrolledSpeaker, EnrollmentResponse, VerifySpeakerResponse } from "../types";
import { enrollSpeaker, verifySpeakerApi } from "../api";

interface SpeakerProfilesProps {
  speakers: EnrolledSpeaker[];
  onRefreshSpeakers: () => void;
}

export const SpeakerProfiles: React.FC<SpeakerProfilesProps> = ({
  speakers,
  onRefreshSpeakers,
}) => {
  // Enrollment Form State
  const [enrollId, setEnrollId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<EnrollmentResponse | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const enrollInputRef = useRef<HTMLInputElement | null>(null);

  // Standalone Verification State
  const [verifySpeakerId, setVerifySpeakerId] = useState("");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyThreshold, setVerifyThreshold] = useState(0.70);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifySpeakerResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifyInputRef = useRef<HTMLInputElement | null>(null);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollId.trim()) {
      setEnrollError("Speaker ID is required.");
      return;
    }
    if (!enrollFile) {
      setEnrollError("Reference voice audio file (.wav, .flac) is required.");
      return;
    }

    setIsEnrolling(true);
    setEnrollError(null);
    setEnrollResult(null);

    try {
      const res = await enrollSpeaker(enrollFile, enrollFile.name, enrollId.trim(), enrollName.trim() || undefined);
      setEnrollResult(res);
      setEnrollFile(null);
      setEnrollId("");
      setEnrollName("");
      onRefreshSpeakers();
    } catch (err: any) {
      setEnrollError(err.message || "Failed to enroll speaker.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifySpeakerId.trim()) {
      setVerifyError("Please select or enter an enrolled Speaker ID.");
      return;
    }
    if (!verifyFile) {
      setVerifyError("Query audio sample file is required.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await verifySpeakerApi(verifyFile, verifyFile.name, verifySpeakerId.trim(), verifyThreshold);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.message || "Speaker verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div id="speaker-profiles-view" className="space-y-6">
      
      {/* Privacy Guarantee Header Banner */}
      <div className="liquid-panel rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/15 shadow-2xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl liquid-pill border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            <ShieldCheck className="w-6 h-6 glow-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-white font-display">
                Biometric Voiceprint Registry & Defense Matrix
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                ECAPA-TDNN 192-D
              </span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                ZERO RAW AUDIO STORED
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-1 max-w-3xl leading-relaxed">
              Extracts 192-dimensional L2-normalized vector embeddings. Reference audio waveforms are immediately purged from RAM after embedding extraction to guarantee enterprise caller privacy.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshSpeakers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold font-mono transition-all self-start md:self-center shrink-0 squish-btn"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          Synchronize Registry ({speakers.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Enroll Genuine Speaker */}
        <div id="enrollment-card" className="liquid-panel rounded-3xl p-6 space-y-5 border border-white/15 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl liquid-pill border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Enroll Genuine Voice Profile
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Generate L2 Biometric Vector</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
              POST /enroll
            </span>
          </div>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 font-mono text-[11px]">
                  Speaker Identifier *
                </label>
                <input
                  id="enroll-speaker-id-input"
                  type="text"
                  placeholder="e.g. EMP-9001, CEO-JANE"
                  value={enrollId}
                  onChange={(e) => setEnrollId(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full liquid-inner-well border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 shadow-inner font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 font-mono text-[11px]">
                  Display / Role Name (Optional)
                </label>
                <input
                  id="enroll-speaker-name-input"
                  type="text"
                  placeholder="e.g. Jane Doe (CEO)"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full liquid-inner-well border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 shadow-inner font-mono text-xs"
                />
              </div>
            </div>

            {/* Audio Upload for Enrollment */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 font-mono text-[11px]">
                Reference Audio Sample (.wav, .flac) *
              </label>
              <input
                ref={enrollInputRef}
                type="file"
                accept="audio/*,.wav,.flac"
                onChange={(e) => e.target.files?.[0] && setEnrollFile(e.target.files[0])}
                disabled={isEnrolling}
                className="hidden"
                id="enroll-file-input"
              />

              {!enrollFile ? (
                <div
                  onClick={() => !isEnrolling && enrollInputRef.current?.click()}
                  className="border border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-cyan-950/20 hover:bg-cyan-950/30 shadow-inner group"
                >
                  <Upload className="w-7 h-7 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-slate-200 font-bold font-mono">Select Reference Voice Waveform</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">1.0s – 30.0s clean speech for 192-D biometric extraction</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl liquid-inner-well border border-emerald-500/30 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0 font-mono">
                    <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-semibold truncate text-xs">{enrollFile.name}</span>
                    <span className="text-slate-400 text-[11px]">({(enrollFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrollFile(null)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs px-2 py-1 font-mono"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>

            {enrollError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{enrollError}</span>
              </div>
            )}

            {enrollResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2 font-mono shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Enrollment Successful!
                </div>
                <div className="text-slate-300 text-[11px] space-y-1">
                  <div>Speaker: <strong className="text-white">{enrollResult.speaker_id}</strong> {enrollResult.speaker_name ? `(${enrollResult.speaker_name})` : ""}</div>
                  <div>Embedding Dimension: <strong className="text-cyan-300">{enrollResult.embedding_dimension}-D</strong> Vector</div>
                  <div>Inference Latency: <strong className="text-white">{enrollResult.inference_time_ms} ms</strong></div>
                  <div>Sample Rate Verified: <strong className="text-white">{enrollResult.sample_rate_verified} Hz</strong></div>
                </div>
              </div>
            )}

            <button
              id="submit-enroll-btn"
              type="submit"
              disabled={isEnrolling || !enrollId.trim() || !enrollFile}
              className="w-full py-3 rounded-xl liquid-btn-primary text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all squish-btn font-mono"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Extracting 192-D Embedding...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-slate-950" />
                  Enroll Speaker Profile
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Standalone Biometric Verifier */}
        <div id="verify-card" className="liquid-panel rounded-3xl p-6 space-y-5 border border-white/15 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl liquid-pill border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                <Fingerprint className="w-4 h-4 glow-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Standalone Biometric Verifier
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Cosine Similarity Scoring</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30">
              POST /verify-speaker
            </span>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 font-mono text-[11px]">
                  Select Enrolled Speaker *
                </label>
                <select
                  id="verify-speaker-select"
                  value={verifySpeakerId}
                  onChange={(e) => setVerifySpeakerId(e.target.value)}
                  disabled={isVerifying}
                  className="w-full liquid-inner-well border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-400/50 shadow-inner font-mono"
                  required
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">-- Choose Speaker --</option>
                  {speakers.map((s) => (
                    <option key={s.speaker_id} value={s.speaker_id} className="bg-slate-900 text-white">
                      {s.speaker_id} {s.speaker_name ? `(${s.speaker_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <label className="font-semibold text-slate-300">
                    Threshold (τ):
                  </label>
                  <span className="text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">{verifyThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={verifyThreshold}
                  onChange={(e) => setVerifyThreshold(parseFloat(e.target.value))}
                  disabled={isVerifying}
                  className="w-full accent-cyan-400 mt-2"
                />
              </div>
            </div>

            {/* Query Audio Upload */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 font-mono text-[11px]">
                Query Audio File to Compare *
              </label>
              <input
                ref={verifyInputRef}
                type="file"
                accept="audio/*,.wav,.flac,.mp3"
                onChange={(e) => e.target.files?.[0] && setVerifyFile(e.target.files[0])}
                disabled={isVerifying}
                className="hidden"
                id="verify-file-input"
              />

              {!verifyFile ? (
                <div
                  onClick={() => !isVerifying && verifyInputRef.current?.click()}
                  className="border border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-cyan-950/20 hover:bg-cyan-950/30 shadow-inner group"
                >
                  <Upload className="w-7 h-7 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-slate-200 font-bold font-mono">Select Query Audio Stream</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">Computes cosine similarity against enrolled 192-D vector</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl liquid-inner-well border border-cyan-500/30 shadow-sm font-mono">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-white font-semibold truncate text-xs">{verifyFile.name}</span>
                    <span className="text-slate-400 text-[11px]">({(verifyFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerifyFile(null)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs px-2 py-1 font-mono"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>

            {verifyError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 font-mono ${
                  verifyResult.match
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-2">
                    {verifyResult.match ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {verifyResult.match ? "BIOMETRIC MATCH (GENUINE CALLER)" : "BIOMETRIC MISMATCH (DISCREPANCY DETECTED)"}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Latency: {verifyResult.inference_time_ms} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] liquid-inner-well p-3 rounded-xl border border-white/5 font-mono">
                  <div>Cosine Similarity: <strong className="text-cyan-300">{verifyResult.similarity_score}</strong></div>
                  <div>Decision Threshold: <strong className="text-white">{verifyResult.threshold}</strong></div>
                  <div>Centroid Samples: <strong className="text-purple-300">{verifyResult.sample_count || 1}</strong></div>
                  <div>Mismatch Flag: <strong className={verifyResult.speaker_mismatch_flag ? "text-rose-400" : "text-emerald-400"}>{String(verifyResult.speaker_mismatch_flag)}</strong></div>
                  <div>Status: <strong className="text-white">{verifyResult.status}</strong></div>
                  <div>Inference Time: <strong className="text-white">{verifyResult.inference_time_ms} ms</strong></div>
                </div>
              </div>
            )}

            <button
              id="submit-verify-btn"
              type="submit"
              disabled={isVerifying || !verifySpeakerId || !verifyFile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] squish-btn font-mono"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Comparing Acoustic Embeddings...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-slate-950" />
                  Verify Biometric Similarity
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Card 3: Active Registered Profiles Table */}
      <div id="enrolled-speakers-table" className="liquid-panel rounded-3xl p-6 space-y-4 border border-white/15 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl liquid-pill border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.25)]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                Active Registered Speaker Profiles ({speakers.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Multi-Sample Centroid Store (192-D Vector Matrix)</span>
            </div>
          </div>
          <span className="text-xs text-cyan-400 font-mono">SQLite Centroid Vectors</span>
        </div>

        {speakers.length === 0 ? (
          <div className="p-10 text-center rounded-2xl liquid-inner-well border border-white/5 space-y-2">
            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-300 font-mono">No Speakers Enrolled Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-mono">
              Enroll genuine executives, callers, or authorized users above to enable biometric mismatch fraud defense.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 liquid-inner-well">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 border-b border-white/10 bg-white/[0.03] font-mono">
                <tr>
                  <th className="py-3 px-4 font-bold">Speaker ID</th>
                  <th className="py-3 px-4 font-bold">Display Name</th>
                  <th className="py-3 px-4 font-bold">Genuine Samples</th>
                  <th className="py-3 px-4 font-bold">Embedding Centroid</th>
                  <th className="py-3 px-4 font-bold">Last Updated</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {speakers.map((s) => (
                  <tr key={s.speaker_id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                      {s.speaker_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {s.speaker_name || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {s.sample_count || 1} {s.sample_count === 1 ? "Sample" : "Samples (Centroid)"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-purple-300 font-bold">
                      192-D (L2 Norm)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date((s.updated_at || s.created_at) * 1000).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setVerifySpeakerId(s.speaker_id);
                        }}
                        className="px-3.5 py-1.5 rounded-xl liquid-btn-glass text-[11px] text-cyan-300 font-mono font-semibold transition-all squish-btn"
                      >
                        Test Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};


