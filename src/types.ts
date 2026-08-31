export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  supported_models: string[];
  hardware_profile?: string;
  phases_active?: number[];
}

export interface DeepfakeResult {
  prediction: "REAL" | "FAKE" | string;
  fake_probability: number;
  real_probability: number;
  model_type: string;
  model_id: string;
  inference_time_ms: number;
  disclaimer?: string | null;
}

export interface SpeakerVerificationDetail {
  status: "EVALUATED" | "NOT_EVALUATED" | "NOT_ENROLLED" | string;
  speaker_id?: string | null;
  similarity_score?: number | null;
  threshold?: number | null;
  is_match?: boolean | null;
  speaker_mismatch_flag?: number | null;
  inference_time_ms?: number | null;
}

export interface RiskSignals {
  fake_probability: number;
  speaker_mismatch: number;
  acoustic_anomaly: number;
  context_flag: number;
  speaker_verification_status: string;
  acoustic_model_status: string;
}

export interface AudioMetadata {
  sample_rate: number;
  original_duration_sec: number;
  processed_duration_sec: number;
  estimated_snr_db: number;
  rms_db: number;
}

export interface AnalyzeResponse {
  call_id: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  deepfake_detection: DeepfakeResult;
  speaker_verification: SpeakerVerificationDetail;
  risk_signals: RiskSignals;
  flags: string[];
  recommended_action: "ALLOW" | "WARN" | "SECONDARY_VERIFICATION" | "BLOCK" | string;
  audio_metadata: AudioMetadata;
}

export interface EnrollmentResponse {
  status: "ENROLLED" | string;
  speaker_id: string;
  speaker_name?: string | null;
  embedding_dimension: number;
  message: string;
  sample_rate_verified: number;
  inference_time_ms: number;
}

export interface VerifySpeakerResponse {
  status: string;
  speaker_id: string;
  similarity_score: number;
  threshold: number;
  match: boolean;
  speaker_mismatch_flag: number;
  inference_time_ms: number;
  message: string;
}

export interface EnrolledSpeaker {
  speaker_id: string;
  speaker_name?: string | null;
  dimension: number;
  created_at: number;
}

export interface SampleAudio {
  filename: string;
  url: string;
  description: string;
}

export interface CallContextState {
  speaker_id: string;
  verification_threshold: number;
  caller_id: string;
  is_caller_recognized: boolean;
  is_previously_flagged: boolean;
  claimed_role: string;
  requested_transaction_amount: string;
  normal_transaction_amount: string;
  is_urgent: boolean;
  urgency_reason: string;
  transcript_text: string;
}

export type LiveSessionStatus = "idle" | "chunking" | "streaming" | "listening" | "paused" | "completed" | "error";
export type LiveAnalysisMode = "microphone" | "simulation";

export interface AudioChunkWindow {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  blob: Blob;
  filename: string;
}

export interface LiveStreamAnalysisResult {
  session_id: string;
  call_id: string;
  window_index: number;
  server_latency_ms: number;
  window_duration_sec: number;
  sample_rate: number;
  fake_probability: number;
  real_probability: number;
  acoustic_anomaly: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  recommended_action: "ALLOW" | "WARN" | "SECONDARY_VERIFICATION" | "BLOCK" | string;
  flags: string[];
  prosody_reasons: string[];
  prosody_metrics: Record<string, any>;
  deepfake_detection: DeepfakeResult;
  speaker_verification: SpeakerVerificationDetail;
  audio_metrics: AudioMetadata;
  timestamp: number;
}

export interface LiveChunkResult {
  chunkIndex: number;
  totalChunks: number;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  processingLatencyMs: number;
  response: AnalyzeResponse;
  timestamp: number;
}

