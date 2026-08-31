"""
Unit test for VoiceShield Streaming & Live Microphone Chunk Pipeline.
"""

import base64
import struct
import unittest
from scripts.run_pipeline import PipelineWorker
from app.utils.audio_utils import generate_synthetic_tone


class TestStreamingPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.worker = PipelineWorker()

    def _generate_pcm16_b64(self, freq: float = 440.0, duration_sec: float = 1.5) -> str:
        waveform = generate_synthetic_tone(frequency=freq, duration_sec=duration_sec, sample_rate=16000)
        ints = [int(max(-1.0, min(1.0, s)) * 32767.0) for s in waveform]
        raw_bytes = struct.pack(f"<{len(ints)}h", *ints)
        return base64.b64encode(raw_bytes).decode("utf-8")

    def test_1_stream_chunk_pcm16_base64_inference(self):
        """Test streaming PCM16 base64 window processes without reloading models."""
        pcm_b64 = self._generate_pcm16_b64(freq=250.0, duration_sec=1.5)
        
        req = {
            "command": "stream-chunk",
            "args": {
                "pcm_bytes_b64": pcm_b64,
                "window_index": 1,
                "context": {
                    "caller_id": "+18005550199",
                    "claimed_role": "Executive Assistant",
                    "is_urgent": False,
                },
            },
        }

        res = self.worker.dispatch(req)
        self.assertEqual(res.get("status"), 200)
        data = res.get("data", {})

        # Verify all required milestone contract keys
        self.assertIn("fake_probability", data)
        self.assertIn("real_probability", data)
        self.assertIn("acoustic_anomaly", data)
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("recommended_action", data)
        self.assertIn("flags", data)
        self.assertIn("prosody_reasons", data)
        self.assertIn("prosody_metrics", data)
        self.assertIn("deepfake_detection", data)
        self.assertIn("pipeline_latency_ms", data)

        # Check probability bounds
        self.assertGreaterEqual(data["fake_probability"], 0.0)
        self.assertLessEqual(data["fake_probability"], 1.0)
        self.assertGreaterEqual(data["risk_score"], 0)
        self.assertLessEqual(data["risk_score"], 100)

    def test_2_stream_chunk_short_audio_rejection(self):
        """Test sub-minimum audio chunk triggers safe AudioTooShortError rejection."""
        pcm_b64 = self._generate_pcm16_b64(freq=250.0, duration_sec=0.2)
        req = {
            "command": "stream-chunk",
            "args": {
                "pcm_bytes_b64": pcm_b64,
                "window_index": 2,
            },
        }

        res = self.worker.dispatch(req)
        self.assertEqual(res.get("status"), 422)
        self.assertEqual(res.get("data", {}).get("error_type"), "AudioTooShortError")


if __name__ == "__main__":
    unittest.main()
