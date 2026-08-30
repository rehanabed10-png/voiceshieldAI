import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import multer from "multer";
import os from "os";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Setup JSON & Form parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup multer for temporary audio file storage
const upload = multer({
  dest: path.join(os.tmpdir(), "voiceshield_uploads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Helper function to resolve Python executable from project venv
function getPythonExecutable(): string {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const venvWindows = path.join(process.cwd(), "venv", "Scripts", "python.exe");
  const venvUnix = path.join(process.cwd(), "venv", "bin", "python");
  const dotVenvWindows = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  const dotVenvUnix = path.join(process.cwd(), ".venv", "bin", "python");

  if (fs.existsSync(venvWindows)) return venvWindows;
  if (fs.existsSync(venvUnix)) return venvUnix;
  if (fs.existsSync(dotVenvWindows)) return dotVenvWindows;
  if (fs.existsSync(dotVenvUnix)) return dotVenvUnix;

  return process.platform === "win32" ? "python" : "python3";
}

// Helper function to execute the Python pipeline CLI runner
function runPythonPipeline(args: string[]): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const pythonCmd = getPythonExecutable();
    const scriptPath = path.join(process.cwd(), "scripts", "run_pipeline.py");
    const fullArgs = [scriptPath, ...args];

    const proc = spawn(pythonCmd, fullArgs);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      // Clean stdout of any non-JSON prefix lines (like logger notices)
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
          const parsed = JSON.parse(jsonStr);
          return resolve({ status: 200, data: parsed });
        } catch (e) {
          return resolve({
            status: 500,
            data: { error_type: "ParseError", message: "Failed to parse Python pipeline response." },
          });
        }
      }

      // If error or stderr contains error JSON
      const errLines = stderr.trim().split("\n");
      let errJsonStr = "";
      for (let i = errLines.length - 1; i >= 0; i--) {
        const line = errLines[i].trim();
        if (line.startsWith("{") && line.endsWith("}")) {
          errJsonStr = line;
          break;
        }
      }

      if (errJsonStr) {
        try {
          const errParsed = JSON.parse(errJsonStr);
          return resolve({ status: errParsed.status || 400, data: errParsed });
        } catch (e) {
          // ignore
        }
      }

      return resolve({
        status: code === 0 ? 200 : 500,
        data: {
          error_type: "PipelineExecutionError",
          message: stderr.trim() || stdout.trim() || "Pipeline execution failed.",
        },
      });
    });

    proc.on("error", (err) => {
      resolve({
        status: 500,
        data: { error_type: "SpawnError", message: `Failed to spawn Python process: ${err.message}` },
      });
    });
  });
}

// ----------------------------------------------------
// API ROUTES (FastAPI Parity Contracts)
// ----------------------------------------------------

// 1. Health check: /health and /api/health
const handleHealth = async (_req: express.Request, res: express.Response) => {
  const result = await runPythonPipeline(["health"]);
  res.status(result.status).json(result.data);
};
app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

// 2. List enrolled speakers: /api/speakers and /speakers
const handleListSpeakers = async (_req: express.Request, res: express.Response) => {
  const result = await runPythonPipeline(["list-speakers"]);
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

  const args: string[] = ["analyze", "--file", file.path];

  if (req.body.speaker_id) args.push("--speaker-id", String(req.body.speaker_id));
  if (req.body.verification_threshold) args.push("--threshold", String(req.body.verification_threshold));
  if (req.body.caller_id) args.push("--caller-id", String(req.body.caller_id));
  if (req.body.is_caller_recognized !== undefined)
    args.push("--is-caller-recognized", String(req.body.is_caller_recognized));
  if (req.body.is_previously_flagged !== undefined)
    args.push("--is-previously-flagged", String(req.body.is_previously_flagged));
  if (req.body.claimed_role) args.push("--claimed-role", String(req.body.claimed_role));
  if (req.body.requested_transaction_amount)
    args.push("--requested-amount", String(req.body.requested_transaction_amount));
  if (req.body.normal_transaction_amount)
    args.push("--normal-amount", String(req.body.normal_transaction_amount));
  if (req.body.is_urgent !== undefined) args.push("--is-urgent", String(req.body.is_urgent));
  if (req.body.urgency_reason) args.push("--urgency-reason", String(req.body.urgency_reason));
  if (req.body.transcript_text) args.push("--transcript-text", String(req.body.transcript_text));
  if (req.body.acoustic_anomaly_override)
    args.push("--acoustic-anomaly", String(req.body.acoustic_anomaly_override));

  const result = await runPythonPipeline(args);

  // Clean up uploaded temporary file
  try {
    fs.unlinkSync(file.path);
  } catch (e) {
    // ignore
  }

  res.status(result.status).json(result.data);
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

  const args: string[] = ["enroll", "--file", file.path, "--speaker-id", String(speakerId)];
  if (req.body.speaker_name) {
    args.push("--speaker-name", String(req.body.speaker_name));
  }

  const result = await runPythonPipeline(args);

  try {
    fs.unlinkSync(file.path);
  } catch (e) {
    // ignore
  }

  res.status(result.status).json(result.data);
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

  const args: string[] = ["verify-speaker", "--file", file.path, "--speaker-id", String(speakerId)];
  if (req.body.threshold) {
    args.push("--threshold", String(req.body.threshold));
  }

  const result = await runPythonPipeline(args);

  try {
    fs.unlinkSync(file.path);
  } catch (e) {
    // ignore
  }

  res.status(result.status).json(result.data);
};

app.post("/verify-speaker", upload.single("file"), handleVerifySpeaker);
app.post("/api/verify-speaker", upload.single("file"), handleVerifySpeaker);

// ----------------------------------------------------
// VITE INTEGRATION / STATIC SERVING
// ----------------------------------------------------
async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VoiceShield Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
