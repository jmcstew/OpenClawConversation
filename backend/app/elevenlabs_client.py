"""ElevenLabs API client for Speech-to-Text (Scribe) and Text-to-Speech."""

import logging
import requests
from elevenlabs import ElevenLabs
from .config import settings

logger = logging.getLogger(__name__)


class ElevenLabsClient:
    """Handles all ElevenLabs API interactions."""

    def __init__(self):
        self._client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        self.tts_model = settings.ELEVENLABS_TTS_MODEL

    def transcribe(self, audio_data: bytes, language: str = "en") -> str:
        """
        Transcribe audio using ElevenLabs Scribe via REST API.

        Args:
            audio_data: Raw audio bytes (WebM/Opus from browser MediaRecorder)
            language: Language code for transcription

        Returns:
            Transcribed text string
        """
        try:
            logger.info(f"Sending {len(audio_data)} bytes to Scribe for transcription")

            response = requests.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": self.api_key},
                files={"file": ("audio.webm", audio_data, "audio/webm")},
                data={
                    "model_id": "scribe_v2",
                    "language_code": language,
                },
            )
            response.raise_for_status()
            result = response.json()

            transcript = result.get("text", "").strip()
            logger.info(f"Transcription result: '{transcript}'")
            return transcript

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise

    def text_to_speech_stream(self, text: str) -> bytes:
        """
        Convert text to speech using ElevenLabs TTS.

        Args:
            text: Text to convert to speech

        Returns:
            Audio bytes (MP3 format)
        """
        try:
            logger.info(f"TTS request: '{text[:80]}...' " if len(text) > 80 else f"TTS request: '{text}'")

            audio_generator = self._client.text_to_speech.convert(
                voice_id=self.voice_id,
                text=text,
                model_id=self.tts_model,
                output_format="mp3_44100_128",
            )

            # Collect all chunks into a single bytes object
            audio_chunks = []
            for chunk in audio_generator:
                audio_chunks.append(chunk)

            audio_data = b"".join(audio_chunks)
            logger.info(f"TTS generated {len(audio_data)} bytes of audio")
            return audio_data

        except Exception as e:
            logger.error(f"TTS error: {e}")
            raise

    def text_to_speech_stream_chunks(self, text: str) -> list[bytes]:
        """
        Convert text to speech, returning individual chunks for streaming.

        Args:
            text: Text to convert to speech

        Returns:
            List of audio byte chunks (MP3 format)
        """
        try:
            logger.info(f"TTS streaming request: '{text[:80]}...' " if len(text) > 80 else f"TTS streaming request: '{text}'")

            audio_generator = self._client.text_to_speech.convert(
                voice_id=self.voice_id,
                text=text,
                model_id=self.tts_model,
                output_format="mp3_44100_128",
            )

            chunks = list(audio_generator)
            logger.info(f"TTS generated {len(chunks)} chunks")
            return chunks

        except Exception as e:
            logger.error(f"TTS streaming error: {e}")
            raise


# Singleton instance
elevenlabs_client = ElevenLabsClient()
