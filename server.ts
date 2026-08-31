import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { ChildProcess, spawn } from "child_process";
import multer from "multer";
import os from "os";
import { createServer as createViteServer } from "vite";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocketServer, WebSocket, RawData } from "ws";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup JSON & Form parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup multer for temporary audio file storage
const upload = multer({
  dest: path.join(os.tmpdir(), "voiceshield_uploads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Helper to resolve the correct Python executable (virtualenv or system python)
function getPythonCommand(): string {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const venvPaths = [
    path.join(process.cwd(), "venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "bin", "python3"),
    path.join(process.cwd(), ".venv", "bin", "python"),
    path.join(process.cwd(), "venv", "bin", "python3"),
    path.join(process.cwd(), "venv", "bin", "python"),
  ];
  for (const p of venvPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

// ----------------------------------------------------
// PERSISTENT PYTHON INFERENCE DAEMON MANAGER
// ----------------------------------------------------
class PythonInferenceDaemonManager {
  private proc: ChildProcess | null = null;
  private stdoutBuffer: string = "";
  private isReady: boolean = false;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: { status: number; data: any }) => void;
      reject: (reason: any) => void;
      timer: NodeJS.Timeout;
    }
  > = new Map();
  private initPromise: Promise<void> | null = null;
  private reqSequence: number = 0;

  constructor() {
    this.ensureStarted();
    this.setupProcessExitHandlers();
  }

  private setupProcessExitHandlers(): void {
    const cleanup = () => {
      if (this.proc) {
        try {
          this.proc.kill("SIGTERM");
        } catch (e) {
          // ignore
        }
        this.proc = null;
      }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  private ensureStarted(): Promise<void> {
    if (this.proc && this.isReady) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      const pythonCmd = getPythonCommand();
      const scriptPath = path.join(process.cwd(), "scripts", "run_pipeline.py");

      console.log(`[PythonDaemonManager] Starting persistent Python daemon with ${pythonCmd}...`);
      const child = spawn(pythonCmd, [scriptPath, "daemon"]);
      this.proc = child;
      this.stdoutBuffer = "";
      this.isReady = false;

      child.stdout.on("data", (chunk: Buffer) => {
        this.stdoutBuffer += chunk.toString("utf-8");
        this.flushStdoutBuffer(resolve);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8").trim();
        if (text) {
          console.log(`[PythonDaemon:stderr] ${text}`);
        }
      });

      child.on("error", (err) => {
        console.error(`[PythonDaemonManager] Process error:`, err);
        this.handleProcessCrash(err);
      });

      child.on("exit", (code, signal) => {
        console.warn(`[PythonDaemonManager] Process exited with code ${code}, signal ${signal}`);
        this.handleProcessCrash(new Error(`Daemon exited with code ${code}`));
      });
    });

    return this.initPromise;
  }

  private flushStdoutBuffer(readyCallback?: () => void): void {
    let newlineIdx: number;
    while ((newlineIdx = this.stdoutBuffer.indexOf("\n")) !== -1) {
      const line = this.stdoutBuffer.substring(0, newlineIdx).trim();
      this.stdoutBuffer = this.stdoutBuffer.substring(newlineIdx + 1);

      if (!line) continue;

      try {
        const parsed = JSON.parse(line);

        // Check for startup ready sentinel
        if (parsed.status === "READY" && !this.isReady) {
          console.log(`[PythonDaemonManager] Persistent inference models ready.`);
          this.isReady = true;
          this.initPromise = null;
          if (readyCallback) readyCallback();
          continue;
        }

        // Match with pending request ID
        if (parsed.id && this.pendingRequests.has(parsed.id)) {
          const pending = this.pendingRequests.get(parsed.id)!;
          clearTimeout(pending.timer);
          this.pendingRequests.delete(parsed.id);

          pending.resolve({
            status: parsed.status || 200,
            data: parsed.data !== undefined ? parsed.data : parsed,
          });
        }
      } catch (e) {
        console.warn(`[PythonDaemonManager] Non-JSON or unparseable line: ${line}`);
      }
    }
  }

  private handleProcessCrash(err: Error): void {
    this.proc = null;
    this.isReady = false;
    this.initPromise = null;

    // Reject all pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.resolve({
        status: 500,
        data: {
          error_type: "DaemonCrashError",
          message: `Persistent inference worker crashed: ${err.message}`,
        },
      });
    }
    this.pendingRequests.clear();
  }

  public async request(command: string, args: Record<string, any> = {}): Promise<{ status: number; data: any }> {
    try {
      await this.ensureStarted();
    } catch (e) {
      console.warn(`[PythonDaemonManager] Failed to start persistent daemon, falling back to CLI runner...`);
      return this.runCliFallback(command, args);
    }

    if (!this.proc || !this.proc.stdin || !this.proc.stdin.writable) {
      return this.runCliFallback(command, args);
    }

    const reqId = `req_${Date.now()}_${++this.reqSequence}`;
    const payload = JSON.stringify({ id: reqId, command, args }) + "\n";

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          resolve({
            status: 504,
            data: {
              error_type: "InferenceTimeoutError",
              message: "ML inference request timed out.",
            },
          });
        }
      }, 90000); // 90 seconds timeout

      this.pendingRequests.set(reqId, { resolve, reject, timer });

      try {
        this.proc!.stdin!.write(payload, "utf-8", (err) => {
          if (err) {
            clearTimeout(timer);
            this.pendingRequests.delete(reqId);
            resolve({
              status: 500,
              data: {
                error_type: "DaemonWriteError",
                message: `Failed to write request to daemon: ${err.message}`,
              },
            });
          }
        });
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);
        resolve({
          status: 500,
          data: {
            error_type: "DaemonWriteError",
            message: `Failed to send request: ${err.message}`,
          },
        });
      }
    });
  }

  // Safety fallback to one-shot CLI runner if daemon is not available
  private runCliFallback(command: string, args: Record<string, any>): Promise<{ status: number; data: any }> {
    return new Promise((resolve) => {
      const pythonCmd = getPythonCommand();
      const scriptPath = path.join(process.cwd(), "scripts", "run_pipeline.py");
      const cliArgs = [scriptPath, command];

      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null) {
          const flag = `--${k.replace(/_/g, "-")}`;
          cliArgs.push(flag, String(v));
        }
      }

      const proc = spawn(pythonCmd, cliArgs);
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (c) => (stdout += c.toString()));
      proc.stderr.on("data", (c) => (stderr += c.toString()));

      proc.on("close", (code) => {
        const lines = stdout.trim().split("\n");
        let jsonStr = "";
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith("{") && line.endsWith("}")) {
            jsonStr = line;
            break;
          }
        }
        if (code === 0 && jsonStr) {
          try {
            return resolve({ status: 200, data: JSON.parse(jsonStr) });
          } catch (e) {
            // fallthrough
          }
        }
        return resolve({
          status: code === 0 ? 200 : 500,
          data: { error_type: "CliFallbackError", message: stderr || stdout || "Execution failed." },
        });
      });

      proc.on("error", (err) => {
        resolve({
          status: 500,
          data: { error_type: "SpawnError", message: err.message },
        });
      });
    });
  }
}

// Instantiate daemon manager singleton
const daemonManager = new PythonInferenceDaemonManager();

// ----------------------------------------------------
// SUPABASE CLIENT & PERSISTENCE (Server-Side Only)
// ----------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log("[Supabase] Initialized backend database client successfully.");
  } catch (err: any) {
    console.warn("[Supabase] Failed to initialize client:", err.message);
  }
} else {
  console.log("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Telemetry persistence disabled.");
}

async function persistAnalysisToSupabase(
  resultData: any,
  params: Record<string, any>,
  reqBody: Record<string, any>
): Promise<void> {
  if (!supabase || !resultData || !resultData.call_id) {
    return;
  }

  try {
    // 1. Resolve textual speaker_id (e.g. SPK-001) to speakers.id (UUID)
    let speakerDbUuid: string | null = null;
    const requestedSpeakerId = params.speaker_id || reqBody.speaker_id;
    if (requestedSpeakerId) {
      const { data: speakerRow, error: spkErr } = await supabase
        .from("speakers")
        .select("id")
        .eq("speaker_id", String(requestedSpeakerId))
        .maybeSingle();

      if (!spkErr && speakerRow?.id) {
        speakerDbUuid = speakerRow.id;
      }
    }

    // 2. Resolve contact if caller_id or contact_id matches
    let contactDbUuid: string | null = null;
    if (reqBody.contact_id) {
      contactDbUuid = String(reqBody.contact_id);
    }

    const durationSec =
      resultData.audio_metadata?.processed_duration_sec ??
      resultData.audio_metadata?.original_duration_sec ??
      null;
    const nowIso = new Date().toISOString();
    const startedAtIso = durationSec
      ? new Date(Date.now() - Math.round(durationSec * 1000)).toISOString()
      : nowIso;

    // 3. Insert into calls table
    const { data: callRow, error: callErr } = await supabase
      .from("calls")
      .insert({
        call_id: resultData.call_id,
        speaker_id: speakerDbUuid,
        contact_id: contactDbUuid,
        caller_id: reqBody.caller_id ? String(reqBody.caller_id) : null,
        claimed_role: reqBody.claimed_role ? String(reqBody.claimed_role) : null,
        started_at: startedAtIso,
        ended_at: nowIso,
        duration_seconds: durationSec,
      })
      .select("id")
      .single();

    if (callErr) {
      console.warn("[Supabase:calls] Failed to insert call record:", callErr.message);
      return;
    }

    if (!callRow?.id) {
      return;
    }

    // 4. Map & sanitize risk_level to conform to CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'))
    let sanitizedRiskLevel: string | null = null;
    const rawRiskLevel = String(resultData.risk_level || "").toUpperCase();
    if (rawRiskLevel === "LOW" || rawRiskLevel === "MEDIUM" || rawRiskLevel === "HIGH") {
      sanitizedRiskLevel = rawRiskLevel;
    } else if (rawRiskLevel === "CRITICAL") {
      sanitizedRiskLevel = "HIGH";
    }

    // 5. Convert acoustic_anomaly to boolean (Schema is BOOLEAN NOT NULL)
    let acousticAnomalyBool: boolean = false;
    if (params.acoustic_anomaly !== undefined && params.acoustic_anomaly !== null) {
      acousticAnomalyBool =
        typeof params.acoustic_anomaly === "boolean"
          ? params.acoustic_anomaly
          : parseFloat(params.acoustic_anomaly) > 0;
    } else if (reqBody.acoustic_anomaly_override !== undefined && reqBody.acoustic_anomaly_override !== null) {
      acousticAnomalyBool = parseFloat(reqBody.acoustic_anomaly_override) > 0;
    }

    // 6. Insert into risk_events table
    const { error: riskErr } = await supabase.from("risk_events").insert({
      call_id: callRow.id,
      risk_score: typeof resultData.risk_score === "number" ? resultData.risk_score : null,
      risk_level: sanitizedRiskLevel,
      recommended_action: resultData.recommended_action ? String(resultData.recommended_action) : null,
      deepfake_prediction: resultData.deepfake_detection?.prediction
        ? String(resultData.deepfake_detection.prediction)
        : null,
      fake_probability:
        typeof resultData.deepfake_detection?.fake_probability === "number"
          ? resultData.deepfake_detection.fake_probability
          : null,
      speaker_similarity:
        typeof resultData.speaker_verification?.similarity_score === "number"
          ? resultData.speaker_verification.similarity_score
          : null,
      speaker_match:
        typeof resultData.speaker_verification?.is_match === "boolean"
          ? resultData.speaker_verification.is_match
          : null,
      speaker_verification_status: resultData.speaker_verification?.status
        ? String(resultData.speaker_verification.status)
        : null,
      speaker_mismatch_flag:
        typeof resultData.speaker_verification?.speaker_mismatch_flag === "number"
          ? resultData.speaker_verification.speaker_mismatch_flag
          : (resultData.risk_signals?.speaker_mismatch ?? 0),
      acoustic_anomaly: acousticAnomalyBool,
      caller_recognized: typeof params.is_caller_recognized === "boolean" ? params.is_caller_recognized : null,
      previously_flagged: typeof params.is_previously_flagged === "boolean" ? params.is_previously_flagged : null,
      transaction_amount: typeof params.requested_amount === "number" ? params.requested_amount : null,
      normal_transaction_amount: typeof params.normal_amount === "number" ? params.normal_amount : null,
      is_urgent: typeof params.is_urgent === "boolean" ? params.is_urgent : null,
      urgency_reason: params.urgency_reason ? String(params.urgency_reason) : null,
      model_id: resultData.deepfake_detection?.model_id ? String(resultData.deepfake_detection.model_id) : null,
      inference_time_ms:
        typeof resultData.deepfake_detection?.inference_time_ms === "number"
          ? resultData.deepfake_detection.inference_time_ms
          : null,
    });

    if (riskErr) {
      console.warn("[Supabase:risk_events] Failed to insert risk event record:", riskErr.message);
    }
  } catch (err: any) {
    console.warn("[Supabase:Catch] Error persisting analysis metadata:", err.message);
  }
}

// ----------------------------------------------------
// API ROUTES (FastAPI Parity Contracts)
// ----------------------------------------------------

// 1. Health check: /health and /api/health
const handleHealth = async (_req: express.Request, res: express.Response) => {
  const result = await daemonManager.request("health");
  res.status(result.status).json(result.data);
};
app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

// 2. List enrolled speakers: /api/speakers and /speakers
const handleListSpeakers = async (_req: express.Request, res: express.Response) => {
  const result = await daemonManager.request("list-speakers");
  res.status(result.status).json(result.data);
};
app.get("/speakers", handleListSpeakers);
app.get("/api/speakers", handleListSpeakers);

// 3. Samples catalog for quick browser testing
app.get("/api/samples", (_req, res) => {
  const samplesDir = path.join(process.cwd(), "data", "samples");
  if (!fs.existsSync(samplesDir)) {
    return res.json({ samples: [] });
  }

  const files = fs.readdirSync(samplesDir);
  const samples = files
    .filter((f) => f.endsWith(".wav") || f.endsWith(".mp3") || f.endsWith(".flac"))
    .map((f) => ({
      filename: f,
      url: `/data/samples/${f}`,
      description:
        f === "valid_speech.wav"
          ? "Standard 3.0s Clean Speech Sample (Expected: REAL / Low Risk)"
          : f === "real_01.wav"
          ? "Harmonic Human Speech Sample (Expected: REAL / Low Risk)"
          : f === "fake_01.wav"
          ? "High-Frequency Synthetic Voice Clone Sample (Expected: FAKE / High Risk)"
          : f === "too_short.wav"
          ? "Short 0.2s Audio Sample (Expected: AudioTooShortError)"
          : f === "silent_audio.wav"
          ? "Silent Audio Sample (Expected: AudioSilentError)"
          : f === "corrupted_file.wav"
          ? "Corrupted Header Sample (Expected: AudioCorruptError)"
          : f === "low_energy_hiss.wav"
          ? "Low Energy Background Audio"
          : f,
    }));

  res.json({ samples });
});

// Serve sample files statically
app.use("/data/samples", express.static(path.join(process.cwd(), "data", "samples")));

// 4. Ingest & Analyze: /analyze and /api/analyze
const handleAnalyze = async (req: express.Request, res: express.Response) => {
  const file = req.file;
  if (!file) {
    return res.status(422).json({
      error_type: "MissingFileError",
      message: "Audio file upload is required (.wav, .flac, .mp3).",
    });
  }

  const params: Record<string, any> = {
    file: file.path,
  };

  if (req.body.speaker_id) params.speaker_id = String(req.body.speaker_id);
  if (req.body.verification_threshold) params.threshold = parseFloat(req.body.verification_threshold);
  if (req.body.caller_id) params.caller_id = String(req.body.caller_id);
  if (req.body.is_caller_recognized !== undefined) {
    params.is_caller_recognized = String(req.body.is_caller_recognized).toLowerCase() === "true" || req.body.is_caller_recognized === true;
  }
  if (req.body.is_previously_flagged !== undefined) {
    params.is_previously_flagged = String(req.body.is_previously_flagged).toLowerCase() === "true" || req.body.is_previously_flagged === true;
  }
  if (req.body.claimed_role) params.claimed_role = String(req.body.claimed_role);
  if (req.body.requested_transaction_amount) {
    params.requested_amount = parseFloat(req.body.requested_transaction_amount);
  }
  if (req.body.normal_transaction_amount) {
    params.normal_amount = parseFloat(req.body.normal_transaction_amount);
  }
  if (req.body.is_urgent !== undefined) {
    params.is_urgent = String(req.body.is_urgent).toLowerCase() === "true" || req.body.is_urgent === true;
  }
  if (req.body.urgency_reason) params.urgency_reason = String(req.body.urgency_reason);
  if (req.body.transcript_text) params.transcript_text = String(req.body.transcript_text);
  if (req.body.acoustic_anomaly_override) {
    params.acoustic_anomaly = parseFloat(req.body.acoustic_anomaly_override);
  }

  try {
    const result = await daemonManager.request("analyze", params);
    res.status(result.status).json(result.data);

    // Asynchronously persist metadata in background without blocking response
    if (result.status === 200 && result.data && result.data.call_id) {
      persistAnalysisToSupabase(result.data, params, req.body).catch((dbErr) => {
        console.warn("[Supabase:AsyncError] Unhandled error during persistence:", dbErr.message);
      });
    }
  } finally {
    // Clean up uploaded temporary file immediately
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      // ignore
    }
  }
};

app.post("/analyze", upload.single("file"), handleAnalyze);
app.post("/api/analyze", upload.single("file"), handleAnalyze);

// 5. Speaker Enrollment: /enroll and /api/enroll
const handleEnroll = async (req: express.Request, res: express.Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      error_type: "MissingFileError",
      message: "Enrollment reference audio file is required.",
    });
  }

  const speakerId = req.body.speaker_id;
  if (!speakerId) {
    return res.status(400).json({
      error_type: "MissingParameterError",
      message: "Field 'speaker_id' is required for enrollment.",
    });
  }

  const params: Record<string, any> = {
    file: file.path,
    speaker_id: String(speakerId),
  };
  if (req.body.speaker_name) {
    params.speaker_name = String(req.body.speaker_name);
  }

  try {
    const result = await daemonManager.request("enroll", params);

    // Asynchronously synchronize speaker enrollment metadata with Supabase
    if (supabase && result.status === 200 && result.data?.speaker_id) {
      (async () => {
        try {
          const nowIso = new Date().toISOString();
          const { error } = await supabase.from("speakers").upsert(
            {
              speaker_id: result.data.speaker_id,
              speaker_name: result.data.speaker_name || params.speaker_name || null,
              status: "active",
              enrolled_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "speaker_id" }
          );
          if (error) {
            console.warn("[Supabase:speakers] Failed to sync enrolled speaker:", error.message);
          }
        } catch (e: any) {
          console.warn("[Supabase:speakers] Exception syncing enrolled speaker:", e?.message);
        }
      })();
    }

    res.status(result.status).json(result.data);
  } finally {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      // ignore
    }
  }
};

app.post("/enroll", upload.single("file"), handleEnroll);
app.post("/api/enroll", upload.single("file"), handleEnroll);

// 6. Speaker Verification: /verify-speaker and /api/verify-speaker
const handleVerifySpeaker = async (req: express.Request, res: express.Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      error_type: "MissingFileError",
      message: "Query verification audio file is required.",
    });
  }

  const speakerId = req.body.speaker_id;
  if (!speakerId) {
    return res.status(400).json({
      error_type: "MissingParameterError",
      message: "Field 'speaker_id' is required for verification.",
    });
  }

  const params: Record<string, any> = {
    file: file.path,
    speaker_id: String(speakerId),
  };
  if (req.body.threshold) {
    params.threshold = parseFloat(req.body.threshold);
  }

  try {
    const result = await daemonManager.request("verify-speaker", params);
    res.status(result.status).json(result.data);
  } finally {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      // ignore
    }
  }
};

app.post("/verify-speaker", upload.single("file"), handleVerifySpeaker);
app.post("/api/verify-speaker", upload.single("file"), handleVerifySpeaker);

// 7. Live Stream Chunk (REST Fallback): /stream-chunk and /api/stream-chunk
const handleStreamChunk = async (req: express.Request, res: express.Response) => {
  const { pcm_bytes_b64, samples, file, speaker_id, threshold, context, window_index, call_id } = req.body;
  if (!pcm_bytes_b64 && !samples && !file) {
    return res.status(400).json({
      error_type: "MissingPayloadError",
      message: "Supply 'pcm_bytes_b64', 'samples', or 'file' for stream chunk analysis.",
    });
  }

  try {
    const result = await daemonManager.request("stream-chunk", {
      pcm_bytes_b64,
      samples,
      file,
      speaker_id,
      threshold,
      context,
      window_index: window_index || 0,
      call_id,
    });
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(500).json({
      error_type: "InferenceError",
      message: err.message || "Failed to process stream chunk.",
    });
  }
};

app.post("/stream-chunk", handleStreamChunk);
app.post("/api/stream-chunk", handleStreamChunk);

// ----------------------------------------------------
// WEBSOCKET LIVE STREAMING ENDPOINT (/ws/live-stream)
// ----------------------------------------------------
function setupLiveStreamingWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws/live-stream" });

  console.log("[WebSocket] Live streaming WebSocket endpoint initialized on /ws/live-stream");

  wss.on("connection", (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || "unknown";
    const sessionId = `LIVE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    console.log(`[WebSocket:Connect] Client connected [${sessionId}] from ${clientIp}`);

    // Per-connection session state
    let rollingBuffer = Buffer.alloc(0);
    // 16 kHz mono 16-bit PCM = 32,000 bytes per second
    let windowDurationSec = 1.5;
    let windowSizeBytes = Math.round(windowDurationSec * 16000 * 2);
    // Maximum buffer capacity to prevent memory growth (3.0s = 96,000 bytes)
    const maxBufferSize = Math.round(3.0 * 16000 * 2);
    const minEvaluationIntervalMs = 350;

    let isAnalyzing = false;
    let lastAnalysisTime = 0;
    let windowIndex = 0;
    let speakerId: string | undefined = undefined;
    let threshold: number | undefined = undefined;
    let callContext: Record<string, any> = {};

    const evaluateWindow = async () => {
      if (isAnalyzing || rollingBuffer.length < windowSizeBytes) {
        return;
      }
      const now = Date.now();
      if (now - lastAnalysisTime < minEvaluationIntervalMs) {
        return;
      }

      isAnalyzing = true;
      lastAnalysisTime = now;
      windowIndex++;

      // Extract window from end of rolling buffer
      const windowBuf = rollingBuffer.subarray(rollingBuffer.length - windowSizeBytes);
      const base64Chunk = windowBuf.toString("base64");

      const startTime = performance.now();
      try {
        const result = await daemonManager.request("stream-chunk", {
          pcm_bytes_b64: base64Chunk,
          window_index: windowIndex,
          speaker_id: speakerId,
          threshold: threshold,
          context: callContext,
          call_id: sessionId,
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (ws.readyState === WebSocket.OPEN) {
          if (result.status === 200 && result.data) {
            ws.send(
              JSON.stringify({
                type: "analysis_result",
                session_id: sessionId,
                call_id: sessionId,
                window_index: windowIndex,
                server_latency_ms: latencyMs,
                window_duration_sec: windowDurationSec,
                sample_rate: 16000,
                fake_probability: result.data.fake_probability,
                real_probability: result.data.real_probability,
                acoustic_anomaly: result.data.acoustic_anomaly,
                risk_score: result.data.risk_score,
                risk_level: result.data.risk_level,
                recommended_action: result.data.recommended_action,
                flags: result.data.flags,
                prosody_reasons: result.data.prosody_reasons || [],
                prosody_metrics: result.data.prosody_metrics || {},
                deepfake_detection: result.data.deepfake_detection,
                speaker_verification: result.data.speaker_verification,
                audio_metrics: result.data.audio_metrics,
                timestamp: Date.now(),
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "analysis_error",
                session_id: sessionId,
                window_index: windowIndex,
                error: result.data?.message || "Inference error during live stream analysis.",
              })
            );
          }
        }
      } catch (err: any) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "analysis_error",
              session_id: sessionId,
              window_index: windowIndex,
              error: err.message || "Pipeline execution failed.",
            })
          );
        }
      } finally {
        isAnalyzing = false;
        // Keep buffer bounded
        if (rollingBuffer.length > maxBufferSize) {
          rollingBuffer = rollingBuffer.subarray(rollingBuffer.length - maxBufferSize);
        }
      }
    };

    ws.on("message", async (data: RawData, isBinary: boolean) => {
      try {
        if (isBinary) {
          // Direct binary PCM16 audio chunk from browser AudioWorklet or ScriptProcessor
          const chunkBuf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          rollingBuffer = Buffer.concat([rollingBuffer, chunkBuf]);
          await evaluateWindow();
        } else {
          // JSON control message or base64 audio payload
          const text = data.toString("utf-8");
          const msg = JSON.parse(text);

          if (msg.type === "config" || msg.type === "start") {
            if (msg.window_duration_sec && typeof msg.window_duration_sec === "number") {
              windowDurationSec = Math.max(0.8, Math.min(3.0, msg.window_duration_sec));
              windowSizeBytes = Math.round(windowDurationSec * 16000 * 2);
            }
            if (msg.speaker_id) speakerId = String(msg.speaker_id);
            if (msg.threshold !== undefined) threshold = parseFloat(msg.threshold);
            if (msg.context && typeof msg.context === "object") callContext = msg.context;

            ws.send(
              JSON.stringify({
                type: "session_ready",
                session_id: sessionId,
                window_duration_sec: windowDurationSec,
                window_size_bytes: windowSizeBytes,
                sample_rate: 16000,
                speaker_id: speakerId || null,
              })
            );
          } else if (msg.type === "audio_chunk" && msg.data) {
            const chunkBuf = Buffer.from(msg.data, "base64");
            rollingBuffer = Buffer.concat([rollingBuffer, chunkBuf]);
            await evaluateWindow();
          } else if (msg.type === "reset") {
            rollingBuffer = Buffer.alloc(0);
            windowIndex = 0;
            ws.send(JSON.stringify({ type: "session_reset", session_id: sessionId }));
          } else if (msg.type === "stop") {
            rollingBuffer = Buffer.alloc(0);
            ws.send(JSON.stringify({ type: "session_stopped", session_id: sessionId }));
          }
        }
      } catch (err: any) {
        console.warn(`[WebSocket:MessageError] ${err.message}`);
      }
    });

    ws.on("close", (code) => {
      console.log(`[WebSocket:Disconnect] Client disconnected [${sessionId}], code: ${code}`);
      rollingBuffer = Buffer.alloc(0);
    });

    ws.on("error", (err) => {
      console.warn(`[WebSocket:Error] Client [${sessionId}] error:`, err.message);
      rollingBuffer = Buffer.alloc(0);
    });

    // Send initial handshake acknowledgment
    ws.send(
      JSON.stringify({
        type: "connected",
        session_id: sessionId,
        endpoint: "/ws/live-stream",
        expected_audio_format: "16000Hz mono PCM16 (little-endian)",
        default_window_sec: windowDurationSec,
      })
    );
  });
}

// ----------------------------------------------------
// VITE INTEGRATION / STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Mount WebSocket streaming server on the HTTP server instance
  setupLiveStreamingWebSocket(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[VoiceShield Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
