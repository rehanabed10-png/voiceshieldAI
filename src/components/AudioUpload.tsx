import React, { useRef, useState, useEffect } from "react";
import { Upload, FileAudio, Play, Pause, X, Music, CheckCircle2, AlertCircle, ShieldCheck, Zap } from "lucide-react";
import { SampleAudio } from "../types";

interface AudioUploadProps {
  selectedFile: File | null;
  sampleName: string | null;
  onFileSelected: (file: File, name: string) => void;
  onClear: () => void;
  samples: SampleAudio[];
  onSelectSample: (sample: SampleAudio) => void;
  isProcessing: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({
  selectedFile,
  sampleName,
  onFileSelected,
  onClear,
  samples,
  onSelectSample,
  isProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update audio preview URL when selected file changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [selectedFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file, file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file, file.name);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 60 Waveform Heights for Stitch Visualizer
  const waveformHeights = [
    25, 45, 65, 30, 85, 95, 40, 60, 75, 90,
    35, 55, 80, 45, 65, 90, 100, 50, 30, 70,
    85, 55, 40, 95, 75, 50, 25, 65, 90, 35,
    55, 80, 95, 65, 45, 85, 60, 40, 70, 100,
    50, 30, 60, 80, 40, 65, 85, 50, 25, 70,
    85, 45, 60, 75, 35, 90, 55, 40, 65, 30
  ];

  const playProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div id="audio-upload-section" className="space-y-6">
      {/* Upload Box / Dropzone (Empty State) */}
      {!selectedFile ? (
        <div className="space-y-4">
          <div
            id="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`glass-card relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${
              isDragging
                ? "border-blue-500 bg-blue-500/10 shadow-xl"
                : "border-slate-300/80 hover:border-blue-500/60 hover:bg-white/80"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
              id="audio-file-input"
            />

            <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 mb-4 shadow-sm backdrop-blur-md">
              <Upload className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Upload Audio Payload for AI Analysis
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Drag and drop an audio file here, or click to browse. Resampled to 16 kHz Mono automatically for neural feature extraction.
            </p>

            <button
              type="button"
              className="bg-slate-900 text-white text-sm font-semibold py-2.5 px-6 rounded-xl shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Browse Files
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-500">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                WAV &bull; FLAC &bull; MP3 &bull; OGG
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                0.5s – 30.0s Duration
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                16 kHz Standardized
              </span>
            </div>
          </div>

          {/* Bento Compliance & Latency Cards (From Stitch Empty State) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Zero Retention & Security</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Raw audio streams are processed in-memory and purged immediately. Only mathematical embeddings are stored.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Millisecond Latency</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lightweight ECAPA-TDNN and Wav2Vec2 pipelines produce verifiable fraud confidence assessments in under 400ms.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Selected Audio Card with Stitch Liquid Glass Waveform & Player */
        <div id="selected-audio-card" className="glass-card rounded-2xl p-6 space-y-5">
          {/* Header Strip */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                <FileAudio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
                  {sampleName || selectedFile.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>&bull;</span>
                  <span className="text-blue-600 font-medium font-mono">Ready for Neural Ingestion</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white/80 px-3 py-1 rounded-full border border-slate-200 text-xs font-mono text-slate-700 shadow-sm">
                {formatTime(currentTime)} / {formatTime(duration || 3.0)}
              </div>
              <button
                id="clear-audio-btn"
                onClick={onClear}
                disabled={isProcessing}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Remove selected file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stitch Waveform Visualizer Area (Dark Slate with Cyber-Blue Bars) */}
          <div className="bg-[#0F172A] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden h-52 border border-slate-800 shadow-inner">
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
              />
            )}

            {/* Simulated Acoustic Waveform Container */}
            <div className="flex items-end justify-between h-28 w-full px-2">
              {waveformHeights.map((height, idx) => {
                const barPositionPercent = (idx / waveformHeights.length) * 100;
                const isPassed = barPositionPercent <= playProgressPercent;

                return (
                  <div
                    key={idx}
                    className="waveform-bar"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isPassed ? "#3B82F6" : "#334155",
                      opacity: isPassed ? 1 : 0.45,
                      boxShadow: isPassed && isPlaying ? "0 0 8px rgba(59, 130, 246, 0.6)" : "none",
                    }}
                  />
                );
              })}
            </div>

            {/* Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-blue-400 pointer-events-none transition-all duration-100 shadow-[0_0_10px_rgba(59,130,246,0.9)]"
              style={{ left: `${Math.max(2, Math.min(98, playProgressPercent))}%` }}
            />

            {/* Player Controls Bar */}
            <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-lg border border-slate-700/50 shadow-md mt-2">
              <button
                id="toggle-playback-btn"
                onClick={togglePlayback}
                className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-slate-100 transition-transform active:scale-95 shrink-0 shadow-sm"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-slate-950" />
                ) : (
                  <Play className="w-4 h-4 fill-current text-slate-950 ml-0.5" />
                )}
              </button>

              {/* Progress Slider */}
              <div
                className="flex-1 h-2 bg-slate-800 rounded-full relative cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  if (audioRef.current && duration > 0) {
                    audioRef.current.currentTime = ratio * duration;
                    setCurrentTime(ratio * duration);
                  }
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  style={{ width: `${playProgressPercent}%` }}
                />
              </div>

              <span className="text-xs font-mono text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration || 3.0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preset Test Samples Strip */}
      {samples.length > 0 && (
        <div id="test-samples-container" className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Music className="w-4 h-4 text-blue-600" />
              Quick Test Audio Samples (Zero Configuration):
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Click to load test audio payload
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {samples.map((s) => {
              const isShort = s.filename.includes("short");
              const isSilent = s.filename.includes("silent");
              const isCorrupt = s.filename.includes("corrupt");
              const isValid = s.filename.includes("valid");

              return (
                <button
                  key={s.filename}
                  id={`sample-btn-${s.filename.replace(/\W/g, "-")}`}
                  onClick={() => onSelectSample(s)}
                  disabled={isProcessing}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-white/80 hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all text-left group"
                >
                  <div className="mt-0.5 shrink-0">
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                      {s.filename}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono line-clamp-1">
                      {isValid
                        ? "3.0s Speech (Valid)"
                        : isShort
                        ? "0.2s (Too Short)"
                        : isSilent
                        ? "Silent Audio"
                        : isCorrupt
                        ? "Corrupt Bytes"
                        : "Sample"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

