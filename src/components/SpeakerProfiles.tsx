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
  UserCheck
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
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/80 shadow-md">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Biometric Speaker Verification Registry (Phase 5)
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                ECAPA-TDNN
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Extracts 192-dimensional L2-normalized vector embeddings. 
              <strong className="text-slate-800"> Zero raw audio is stored:</strong> reference audio arrays are discarded immediately after embedding computation to protect privacy.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshSpeakers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-sm self-start md:self-center shrink-0 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Store ({speakers.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Enroll Genuine Speaker */}
        <div id="enrollment-card" className="glass-card rounded-2xl p-6 space-y-5 shadow-lg border border-white/80">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Enroll Genuine Voice Profile
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">POST /enroll</span>
          </div>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">
                  Speaker Identifier *
                </label>
                <input
                  id="enroll-speaker-id-input"
                  type="text"
                  placeholder="e.g. EMP-9001, CEO-JANE"
                  value={enrollId}
                  onChange={(e) => setEnrollId(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">
                  Display / Role Name (Optional)
                </label>
                <input
                  id="enroll-speaker-name-input"
                  type="text"
                  placeholder="e.g. Jane Doe (CEO)"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  disabled={isEnrolling}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            {/* Audio Upload for Enrollment */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">
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
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-white/50 hover:bg-white/90 shadow-inner"
                >
                  <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                  <div className="text-slate-800 font-bold">Select Reference Voice Audio</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">1.0s – 30.0s clean speech for 192-D biometric extraction</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-900 font-semibold truncate">{enrollFile.name}</span>
                    <span className="text-slate-500 text-[11px]">({(enrollFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrollFile(null)}
                    className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                <span>{enrollError}</span>
              </div>
            )}

            {enrollResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-[#009668]" />
                  Enrollment Successful!
                </div>
                <div className="text-slate-700 text-[11px] space-y-0.5 font-mono">
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
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
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
        <div id="verify-card" className="glass-card rounded-2xl p-6 space-y-5 shadow-lg border border-white/80">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <Fingerprint className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Standalone Biometric Verifier
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">POST /verify-speaker</span>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">
                  Select Enrolled Speaker *
                </label>
                <select
                  id="verify-speaker-select"
                  value={verifySpeakerId}
                  onChange={(e) => setVerifySpeakerId(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
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
                  <label className="font-semibold text-slate-800">
                    Threshold (τ):
                  </label>
                  <span className="font-mono text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{verifyThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={verifyThreshold}
                  onChange={(e) => setVerifyThreshold(parseFloat(e.target.value))}
                  disabled={isVerifying}
                  className="w-full accent-blue-600 mt-1"
                />
              </div>
            </div>

            {/* Query Audio Upload */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">
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
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-white/50 hover:bg-white/90 shadow-inner"
                >
                  <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                  <div className="text-slate-800 font-bold">Select Test Audio Stream</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Computes cosine similarity against enrolled 192-D vector</div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-slate-900 font-semibold truncate">{verifyFile.name}</span>
                    <span className="text-slate-500 text-[11px]">({(verifyFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerifyFile(null)}
                    className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {verifyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  verifyResult.match
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5">
                    {verifyResult.match ? (
                      <CheckCircle2 className="w-4 h-4 text-[#009668]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#ba1a1a]" />
                    )}
                    {verifyResult.match ? "BIOMETRIC MATCH (VERIFIED)" : "BIOMETRIC MISMATCH (DISCREPANCY)"}
                  </div>
                  <span className="font-mono text-[11px]">
                    Latency: {verifyResult.inference_time_ms} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <div>Cosine Similarity: <strong className="text-slate-900">{verifyResult.similarity_score}</strong></div>
                  <div>Decision Threshold: <strong className="text-slate-900">{verifyResult.threshold}</strong></div>
                  <div>Mismatch Flag (M): <strong className="text-slate-900">{verifyResult.speaker_mismatch_flag}</strong></div>
                  <div>Status: <strong className="text-slate-900">{verifyResult.status}</strong></div>
                </div>
              </div>
            )}

            <button
              id="submit-verify-btn"
              type="submit"
              disabled={isVerifying || !verifySpeakerId || !verifyFile}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
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
      <div id="enrolled-speakers-table" className="glass-card rounded-2xl p-6 space-y-4 shadow-lg border border-white/80">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Registered Speaker Profiles ({speakers.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">In-Memory 192-D Store</span>
        </div>

        {speakers.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/50 border border-slate-200 space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Speakers Enrolled Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enroll genuine executives, callers, or authorized users above to enable biometric mismatch fraud defense.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Speaker ID</th>
                  <th className="py-2.5 px-3 font-bold">Display Name</th>
                  <th className="py-2.5 px-3 font-bold">Embedding Vector</th>
                  <th className="py-2.5 px-3 font-bold">Enrolled At</th>
                  <th className="py-2.5 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {speakers.map((s) => (
                  <tr key={s.speaker_id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {s.speaker_id}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-800">
                      {s.speaker_name || "—"}
                    </td>
                    <td className="py-3 px-3 text-blue-600 font-bold">
                      192-D (L2 Norm)
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-sans flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(s.created_at * 1000).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setVerifySpeakerId(s.speaker_id);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-800 font-sans font-semibold transition-colors"
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

