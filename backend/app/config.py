"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Configuration settings for the Anorak Voice Chat backend."""

    # 11Labs
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "BBfN7Spa3cqLPH1xAS22")
    ELEVENLABS_TTS_MODEL: str = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")

    # OpenClaw
    OPENCLAW_URL: str = os.getenv("OPENCLAW_URL", "http://localhost:18789")
    OPENCLAW_TOKEN: str = os.getenv("OPENCLAW_TOKEN", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8513"))

    def validate(self) -> list[str]:
        """Return list of missing required config values."""
        issues = []
        if not self.ELEVENLABS_API_KEY:
            issues.append("ELEVENLABS_API_KEY is not set")
        return issues


settings = Settings()
