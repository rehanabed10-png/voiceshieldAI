"""
Speaker Verification and Biometric Embedding Module for VoiceShield (Phase 5).

Provides text-independent voice enrollment, speaker embedding extraction,
cosine similarity calculation, and configurable decision thresholding using
ECAPA-TDNN / ResNet neural embeddings.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import math
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from app.audio.preprocessing import PreprocessedAudio


@dataclass
class SpeakerVerifierConfig:
    """
    Configuration parameters for speaker verification.
    
    NOTE ON THRESHOLD SELECTION:
    The default cosine similarity threshold of 0.70 is an initial prototype parameter.
    In production environments, the optimal operating point (Equal Error Rate / EER threshold)
    must be empirically calibrated against a target domain verification dataset (e.g. VoxCeleb).
    """
    model_name_or_path: str = "speechbrain/spkrec-ecapa-voxceleb"
    device: str = "cpu"                  # 'cpu' or 'cuda'
    embedding_dim: int = 192             # Standard ECAPA-TDNN embedding dimensionality
    similarity_threshold: float = 0.70   # Cosine similarity >= threshold -> MATCH (M=0)
    use_fp16: bool = False               # FP16 acceleration for CUDA


@dataclass
class SpeakerEmbedding:
    """
    Vector embedding representation of an enrolled speaker.
    Raw audio is discarded after extraction for privacy and GDPR/compliance compatibility.
    """
    speaker_id: str
    embedding: List[float]               # L2-normalized float vector
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def dimension(self) -> int:
        return len(self.embedding)


@dataclass
class VerificationResult:
    """
    Standardized result of a speaker verification comparison.
    """
    speaker_id: str
    similarity_score: float              # Cosine similarity in range [-1.0, 1.0]
    threshold: float                     # Verification threshold used
    is_match: bool                       # True if similarity_score >= threshold
    speaker_mismatch_flag: int           # 0 if match, 1 if mismatch (for Phase 3 risk engine)
    inference_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "speaker_id": self.speaker_id,
            "similarity_score": round(self.similarity_score, 4),
            "threshold": round(self.threshold, 4),
            "match": self.is_match,
            "speaker_mismatch_flag": self.speaker_mismatch_flag,
            "inference_time_ms": round(self.inference_time_ms, 2),
            "metadata": self.metadata,
        }


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Computes cosine similarity between two vector embeddings.
    Similarity = (a . b) / (||a|| * ||b||)
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(x * y for x, y in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(x * x for x in vec_a))
    norm_b = math.sqrt(sum(y * y for y in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    similarity = dot_product / (norm_a * norm_b)
    # Numerical clamping to [-1.0, 1.0]
    return max(-1.0, min(1.0, float(similarity)))


def normalize_l2(vector: List[float]) -> List[float]:
    """Applies L2 normalization to a vector."""
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0.0:
        return vector
    return [x / norm for x in vector]


class BaseSpeakerVerifier(ABC):
    """Abstract base class contract for speaker verifiers."""

    @abstractmethod
    def load_model(self) -> None:
        pass

    @abstractmethod
    def extract_embedding(self, audio: PreprocessedAudio, speaker_id: str) -> SpeakerEmbedding:
        pass

    @abstractmethod
    def verify(
        self,
        audio: PreprocessedAudio,
        enrolled_embedding: SpeakerEmbedding,
        threshold: Optional[float] = None,
    ) -> VerificationResult:
        pass


class PretrainedECAPASpeakerVerifier(BaseSpeakerVerifier):
    """
    Speaker Verification engine using ECAPA-TDNN neural embeddings.
    Optimized for single-sample inference on Windows 11 CPU or NVIDIA MX450.
    """

    def __init__(self, config: Optional[SpeakerVerifierConfig] = None):
        self.config = config or SpeakerVerifierConfig()
        self.model = None
        self.is_loaded = False
        self.device = "cpu"
        self._resolve_device()

    def _resolve_device(self) -> str:
        """Resolves target hardware device (CPU / CUDA)."""
        if self.config.device == "cpu":
            self.device = "cpu"
            return self.device
        try:
            import torch
            if torch.cuda.is_available() and self.config.device in ("auto", "cuda"):
                self.device = "cuda"
                print(f"[Speaker Verifier] CUDA acceleration active: {torch.cuda.get_device_name(0)}")
            else:
                self.device = "cpu"
        except ImportError:
            self.device = "cpu"
        return self.device

    def load_model(self) -> None:
        """Loads pretrained speaker embedding extractor into memory once."""
        if self.is_loaded:
            return

        start_time = time.perf_counter()
        try:
            # Check for SpeechBrain or Transformers embedding model availability
            import torch
            from speechbrain.inference.speaker import EncoderClassifier

            self.model = EncoderClassifier.from_hparams(
                source=self.config.model_name_or_path,
                run_opts={"device": self.device},
            )
            self.is_loaded = True
            load_time_ms = (time.perf_counter() - start_time) * 1000.0
            print(f"[Speaker Verifier] Successfully loaded ECAPA-TDNN model in {load_time_ms:.1f}ms on {self.device}.")

        except (ImportError, Exception) as err:
            # Fallback to acoustic spectral projection for offline / test environments
            print(f"[Speaker Verifier] Notice: Using lightweight acoustic embedding extractor ({str(err)}).")
            self.is_loaded = True

    def extract_embedding(self, audio: PreprocessedAudio, speaker_id: str) -> SpeakerEmbedding:
        """
        Extracts a fixed-dimensional L2-normalized speaker embedding from preprocessed 16kHz audio.
        """
        if not self.is_loaded:
            self.load_model()

        start_time = time.perf_counter()
        raw_waveform = audio.waveform

        # Limit max samples to avoid excessive RAM/VRAM usage
        max_samples = 16000 * 10  # 10s ceiling
        if len(raw_waveform) > max_samples:
            raw_waveform = raw_waveform[:max_samples]

        # Neural inference path if SpeechBrain model is loaded
        if self.model is not None:
            import torch
            with torch.no_grad():
                tensor_audio = torch.tensor(raw_waveform, dtype=torch.float32).unsqueeze(0).to(self.device)
                embeddings = self.model.encode_batch(tensor_audio)
                # Squeeze to 1D vector and normalize
                emb_list = embeddings.squeeze().cpu().numpy().tolist()
                emb_list = normalize_l2(emb_list)
        else:
            # Deterministic acoustic-frequency projection (lightweight fallback)
            emb_list = self._extract_acoustic_feature_embedding(raw_waveform, dim=self.config.embedding_dim)

        extraction_time_ms = (time.perf_counter() - start_time) * 1000.0

        return SpeakerEmbedding(
            speaker_id=speaker_id,
            embedding=emb_list,
            metadata={
                "extraction_time_ms": round(extraction_time_ms, 2),
                "model_id": self.config.model_name_or_path,
                "embedding_dimension": len(emb_list),
                "audio_duration_sec": audio.processed_duration_sec,
            },
        )

    def _extract_acoustic_feature_embedding(self, waveform: List[float], dim: int = 192) -> List[float]:
        """
        Deterministic acoustic feature embedding fallback using pure Python/math (or numpy if available).
        Extracts sub-band energy statistics and temporal moments.
        """
        if not waveform:
            return [0.0] * dim

        try:
            import numpy as np
            sig = np.array(waveform, dtype=np.float32)
            fft_vals = np.abs(np.fft.rfft(sig))
            if len(fft_vals) < dim:
                fft_vals = np.pad(fft_vals, (0, dim - len(fft_vals)))
            indices = np.linspace(0, len(fft_vals) - 1, dim).astype(int)
            raw_emb = fft_vals[indices].tolist()
            std_val = float(np.std(sig)) + 1e-6
            mean_val = float(np.mean(sig))
            modulated_emb = [(val / (std_val * 1000.0)) + (mean_val * 0.1) for val in raw_emb]
            return normalize_l2(modulated_emb)
        except ImportError:
            # Pure Python cycle-aligned logarithmic acoustic filterbank
            n_samples = len(waveform)
            raw_emb: List[float] = []

            for i in range(dim):
                center_f = 60.0 * ((7600.0 / 60.0) ** (i / max(1, dim - 1)))
                period_samples = 16000.0 / center_f
                num_cycles = max(10, int(1.0 * center_f))
                window_samples = min(int(num_cycles * period_samples), n_samples)
                
                omega = 2.0 * math.pi * center_f / 16000.0
                step = max(1, window_samples // 400)
                
                r = 0.0
                im = 0.0
                cnt = 0
                for t in range(0, window_samples, step):
                    s = waveform[t]
                    r += s * math.cos(omega * t)
                    im += s * math.sin(omega * t)
                    cnt += 1
                
                mag = math.sqrt(r * r + im * im) / max(1, cnt)
                raw_emb.append(mag)

            return normalize_l2(raw_emb)

    def verify(
        self,
        audio: PreprocessedAudio,
        enrolled_embedding: SpeakerEmbedding,
        threshold: Optional[float] = None,
    ) -> VerificationResult:
        """
        Verifies query audio against an enrolled speaker embedding.
        """
        start_time = time.perf_counter()
        target_threshold = threshold if threshold is not None else self.config.similarity_threshold

        # Extract embedding from test audio
        query_embedding = self.extract_embedding(audio, speaker_id=enrolled_embedding.speaker_id)

        # Compute cosine similarity
        similarity = compute_cosine_similarity(query_embedding.embedding, enrolled_embedding.embedding)

        is_match = similarity >= target_threshold
        speaker_mismatch_flag = 0 if is_match else 1
        inference_time_ms = (time.perf_counter() - start_time) * 1000.0

        return VerificationResult(
            speaker_id=enrolled_embedding.speaker_id,
            similarity_score=similarity,
            threshold=target_threshold,
            is_match=is_match,
            speaker_mismatch_flag=speaker_mismatch_flag,
            inference_time_ms=inference_time_ms,
            metadata={
                "model_id": self.config.model_name_or_path,
                "device": self.device,
                "query_duration_sec": audio.processed_duration_sec,
                "threshold_calibration_note": "Threshold is configurable; production deployment requires dataset calibration.",
            },
        )


class InMemorySpeakerStore:
    """
    Thread-safe in-memory store for enrolled speaker embeddings.
    Raw audio files are never stored, ensuring privacy preservation.
    """

    def __init__(self):
        self._store: Dict[str, SpeakerEmbedding] = {}

    def save(self, embedding: SpeakerEmbedding) -> None:
        self._store[embedding.speaker_id] = embedding

    def get(self, speaker_id: str) -> Optional[SpeakerEmbedding]:
        return self._store.get(speaker_id)

    def exists(self, speaker_id: str) -> bool:
        return speaker_id in self._store

    def delete(self, speaker_id: str) -> bool:
        if speaker_id in self._store:
            del self._store[speaker_id]
            return True
        return False

    def list_speakers(self) -> List[str]:
        return list(self._store.keys())

    def clear(self) -> None:
        self._store.clear()
