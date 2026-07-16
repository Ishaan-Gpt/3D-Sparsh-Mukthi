# Orpheus TTS — human voices for the classroom

[Orpheus-TTS](https://github.com/canopyai/Orpheus-TTS) is a 3B-parameter Llama-based
speech model with extremely human prosody and 8 distinct voices
(`tara, leah, jess, leo, dan, mia, zac, zoe`). The classroom assigns a **unique
voice to the teacher and to every classmate** so they all feel like different
real people.

## How it plugs in (nothing else changes)

```
speakLines()  →  POST /api/tts (proxy)  →  1. Orpheus (this server, if up)
                                           2. Gemini TTS   (existing path)
             →  browser speechSynthesis   3. final client-side fallback
```

If this server is not running, the proxy skips it (with a 60s back-off after a
failure) and the existing Gemini → browser chain works exactly as before.

## Option 0 — CPU machines (no NVIDIA GPU): `cpu_server.py` ✅ CURRENTLY IN USE

Orpheus (a 3B LLM) cannot run realtime on a CPU. `cpu_server.py` serves the
**same endpoint** powered by Kokoro-82M (near-SOTA neural TTS, realtime-ish on
CPU via ONNX), with each Orpheus voice name mapped to a distinct Kokoro voice —
so per-character voices are preserved and the proxy needs no changes.

```bash
cd orpheus-server
py -3.11 -m venv .venv
.venv\Scripts\pip install kokoro-onnx soundfile fastapi uvicorn
# model files (already downloaded): kokoro-v1.0.onnx + voices-v1.0.bin
.venv\Scripts\python cpu_server.py     # http://localhost:5005
```

## Option A — run this wrapper (needs an NVIDIA GPU, ~16GB VRAM)

```bash
cd orpheus-server
pip install -r requirements.txt
python server.py                 # http://localhost:5005
```

## Option B — any OpenAI-compatible Orpheus server

Community servers like `Orpheus-FastAPI` (GGUF, runs on smaller GPUs / LM Studio)
expose the same `POST /v1/audio/speech` endpoint — point the proxy at any of them.

## Enable it

Add to `proxy-server/.env`:

```
ORPHEUS_TTS_URL=http://localhost:5005
# ORPHEUS_TTS_MODEL=orpheus        # optional, model name passed through
```

Check `GET http://localhost:3001/api/health` → `providers.orpheusTTS: true`.
