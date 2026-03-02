"""OpenClaw client for communicating with the Anorak AI agent."""

import logging
import aiohttp
from .config import settings

logger = logging.getLogger(__name__)


class OpenClawClient:
    """HTTP client for sending messages to OpenClaw/Anorak."""

    def __init__(self):
        self.base_url = settings.OPENCLAW_URL.rstrip("/")
        self.token = settings.OPENCLAW_TOKEN
        self._session: aiohttp.ClientSession | None = None
        self._conversation_history: list[dict] = []

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session."""
        if self._session is None or self._session.closed:
            headers = {"Content-Type": "application/json"}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            self._session = aiohttp.ClientSession(headers=headers)
        return self._session

    async def send_message(self, user_message: str) -> str:
        """
        Send a user message to OpenClaw and get Anorak's response.

        Args:
            user_message: The transcribed user speech

        Returns:
            Anorak's text response
        """
        try:
            session = await self._get_session()

            # Add user message to history
            self._conversation_history.append({
                "role": "user",
                "content": user_message,
            })

            payload = {
                "messages": self._conversation_history,
            }

            logger.info(f"Sending to OpenClaw: '{user_message[:80]}...' "
                        if len(user_message) > 80
                        else f"Sending to OpenClaw: '{user_message}'")

            # Try common OpenClaw endpoints
            url = f"{self.base_url}/chat"

            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=60)) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenClaw error {response.status}: {error_text}")
                    raise Exception(f"OpenClaw returned status {response.status}: {error_text}")

                data = await response.json()

                # Try to extract response from common response formats
                ai_response = (
                    data.get("response")
                    or data.get("message")
                    or data.get("content")
                    or data.get("text")
                    or data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    or str(data)
                )

                # Add AI response to history
                self._conversation_history.append({
                    "role": "assistant",
                    "content": ai_response,
                })

                logger.info(f"OpenClaw response: '{ai_response[:80]}...' "
                            if len(ai_response) > 80
                            else f"OpenClaw response: '{ai_response}'")

                return ai_response

        except aiohttp.ClientError as e:
            logger.error(f"OpenClaw connection error: {e}")
            raise Exception(f"Failed to connect to OpenClaw at {self.base_url}: {e}")
        except Exception as e:
            logger.error(f"OpenClaw error: {e}")
            raise

    def clear_history(self) -> None:
        """Clear conversation history for a new session."""
        self._conversation_history.clear()
        logger.info("Conversation history cleared")

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None


# Singleton instance
openclaw_client = OpenClawClient()
