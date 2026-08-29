import React, { useRef, useState } from "react";
import { Upload, FileAudio, Play, Pause, X, Music, CheckCircle2, AlertCircle } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update audio preview URL when selected file changes
  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="audio-upload-section" className="space-y-4">
      {/* Upload Box / Dropzone */}
      {!selectedFile ? (
        <div
          id="dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
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

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-200">
                Upload or Drop Audio Stream Recording
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Drag and drop audio file here, or click to browse. Resampled automatically to 16 kHz Mono for neural feature extraction.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-300">
              <span>Supported formats: <strong>WAV, FLAC, MP3, OGG</strong></span>
              <span className="text-slate-500">&bull;</span>
              <span>Duration: <strong>0.5s – 30.0s</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected Audio Card with Waveform / Player */
        <div id="selected-audio-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileAudio className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md">
                  {sampleName || selectedFile.name}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-medium">Ready for Ingestion</span>
                </div>
              </div>
            </div>

            <button
              id="clear-audio-btn"
              onClick={onClear}
              disabled={isProcessing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Remove selected file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Player and Visualizer */}
          {audioUrl && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />

              <button
                id="toggle-playback-btn"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center hover:bg-emerald-400 transition-transform active:scale-95 shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Simulated Acoustic Waveform Display */}
              <div className="flex-1 flex items-center gap-0.5 h-8 px-2 overflow-hidden">
                {[12, 28, 45, 75, 30, 90, 60, 40, 85, 95, 30, 50, 70, 40, 60, 80, 100, 45, 25, 65, 80, 50, 35, 90, 70, 45, 20, 60, 85, 30, 50, 75, 90, 60, 40, 80, 55, 35, 65, 95, 45, 25, 55, 75, 35, 60, 80, 45, 20].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      isPlaying
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-slate-700"
                    }`}
                    style={{
                      height: `${Math.max(15, h * (isPlaying ? 0.9 : 0.6))}%`,
                      animationDelay: `${(i % 10) * 80}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Test Samples Strip */}
      {samples.length > 0 && (
        <div id="test-samples-container" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              Quick Validation Samples:
            </span>
            <span className="text-[11px] text-slate-500">Click to instantly load test audio</span>
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
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
                >
                  <div className="mt-0.5 shrink-0">
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {s.filename}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {isValid ? "3.0s Speech (Valid)" : isShort ? "0.2s (Too Short)" : isSilent ? "Silent" : isCorrupt ? "Corrupt Header" : "Sample"}
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
