"""
VoiceShield Pipeline Runner CLI.
Bridges backend REST/server handlers to the exact Phase 1–5 Python core implementation.
Preserves all Phase 1–5 algorithms, mathematical feature extractors, and risk engines.
"""

import argparse
import json
import os
import sys
import tempfile
import time
import uuid

# Add repository root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.audio.preprocessing import (
    AudioPreprocessor,
    PreprocessedAudio,
)
from app.utils.audio_utils import (
    AudioCorruptError,
    AudioError,
    AudioSilentError,
    AudioTooLongError,
    AudioTooShortError,
    FileNotFoundAudioError,
    UnsupportedFormatError,
)
from app.models.detector import VoiceCloneDetector
from app.models.speaker_verifier import (
    InMemorySpeakerStore,
    PretrainedECAPASpeakerVerifier,
    SpeakerEmbedding,
)
from app.risk.context import CallContext
from app.risk.scoring import VoiceShieldRiskEngine

# Persistent in-process or file-backed session store for speaker profiles
SPEAKER_STORE_FILE = os.path.join(tempfile.gettempdir(), "voiceshield_speaker_store.json")


def load_persistent_store() -> InMemorySpeakerStore:
    store = InMemorySpeakerStore()
    if os.path.exists(SPEAKER_STORE_FILE):
        try:
            with open(SPEAKER_STORE_FILE, "r") as f:
                data = json.load(f)
                for spk_id, item in data.items():
                    emb = SpeakerEmbedding(
                        speaker_id=item["speaker_id"],
                        embedding=item["embedding"],
                        created_at=item.get("created_at", time.time()),
                        metadata=item.get("metadata", {}),
                    )
                    store.save(emb)
        except Exception as e:
            sys.stderr.write(f"Warning loading speaker store: {e}\n")
    return store


def save_persistent_store(store: InMemorySpeakerStore):
    try:
        data = {}
        for spk_id in store.list_speakers():
            emb = store.get(spk_id)
            if emb:
                data[spk_id] = {
                    "speaker_id": emb.speaker_id,
                    "embedding": emb.embedding,
                    "created_at": emb.created_at,
                    "dimension": emb.dimension,
                    "metadata": emb.metadata,
                }
        with open(SPEAKER_STORE_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        sys.stderr.write(f"Warning saving speaker store: {e}\n")


def cmd_health():
    res = {
        "status": "ok",
        "service": "VoiceShield API",
        "version": "1.0.0 (Phase 5)",
        "supported_models": [
            "garystafford/wav2vec2-deepfake-voice-detector",
            "speechbrain/spkrec-ecapa-voxceleb",
        ],
        "hardware_profile": "8GB RAM + NVIDIA MX450 / CPU Optimized",
        "phases_active": [1, 2, 3, 4, 5],
    }
    print(json.dumps(res))


def cmd_analyze(args):
    audio_path = args.file
    speaker_id = args.speaker_id
    threshold = args.threshold
    caller_id = args.caller_id
    is_caller_recognized = args.is_caller_recognized
    is_previously_flagged = args.is_previously_flagged
    claimed_role = args.claimed_role
    requested_amount = args.requested_amount
    normal_amount = args.normal_amount
    is_urgent = args.is_urgent
    urgency_reason = args.urgency_reason
    transcript_text = args.transcript_text
    acoustic_anomaly = args.acoustic_anomaly or 0.0

    try:
        preprocessor = AudioPreprocessor()
        preprocessed = preprocessor.process(audio_path)

        detector = VoiceCloneDetector()
        detector.load()
        prediction_result = detector.predict(preprocessed)

        speaker_store = load_persistent_store()
        speaker_verifier = PretrainedECAPASpeakerVerifier()
        speaker_verifier.load_model()

        speaker_mismatch_signal = 0
        speaker_verification_status = "NOT_EVALUATED (No speaker_id supplied)"
        speaker_detail = {
            "status": "NOT_EVALUATED",
            "speaker_id": speaker_id,
            "similarity_score": None,
            "threshold": None,
            "is_match": None,
            "speaker_mismatch_flag": None,
            "inference_time_ms": None,
        }

        if speaker_id:
            enrolled = speaker_store.get(speaker_id)
            if enrolled:
                ver_res = speaker_verifier.verify(
                    audio=preprocessed,
                    enrolled_embedding=enrolled,
                    threshold=threshold,
                )
                speaker_mismatch_signal = ver_res.speaker_mismatch_flag
                speaker_verification_status = "EVALUATED (MATCH)" if ver_res.is_match else "EVALUATED (MISMATCH)"
                speaker_detail = {
                    "status": "EVALUATED",
                    "speaker_id": speaker_id,
                    "similarity_score": round(ver_res.similarity_score, 4),
                    "threshold": round(ver_res.threshold, 4),
                    "is_match": ver_res.is_match,
                    "speaker_mismatch_flag": ver_res.speaker_mismatch_flag,
                    "inference_time_ms": round(ver_res.inference_time_ms, 2),
                }
            else:
                speaker_verification_status = f"NOT_ENROLLED (Speaker '{speaker_id}' not found in registry)"
                speaker_detail = {
                    "status": "NOT_ENROLLED",
                    "speaker_id": speaker_id,
                    "similarity_score": None,
                    "threshold": None,
                    "is_match": None,
                    "speaker_mismatch_flag": None,
                    "inference_time_ms": None,
                }

        call_context = CallContext(
            caller_id=caller_id,
            is_caller_recognized=is_caller_recognized,
            is_previously_flagged=is_previously_flagged,
            claimed_role=claimed_role,
            requested_transaction_amount=requested_amount,
            normal_transaction_amount=normal_amount,
            is_urgent=is_urgent,
            urgency_reason=urgency_reason,
            transcript_text=transcript_text,
        )

        risk_engine = VoiceShieldRiskEngine()
        risk_assessment = risk_engine.evaluate(
            fake_probability=prediction_result.fake_probability,
            speaker_mismatch=speaker_mismatch_signal,
            acoustic_anomaly=acoustic_anomaly,
            context=call_context,
        )

        call_id = f"CALL-{uuid.uuid4().hex[:8].upper()}"

        res = {
            "call_id": call_id,
            "risk_score": risk_assessment.risk_score,
            "risk_level": risk_assessment.risk_level,
            "deepfake_detection": {
                "prediction": prediction_result.prediction,
                "fake_probability": round(prediction_result.fake_probability, 4),
                "real_probability": round(prediction_result.real_probability, 4),
                "model_type": prediction_result.metadata.get("model_type", "Wav2Vec2"),
                "model_id": prediction_result.metadata.get("model_id", "garystafford/wav2vec2-deepfake-voice-detector"),
                "inference_time_ms": round(prediction_result.metadata.get("inference_time_ms", 0.0), 2),
                "disclaimer": prediction_result.metadata.get("disclaimer"),
            },
            "speaker_verification": speaker_detail,
            "risk_signals": {
                "fake_probability": round(prediction_result.fake_probability, 4),
                "speaker_mismatch": speaker_mismatch_signal,
                "acoustic_anomaly": float(acoustic_anomaly),
                "context_flag": risk_assessment.signals.get("context_flag", 0.0),
                "speaker_verification_status": speaker_verification_status,
                "acoustic_model_status": "INPUT_SUPPLIED (Specialized Prosody Model Deferred)",
            },
            "flags": risk_assessment.flags,
            "recommended_action": risk_assessment.recommended_action,
            "audio_metadata": {
                "sample_rate": preprocessed.sample_rate,
                "original_duration_sec": round(preprocessed.original_duration_sec, 2),
                "processed_duration_sec": round(preprocessed.processed_duration_sec, 2),
                "estimated_snr_db": round(preprocessed.estimated_snr_db, 2),
                "rms_db": round(preprocessed.rms_energy_db, 2),
            },
        }
        print(json.dumps(res))
    except AudioTooShortError as err:
        sys.stderr.write(json.dumps({"error_type": "AudioTooShortError", "message": str(err), "status": 422}))
        sys.exit(1)
    except AudioTooLongError as err:
        sys.stderr.write(json.dumps({"error_type": "AudioTooLongError", "message": str(err), "status": 422}))
        sys.exit(1)
    except AudioSilentError as err:
        sys.stderr.write(json.dumps({"error_type": "AudioSilentError", "message": str(err), "status": 422}))
        sys.exit(1)
    except (AudioCorruptError, UnsupportedFormatError) as err:
        sys.stderr.write(json.dumps({"error_type": "AudioCorruptError", "message": str(err), "status": 400}))
        sys.exit(1)
    except FileNotFoundAudioError as err:
        sys.stderr.write(json.dumps({"error_type": "FileNotFoundAudioError", "message": str(err), "status": 404}))
        sys.exit(1)
    except Exception as err:
        sys.stderr.write(json.dumps({"error_type": "InferenceError", "message": str(err), "status": 500}))
        sys.exit(1)


def cmd_enroll(args):
    audio_path = args.file
    speaker_id = args.speaker_id
    speaker_name = args.speaker_name

    try:
        preprocessor = AudioPreprocessor()
        preprocessed = preprocessor.process(audio_path)

        speaker_verifier = PretrainedECAPASpeakerVerifier()
        speaker_verifier.load_model()
        speaker_store = load_persistent_store()

        start_time = time.perf_counter()
        embedding = speaker_verifier.extract_embedding(preprocessed, speaker_id=speaker_id)
        if speaker_name:
            embedding.metadata["speaker_name"] = speaker_name

        speaker_store.save(embedding)
        save_persistent_store(speaker_store)
        total_time_ms = (time.perf_counter() - start_time) * 1000.0

        res = {
            "status": "ENROLLED",
            "speaker_id": speaker_id,
            "speaker_name": speaker_name,
            "embedding_dimension": embedding.dimension,
            "message": f"Speaker '{speaker_id}' successfully enrolled ({preprocessed.processed_duration_sec:.2f}s audio processed).",
            "sample_rate_verified": preprocessed.sample_rate,
            "inference_time_ms": round(total_time_ms, 2),
        }
        print(json.dumps(res))
    except (AudioTooShortError, AudioTooLongError, AudioSilentError) as err:
        sys.stderr.write(json.dumps({"error_type": type(err).__name__, "message": str(err), "status": 422}))
        sys.exit(1)
    except (AudioCorruptError, UnsupportedFormatError) as err:
        sys.stderr.write(json.dumps({"error_type": type(err).__name__, "message": str(err), "status": 400}))
        sys.exit(1)
    except Exception as err:
        sys.stderr.write(json.dumps({"error_type": "InferenceError", "message": str(err), "status": 500}))
        sys.exit(1)


def cmd_verify_speaker(args):
    audio_path = args.file
    speaker_id = args.speaker_id
    threshold = args.threshold

    speaker_store = load_persistent_store()
    enrolled_embedding = speaker_store.get(speaker_id)
    if not enrolled_embedding:
        sys.stderr.write(json.dumps({
            "error_type": "SpeakerNotEnrolledError",
            "message": f"Speaker '{speaker_id}' has not been enrolled. Please enroll reference audio first.",
            "status": 404
        }))
        sys.exit(1)

    try:
        preprocessor = AudioPreprocessor()
        preprocessed = preprocessor.process(audio_path)

        speaker_verifier = PretrainedECAPASpeakerVerifier()
        speaker_verifier.load_model()

        ver_result = speaker_verifier.verify(
            audio=preprocessed,
            enrolled_embedding=enrolled_embedding,
            threshold=threshold,
        )

        match_desc = "MATCH (Voice verified)" if ver_result.is_match else "MISMATCH (Voice biometric discrepancy)"

        res = {
            "status": "SUCCESS",
            "speaker_id": speaker_id,
            "similarity_score": round(ver_result.similarity_score, 4),
            "threshold": round(ver_result.threshold, 4),
            "match": ver_result.is_match,
            "speaker_mismatch_flag": ver_result.speaker_mismatch_flag,
            "inference_time_ms": round(ver_result.inference_time_ms, 2),
            "message": f"Verification completed for speaker '{speaker_id}': {match_desc}.",
        }
        print(json.dumps(res))
    except (AudioTooShortError, AudioTooLongError, AudioSilentError) as err:
        sys.stderr.write(json.dumps({"error_type": type(err).__name__, "message": str(err), "status": 422}))
        sys.exit(1)
    except (AudioCorruptError, UnsupportedFormatError) as err:
        sys.stderr.write(json.dumps({"error_type": type(err).__name__, "message": str(err), "status": 400}))
        sys.exit(1)
    except Exception as err:
        sys.stderr.write(json.dumps({"error_type": "InferenceError", "message": str(err), "status": 500}))
        sys.exit(1)


def cmd_list_speakers():
    speaker_store = load_persistent_store()
    speakers = []
    for spk_id, emb in speaker_store._store.items():
        speakers.append({
            "speaker_id": emb.speaker_id,
            "speaker_name": emb.metadata.get("speaker_name"),
            "dimension": emb.dimension,
            "created_at": emb.created_at,
        })
    print(json.dumps({"status": "ok", "speakers": speakers}))


def main():
    parser = argparse.ArgumentParser(description="VoiceShield Pipeline CLI Runner")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Health
    subparsers.add_parser("health")

    # List Speakers
    subparsers.add_parser("list-speakers")

    # Analyze
    p_analyze = subparsers.add_parser("analyze")
    p_analyze.add_argument("--file", required=True)
    p_analyze.add_argument("--speaker-id", default=None)
    p_analyze.add_argument("--threshold", type=float, default=None)
    p_analyze.add_argument("--caller-id", default=None)
    p_analyze.add_argument("--is-caller-recognized", type=lambda x: str(x).lower() in ("true", "1"), default=True)
    p_analyze.add_argument("--is-previously-flagged", type=lambda x: str(x).lower() in ("true", "1"), default=False)
    p_analyze.add_argument("--claimed-role", default=None)
    p_analyze.add_argument("--requested-amount", type=float, default=None)
    p_analyze.add_argument("--normal-amount", type=float, default=None)
    p_analyze.add_argument("--is-urgent", type=lambda x: str(x).lower() in ("true", "1"), default=False)
    p_analyze.add_argument("--urgency-reason", default=None)
    p_analyze.add_argument("--transcript-text", default=None)
    p_analyze.add_argument("--acoustic-anomaly", type=float, default=0.0)

    # Enroll
    p_enroll = subparsers.add_parser("enroll")
    p_enroll.add_argument("--file", required=True)
    p_enroll.add_argument("--speaker-id", required=True)
    p_enroll.add_argument("--speaker-name", default=None)

    # Verify
    p_verify = subparsers.add_parser("verify-speaker")
    p_verify.add_argument("--file", required=True)
    p_verify.add_argument("--speaker-id", required=True)
    p_verify.add_argument("--threshold", type=float, default=None)

    args = parser.parse_args()

    if args.command == "health":
        cmd_health()
    elif args.command == "list-speakers":
        cmd_list_speakers()
    elif args.command == "analyze":
        cmd_analyze(args)
    elif args.command == "enroll":
        cmd_enroll(args)
    elif args.command == "verify-speaker":
        cmd_verify_speaker(args)


if __name__ == "__main__":
    main()
