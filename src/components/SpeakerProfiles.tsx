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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Biometric Speaker Verification Registry (Phase 5)
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                ECAPA-TDNN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Extracts 192-dimensional L2-normalized vector embeddings. 
              <strong> Zero raw audio is stored:</strong> reference audio arrays are discarded immediately after embedding computation to protect privacy.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshSpeakers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors self-start md:self-center shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Store ({speakers.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Enroll Genuine Speaker */}
        <div id="enrollment-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                Enroll Genuine Voice Profile
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">POST /enroll</span>
          </div>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Speaker Identifier *
                </label>
                <input
                  id="enroll-speaker-id-input"
                  type="text"
                  placeholder="e.g. EMP-9001, CEO-JANE"
                  value={enrollId}
                  onChange={(e) => setEnrollId(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Display / Role Name (Optional)
                </label>
                <input
                  id="enroll-speaker-name-input"
                  type="text"
                  placeholder="e.g. Jane Doe (CEO)"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Audio Upload for Enrollment */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
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
                  className="border border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-950/60 transition-all bg-slate-950/30"
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <div className="text-slate-300 font-medium">Select Reference Voice Audio</div>
                  <div className="text-[11px] text-slate-500">1.0s – 30.0s audio for 192-D fingerprint extraction</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 font-medium truncate">{enrollFile.name}</span>
                    <span className="text-slate-500 text-[11px]">({(enrollFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrollFile(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {enrollError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{enrollError}</span>
              </div>
            )}

            {enrollResult && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Enrollment Successful!
                </div>
                <div className="text-slate-300 text-[11px] space-y-0.5 font-mono">
                  <div>Speaker: <strong>{enrollResult.speaker_id}</strong> {enrollResult.speaker_name ? `(${enrollResult.speaker_name})` : ""}</div>
                  <div>Embedding Dimension: <strong>{enrollResult.embedding_dimension}-D</strong> Vector</div>
                  <div>Inference Latency: <strong>{enrollResult.inference_time_ms} ms</strong></div>
                  <div>Sample Rate Verified: <strong>{enrollResult.sample_rate_verified} Hz</strong></div>
                </div>
              </div>
            )}

            <button
              id="submit-enroll-btn"
              type="submit"
              disabled={isEnrolling || !enrollId.trim() || !enrollFile}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting 192-D Embedding...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Enroll Speaker Profile
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Standalone Biometric Verifier */}
        <div id="verify-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Fingerprint className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                Standalone Biometric Verifier
              </h3>
            </div>
            <span className="text-[11px] font-mono text-indigo-400">POST /verify-speaker</span>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Select Enrolled Speaker *
                </label>
                <select
                  id="verify-speaker-select"
                  value={verifySpeakerId}
                  onChange={(e) => setVerifySpeakerId(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>-- Choose Speaker --</option>
                  {speakers.map((s) => (
                    <option key={s.speaker_id} value={s.speaker_id}>
                      {s.speaker_id} {s.speaker_name ? `(${s.speaker_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="font-semibold text-slate-300">
                    Threshold ($\tau$):
                  </label>
                  <span className="font-mono text-indigo-400 font-bold">{verifyThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={verifyThreshold}
                  onChange={(e) => setVerifyThreshold(parseFloat(e.target.value))}
                  disabled={isVerifying}
                  className="w-full accent-indigo-500 mt-1"
                />
              </div>
            </div>

            {/* Query Audio Upload */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
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
                  className="border border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-slate-950/60 transition-all bg-slate-950/30"
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <div className="text-slate-300 font-medium">Select Test Audio Stream</div>
                  <div className="text-[11px] text-slate-500">Computes cosine similarity against enrolled 192-D vector</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-200 font-medium truncate">{verifyFile.name}</span>
                    <span className="text-slate-500 text-[11px]">({(verifyFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerifyFile(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {verifyError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  verifyResult.match
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5">
                    {verifyResult.match ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {verifyResult.match ? "BIOMETRIC MATCH (VERIFIED)" : "BIOMETRIC MISMATCH (DISCREPANCY)"}
                  </div>
                  <span className="font-mono text-[11px]">
                    Latency: {verifyResult.inference_time_ms} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg">
                  <div>Cosine Similarity: <strong className="text-white">{verifyResult.similarity_score}</strong></div>
                  <div>Decision Threshold: <strong className="text-white">{verifyResult.threshold}</strong></div>
                  <div>Mismatch Flag (M): <strong className="text-white">{verifyResult.speaker_mismatch_flag}</strong></div>
                  <div>Status: <strong className="text-white">{verifyResult.status}</strong></div>
                </div>
              </div>
            )}

            <button
              id="submit-verify-btn"
              type="submit"
              disabled={isVerifying || !verifySpeakerId || !verifyFile}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-950/40"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Comparing Acoustic Embeddings...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Verify Biometric Similarity
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Card 3: Active Registered Profiles Table */}
      <div id="enrolled-speakers-table" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Active Registered Speaker Profiles ({speakers.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">In-Memory 192-D Store</span>
        </div>

        {speakers.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-400">No Speakers Enrolled Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enroll genuine executives, callers, or authorized users above to enable biometric mismatch fraud defense.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="py-2.5 px-3">Speaker ID</th>
                  <th className="py-2.5 px-3">Display Name</th>
                  <th className="py-2.5 px-3">Embedding Vector</th>
                  <th className="py-2.5 px-3">Enrolled At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {speakers.map((s) => (
                  <tr key={s.speaker_id} className="hover:bg-slate-950/40">
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {s.speaker_id}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      {s.speaker_name || "—"}
                    </td>
                    <td className="py-3 px-3 text-cyan-400">
                      192-D (L2 Norm)
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(s.created_at * 1000).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setVerifySpeakerId(s.speaker_id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-sans transition-colors"
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
