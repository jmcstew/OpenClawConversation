"""WebSocket handler for the voice chat conversation pipeline."""

import json
import logging
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from .audio import AudioBuffer
from .elevenlabs_client import elevenlabs_client
from .openclaw_client import openclaw_client

logger = logging.getLogger(__name__)


class ConversationSession:
    """Manages a single voice conversation session."""

    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.audio_buffer = AudioBuffer()
        self.is_recording = False
        self.is_processing = False

    async def send_status(self, status: str, **kwargs) -> None:
        """Send a status update to the frontend."""
        message = {"type": "status", "status": status, **kwargs}
        await self.ws.send_json(message)

    async def send_error(self, error: str) -> None:
        """Send an error message to the frontend."""
        await self.ws.send_json({"type": "error", "error": error})

    async def handle_start_recording(self) -> None:
        """Handle the start of push-to-talk recording."""
        self.is_recording = True
        self.audio_buffer.clear()
        await self.send_status("listening")
        logger.info("Recording started")

    async def handle_stop_recording(self) -> None:
        """Handle the end of push-to-talk — process the audio pipeline."""
        self.is_recording = False
        logger.info(f"Recording stopped, buffer size: {self.audio_buffer.size_bytes} bytes")

        if not self.audio_buffer.has_data:
            logger.warning("No audio data received")
            await self.send_status("connected")
            return

        self.is_processing = True

        try:
            # Step 1: Transcribe audio
            await self.send_status("thinking", detail="Transcribing...")
            audio_data = self.audio_buffer.get_all()
            self.audio_buffer.clear()

            # Run transcription in thread pool (sync 11Labs SDK)
            transcript = await asyncio.to_thread(
                elevenlabs_client.transcribe, audio_data
            )

            if not transcript:
                logger.warning("Empty transcription result")
                await self.send_status("connected")
                return

            await self.send_status("thinking", detail="Anorak is thinking...",
                                   transcript=transcript)

            # Step 2: Send to OpenClaw/Anorak
            ai_response = await openclaw_client.send_message(transcript)

            if not ai_response:
                logger.warning("Empty AI response")
                await self.send_status("connected")
                return

            # Step 3: Convert to speech
            await self.send_status("speaking", text=ai_response)

            # Run TTS in thread pool (sync 11Labs SDK)
            audio_response = await asyncio.to_thread(
                elevenlabs_client.text_to_speech_stream, ai_response
            )

            # Step 4: Send audio back to frontend
            if audio_response:
                await self.ws.send_bytes(audio_response)

            # Signal that audio is complete
            await self.send_status("audio_complete")

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            await self.send_error(str(e))

        finally:
            self.is_processing = False
            await self.send_status("connected")

    async def handle_audio_chunk(self, data: bytes) -> None:
        """Handle incoming audio data chunk from the frontend."""
        if self.is_recording:
            self.audio_buffer.add_chunk(data)

    async def handle_disconnect(self) -> None:
        """Clean up on disconnect."""
        openclaw_client.clear_history()
        logger.info("Session disconnected, history cleared")


async def websocket_endpoint(websocket: WebSocket) -> None:
    """Main WebSocket endpoint handler."""
    await websocket.accept()
    session = ConversationSession(websocket)
    logger.info("WebSocket connection established")

    try:
        await session.send_status("connected")

        while True:
            # Receive either text (JSON control) or binary (audio) messages
            message = await websocket.receive()

            if "text" in message:
                # JSON control message
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type", "")

                    if msg_type == "start_recording":
                        await session.handle_start_recording()
                    elif msg_type == "stop_recording":
                        await session.handle_stop_recording()
                    elif msg_type == "clear_history":
                        openclaw_client.clear_history()
                        await session.send_status("connected")
                    elif msg_type == "ping":
                        await websocket.send_json({"type": "pong"})
                    else:
                        logger.warning(f"Unknown message type: {msg_type}")

                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")

            elif "bytes" in message:
                # Binary audio data
                await session.handle_audio_chunk(message["bytes"])

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        await session.handle_disconnect()
