# Anorak Voice Chat

Real-time voice conversation with Anorak AI — powered by OpenClaw and ElevenLabs.

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python -m uvicorn app.main:app --reload --port 8513
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open Browser

Navigate to [http://localhost:5173](http://localhost:5173)

## Configuration

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | Voice ID (default: Beezle Wheezelby) |
| `OPENCLAW_URL` | OpenClaw gateway URL |
| `OPENCLAW_TOKEN` | OpenClaw auth token |

## How It Works

1. Click **Start Call** to connect
2. **Hold** the push-to-talk button and speak
3. **Release** to send — Anorak will respond with voice
4. Click **End Call** when done

## Architecture

```
Browser (React) ←→ WebSocket ←→ Python (FastAPI)
                                    ├── 11Labs Scribe (STT)
                                    ├── OpenClaw (Anorak AI)
                                    └── 11Labs TTS
```