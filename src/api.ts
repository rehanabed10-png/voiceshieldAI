import {
  AnalyzeResponse,
  EnrollmentResponse,
  HealthResponse,
  VerifySpeakerResponse,
  EnrolledSpeaker,
  SampleAudio,
  CallContextState,
} from "./types";

// Base API URL. In AI Studio, port 3000 routes both Vite frontend and Express proxy backend.
const API_BASE = "";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSpeakers(): Promise<EnrolledSpeaker[]> {
  try {
    const res = await fetch(`${API_BASE}/api/speakers`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.speakers || [];
  } catch (e) {
    return [];
  }
}

export async function fetchSamples(): Promise<SampleAudio[]> {
  try {
    const res = await fetch(`${API_BASE}/api/samples`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.samples || [];
  } catch (e) {
    return [];
  }
}

export async function analyzeAudio(
  audioFile: File | Blob,
  fileName: string,
  context: Partial<CallContextState>
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", audioFile, fileName);

  if (context.speaker_id && context.speaker_id.trim()) {
    formData.append("speaker_id", context.speaker_id.trim());
  }
  if (context.verification_threshold !== undefined) {
    formData.append("verification_threshold", String(context.verification_threshold));
  }
  if (context.caller_id && context.caller_id.trim()) {
    formData.append("caller_id", context.caller_id.trim());
  }
  if (context.is_caller_recognized !== undefined) {
    formData.append("is_caller_recognized", String(context.is_caller_recognized));
  }
  if (context.is_previously_flagged !== undefined) {
    formData.append("is_previously_flagged", String(context.is_previously_flagged));
  }
  if (context.claimed_role && context.claimed_role.trim()) {
    formData.append("claimed_role", context.claimed_role.trim());
  }
  if (context.requested_transaction_amount && Number(context.requested_transaction_amount) > 0) {
    formData.append("requested_transaction_amount", context.requested_transaction_amount);
  }
  if (context.normal_transaction_amount && Number(context.normal_transaction_amount) > 0) {
    formData.append("normal_transaction_amount", context.normal_transaction_amount);
  }
  if (context.is_urgent !== undefined) {
    formData.append("is_urgent", String(context.is_urgent));
  }
  if (context.urgency_reason && context.urgency_reason.trim()) {
    formData.append("urgency_reason", context.urgency_reason.trim());
  }
  if (context.transcript_text && context.transcript_text.trim()) {
    formData.append("transcript_text", context.transcript_text.trim());
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.detail?.message || data.detail || `Analysis request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).error_type = data.error_type || data.detail?.error_type || "AnalysisError";
    (err as any).status = res.status;
    throw err;
  }

  return data as AnalyzeResponse;
}

export async function enrollSpeaker(
  audioFile: File | Blob,
  fileName: string,
  speakerId: string,
  speakerName?: string
): Promise<EnrollmentResponse> {
  const formData = new FormData();
  formData.append("file", audioFile, fileName);
  formData.append("speaker_id", speakerId.trim());
  if (speakerName && speakerName.trim()) {
    formData.append("speaker_name", speakerName.trim());
  }

  const res = await fetch(`${API_BASE}/api/enroll`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.detail?.message || data.detail || `Enrollment failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).error_type = data.error_type || "EnrollmentError";
    throw err;
  }

  return data as EnrollmentResponse;
}

export async function verifySpeakerApi(
  audioFile: File | Blob,
  fileName: string,
  speakerId: string,
  threshold?: number
): Promise<VerifySpeakerResponse> {
  const formData = new FormData();
  formData.append("file", audioFile, fileName);
  formData.append("speaker_id", speakerId.trim());
  if (threshold !== undefined) {
    formData.append("threshold", String(threshold));
  }

  const res = await fetch(`${API_BASE}/api/verify-speaker`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.detail?.message || data.detail || `Verification failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).error_type = data.error_type || "VerificationError";
    throw err;
  }

  return data as VerifySpeakerResponse;
}
