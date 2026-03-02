"""OpenClaw client for communicating with the Anorak AI agent via CLI."""

import asyncio
import json
import logging

logger = logging.getLogger(__name__)


class OpenClawClient:
    """CLI client for sending messages to OpenClaw/Anorak."""

    def __init__(self):
        self.agent_id = "main"
        self.container = "openclaw-minimax_openclaw-gateway_1"
        self.cli_path = "/app/openclaw.mjs"

    async def send_message(self, user_message: str) -> str:
        """
        Send a user message to OpenClaw via CLI and get Anorak's response.

        Args:
            user_message: The transcribed user speech

        Returns:
            Anorak's text response
        """
        try:
            logger.info(f"Sending to OpenClaw CLI: '{user_message[:80]}...' "
                        if len(user_message) > 80
                        else f"Sending to OpenClaw CLI: '{user_message}'")

            process = await asyncio.create_subprocess_exec(
                "docker", "exec", "-i", self.container,
                self.cli_path, "agent",
                "--agent", self.agent_id,
                "--message", user_message,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=120,  # 2 minute timeout for AI response
            )

            if process.returncode != 0:
                error_msg = stderr.decode().strip() if stderr else "Unknown error"
                logger.error(f"OpenClaw CLI error (exit {process.returncode}): {error_msg}")
                raise Exception(f"OpenClaw CLI failed: {error_msg}")

            raw_output = stdout.decode().strip()

            if not raw_output:
                logger.warning("Empty response from OpenClaw CLI")
                return "I didn't have a response for that."

            # Parse JSON output
            try:
                data = json.loads(raw_output)
                ai_response = (
                    data.get("response")
                    or data.get("message")
                    or data.get("content")
                    or data.get("text")
                    or data.get("reply")
                    or str(data)
                )
            except json.JSONDecodeError:
                # If not valid JSON, use raw output as the response
                logger.warning("OpenClaw output was not JSON, using raw text")
                ai_response = raw_output

            logger.info(f"OpenClaw response: '{ai_response[:80]}...' "
                        if len(ai_response) > 80
                        else f"OpenClaw response: '{ai_response}'")

            return ai_response

        except asyncio.TimeoutError:
            logger.error("OpenClaw CLI timed out after 120 seconds")
            raise Exception("Anorak took too long to respond")
        except FileNotFoundError:
            logger.error("'openclaw' command not found in PATH")
            raise Exception("openclaw CLI not found — is it installed and in PATH?")
        except Exception as e:
            logger.error(f"OpenClaw error: {e}")
            raise

    def clear_history(self) -> None:
        """Clear conversation history (no-op for CLI mode)."""
        logger.info("Conversation history clear requested (CLI mode)")

    async def close(self) -> None:
        """No cleanup needed for CLI mode."""
        pass


# Singleton instance
openclaw_client = OpenClawClient()

