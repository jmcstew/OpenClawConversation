"""FastAPI application entry point for Anorak Voice Chat backend."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .websocket_handler import websocket_endpoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Anorak Voice Chat",
    description="Real-time voice conversation backend for Anorak AI",
    version="1.0.0",
)

# CORS middleware for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    config_issues = settings.validate()
    return {
        "status": "ok" if not config_issues else "degraded",
        "service": "anorak-voice-chat",
        "config_issues": config_issues,
    }


# WebSocket endpoint
app.websocket("/ws")(websocket_endpoint)


@app.on_event("startup")
async def startup_event():
    """Log startup info."""
    logger.info("=" * 60)
    logger.info("  Anorak Voice Chat Backend Starting")
    logger.info(f"  OpenClaw URL: {settings.OPENCLAW_URL}")
    logger.info(f"  11Labs Voice ID: {settings.ELEVENLABS_VOICE_ID}")
    logger.info(f"  TTS Model: {settings.ELEVENLABS_TTS_MODEL}")

    issues = settings.validate()
    if issues:
        for issue in issues:
            logger.warning(f"  ⚠ {issue}")
    else:
        logger.info("  ✓ All configuration valid")

    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
