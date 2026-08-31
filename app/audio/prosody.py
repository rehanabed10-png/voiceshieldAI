"""
Deterministic Prosody & Acoustic Anomaly Analysis Module for VoiceShield.

Analyzes fundamental frequency (F0) stability, pitch trajectory smoothness,
vocal jitter (pitch perturbation), vocal shimmer (amplitude perturbation),
and high-frequency spectral flux.

Used in real-time microphone streams and file evaluation to detect synthetic
speech artifacts without reloading models or generating fake numbers.
"""

from dataclasses import dataclass, field
import math
from typing import Any, Dict, List, Optional, Tuple

from app.audio.preprocessing import PreprocessedAudio


@dataclass
class ProsodyResult:
    """Standardized output of prosody and acoustic anomaly inspection."""
    acoustic_anomaly: float                     # Score [0.0, 1.0]
    prosody_reasons: List[str]                  # Explanatory reasons for acoustic anomalies
    metrics: Dict[str, Any] = field(default_factory=dict)
    inference_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "acoustic_anomaly": round(self.acoustic_anomaly, 4),
            "prosody_reasons": self.prosody_reasons,
            "metrics": self.metrics,
            "inference_time_ms": round(self.inference_time_ms, 2),
        }


class ProsodyAnalyzer:
    """
    Production-oriented Acoustic Anomaly & Prosody Engine.
    
    Inspects:
    1. F0 Fundamental Frequency estimation via Autocorrelation & Pitch Variation (Monotone vs Natural).
    2. Vocal Jitter (% cycle-to-cycle frequency variation).
    3. Vocal Shimmer (% cycle-to-cycle amplitude variation).
    4. High-frequency Spectral Flux & Phase Discontinuity.
    5. Energy Distribution / Frame pauses.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        frame_size_ms: float = 30.0,
        hop_size_ms: float = 15.0,
        min_f0_hz: float = 65.0,
        max_f0_hz: float = 450.0,
    ):
        self.sample_rate = sample_rate
        self.frame_length = int(sample_rate * (frame_size_ms / 1000.0))
        self.hop_length = int(sample_rate * (hop_size_ms / 1000.0))
        self.min_lag = int(sample_rate / max_f0_hz)
        self.max_lag = int(sample_rate / min_f0_hz)

    def _estimate_frame_f0(self, frame: List[float]) -> Tuple[float, float]:
        """
        Estimates fundamental frequency F0 (Hz) and voicing confidence using normalized autocorrelation
        with first-prominent-peak selection to prevent octave/subharmonic errors.
        Returns: (f0_hz, voicing_confidence [0.0, 1.0])
        """
        n = len(frame)
        if n < self.max_lag + 2:
            return 0.0, 0.0

        # Energy of the frame
        energy = sum(x * x for x in frame)
        if energy < 1e-6:
            return 0.0, 0.0

        max_val = max(abs(x) for x in frame)
        if max_val < 1e-4:
            return 0.0, 0.0

        clipping_threshold = 0.25 * max_val
        clipped = [
            (x - clipping_threshold) if x > clipping_threshold
            else (x + clipping_threshold) if x < -clipping_threshold
            else 0.0
            for x in frame
        ]

        corr_table: List[float] = [0.0] * (self.max_lag + 2)
        max_corr = 0.0

        for lag in range(self.min_lag, min(self.max_lag + 1, n - 1)):
            corr = 0.0
            norm1 = 0.0
            norm2 = 0.0
            for i in range(n - lag):
                c1 = clipped[i]
                c2 = clipped[i + lag]
                corr += c1 * c2
                norm1 += c1 * c1
                norm2 += c2 * c2

            denom = math.sqrt(norm1 * norm2) + 1e-9
            val = corr / denom
            corr_table[lag] = val
            if val > max_corr:
                max_corr = val

        if max_corr < 0.35:
            return 0.0, float(max_corr)

        # Pick the first local peak that is at least 70% of max_corr
        threshold = max(0.35, 0.70 * max_corr)
        chosen_lag = 0
        for lag in range(self.min_lag + 1, min(self.max_lag, n - 2)):
            if (
                corr_table[lag] >= threshold
                and corr_table[lag] >= corr_table[lag - 1]
                and corr_table[lag] >= corr_table[lag + 1]
            ):
                chosen_lag = lag
                break

        if chosen_lag == 0:
            # Fallback to argmax if no discrete local peak met threshold
            best_val = -1.0
            for lag in range(self.min_lag, min(self.max_lag + 1, n - 1)):
                if corr_table[lag] > best_val:
                    best_val = corr_table[lag]
                    chosen_lag = lag

        if chosen_lag > 0 and corr_table[chosen_lag] >= 0.35:
            f0 = self.sample_rate / float(chosen_lag)
            return f0, float(corr_table[chosen_lag])

        return 0.0, float(max_corr)

    def _compute_jitter_shimmer(
        self, f0_contour: List[float], frame_energies: List[float]
    ) -> Tuple[float, float]:
        """
        Computes Jitter (relative frequency perturbation) and Shimmer (relative amplitude perturbation).
        Natural human vocal folds produce ~0.5% - 2.5% jitter.
        TTS vocoders or cloned concatenations often have either near-zero (robotic) or erratic (>4%) jitter.
        """
        voiced_f0 = [f for f in f0_contour if f > 0.0]
        voiced_energies = [frame_energies[i] for i, f in enumerate(f0_contour) if f > 0.0]

        if len(voiced_f0) < 5:
            return 0.0, 0.0

        # Jitter: mean(|f0[i] - f0[i-1]|) / mean(f0)
        diff_f0 = sum(abs(voiced_f0[i] - voiced_f0[i - 1]) for i in range(1, len(voiced_f0)))
        mean_f0 = sum(voiced_f0) / len(voiced_f0)
        jitter_pct = (diff_f0 / (len(voiced_f0) - 1)) / (mean_f0 + 1e-9) * 100.0

        # Shimmer: mean(|amp[i] - amp[i-1]|) / mean(amp)
        diff_amp = sum(abs(voiced_energies[i] - voiced_energies[i - 1]) for i in range(1, len(voiced_energies)))
        mean_amp = sum(voiced_energies) / len(voiced_energies)
        shimmer_pct = (diff_amp / (len(voiced_energies) - 1)) / (mean_amp + 1e-9) * 100.0

        return jitter_pct, shimmer_pct

    def _compute_spectral_flux(self, waveform: List[float]) -> float:
        """
        Estimates spectral frame-to-frame change (flux).
        Synthetic speech vocoders frequently display frame boundary jumps or spectral flattening.
        """
        samples = waveform
        n = len(samples)
        if n < self.frame_length * 2:
            return 0.0

        # Compute simple bandpass energy deltas across frames
        num_frames = min(50, (n - self.frame_length) // self.hop_length)
        if num_frames < 2:
            return 0.0

        flux_acc = 0.0
        prev_diffs: List[float] = []

        for i in range(num_frames):
            frame = samples[i * self.hop_length : i * self.hop_length + self.frame_length]
            # High-frequency difference
            hf_diff = sum(abs(frame[j] - frame[j - 1]) for j in range(1, len(frame))) / len(frame)
            if prev_diffs:
                delta = abs(hf_diff - prev_diffs[-1])
                flux_acc += delta
            prev_diffs.append(hf_diff)

        avg_flux = flux_acc / max(1, num_frames - 1)
        return min(1.0, avg_flux * 50.0)

    def analyze(self, audio: PreprocessedAudio) -> ProsodyResult:
        """
        Analyzes preprocessed audio for prosodic naturalness vs synthetic acoustic artifacts.
        Returns a deterministic anomaly score [0.0, 1.0] and diagnostic reasons.
        """
        waveform = audio.waveform
        if not waveform or len(waveform) < self.frame_length:
            return ProsodyResult(
                acoustic_anomaly=0.0,
                prosody_reasons=["Audio frame insufficient for prosody window extraction."],
                metrics={},
            )

        n_samples = len(waveform)
        f0_contour: List[float] = []
        frame_energies: List[float] = []
        voiced_count = 0

        # Extract frames
        for start_idx in range(0, n_samples - self.frame_length, self.hop_length):
            frame = waveform[start_idx : start_idx + self.frame_length]
            # Frame RMS
            rms = math.sqrt(sum(x * x for x in frame) / len(frame))
            frame_energies.append(rms)

            f0, confidence = self._estimate_frame_f0(frame)
            f0_contour.append(f0)
            if f0 > 0.0:
                voiced_count += 1

        total_frames = max(1, len(f0_contour))
        voiced_ratio = voiced_count / total_frames

        # F0 statistics for voiced regions
        voiced_f0 = [f for f in f0_contour if f > 0.0]
        if voiced_f0:
            mean_f0 = sum(voiced_f0) / len(voiced_f0)
            variance_f0 = sum((f - mean_f0) ** 2 for f in voiced_f0) / len(voiced_f0)
            std_f0 = math.sqrt(variance_f0)
        else:
            mean_f0 = 0.0
            std_f0 = 0.0

        jitter_pct, shimmer_pct = self._compute_jitter_shimmer(f0_contour, frame_energies)
        spectral_flux = self._compute_spectral_flux(waveform)

        # Evaluate anomaly indicators
        reasons: List[str] = []
        anomaly_scores: List[float] = []

        # 1. Monotone / Lack of Pitch Variance (common in robotic or non-expressive TTS)
        if voiced_ratio > 0.35 and len(voiced_f0) >= 10:
            if std_f0 < 6.0:
                reasons.append(f"Atypical monotone pitch variance ({std_f0:.1f} Hz std dev, human baseline > 12 Hz)")
                anomaly_scores.append(0.65)
            elif std_f0 < 10.0:
                reasons.append(f"Restricted dynamic pitch expression ({std_f0:.1f} Hz variance)")
                anomaly_scores.append(0.35)

        # 2. Vocal Jitter anomalies
        if len(voiced_f0) >= 10:
            if jitter_pct < 0.10:
                # Unnaturally flat phase alignment
                reasons.append(f"Synthetic pitch phase locking (Vocal Jitter = {jitter_pct:.2f}%, below biological variance)")
                anomaly_scores.append(0.55)
            elif jitter_pct > 5.5:
                # Vocoder synthesis jitter noise
                reasons.append(f"Vocoder synthesis jitter irregularity ({jitter_pct:.2f}%)")
                anomaly_scores.append(0.70)
            elif jitter_pct > 3.8:
                reasons.append(f"Elevated pitch jitter ({jitter_pct:.2f}%)")
                anomaly_scores.append(0.30)

        # 3. Vocal Shimmer anomalies
        if len(voiced_f0) >= 10:
            if shimmer_pct > 28.0:
                reasons.append(f"Abnormal frame amplitude shimmer perturbation ({shimmer_pct:.1f}%)")
                anomaly_scores.append(0.40)

        # 4. Spectral flux discontinuity
        if spectral_flux > 0.45:
            reasons.append(f"High-frequency spectral flux discontinuity (score = {spectral_flux:.2f})")
            anomaly_scores.append(0.50)

        # Compile final acoustic anomaly score
        if anomaly_scores:
            # Weighted max with mild compounding
            base_score = max(anomaly_scores)
            avg_score = sum(anomaly_scores) / len(anomaly_scores)
            combined = min(1.0, max(0.0, (base_score * 0.7) + (avg_score * 0.3)))
        else:
            combined = 0.05  # Baseline natural speech
            reasons.append("Natural prosody, pitch contour, and vocal micro-dynamics observed")

        metrics = {
            "f0_mean_hz": round(mean_f0, 1),
            "f0_std_hz": round(std_f0, 1),
            "voiced_ratio": round(voiced_ratio, 3),
            "jitter_percent": round(jitter_pct, 2),
            "shimmer_percent": round(shimmer_pct, 2),
            "spectral_flux": round(spectral_flux, 3),
            "total_frames_evaluated": total_frames,
        }

        return ProsodyResult(
            acoustic_anomaly=round(combined, 4),
            prosody_reasons=reasons,
            metrics=metrics,
        )
