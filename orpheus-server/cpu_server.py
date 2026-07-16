"""
CPU human-voice TTS server for the Virtual Classroom (no GPU needed).

Orpheus (3B LLM) cannot run realtime on a CPU, so this server provides the
SAME OpenAI-compatible endpoint the proxy already targets, powered by
Kokoro-82M (near-SOTA neural TTS that runs realtime on CPU via ONNX).
The classroom keeps its per-character voices: each Orpheus voice name is
mapped to a distinct Kokoro voice.

    POST /v1/audio/speech {"input": "...", "voice": "tara", "response_format": "wav"}
    -> audio/wav bytes (24 kHz mono 16-bit)

Run:
    py -3.11 -m venv .venv
    .venv\\Scripts\\pip install kokoro-onnx soundfile fastapi uvicorn
    (model files kokoro-v1.0.onnx + voices-v1.0.bin in this folder)
    .venv\\Scripts\\python cpu_server.py     # http://localhost:5005

Then in proxy-server/.env:  ORPHEUS_TTS_URL=http://localhost:5005
"""
import io
import os

import soundfile as sf
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))

# Orpheus voice name -> Kokoro voice (one distinct human voice per character)
VOICE_MAP = {
    "tara": "af_heart",     # Miss Anaya — warm female
    "leah": "af_sarah",
    "jess": "af_jessica",   # Miss Sarah — energetic female
    "leo": "am_michael",    # Mr. Vikram — calm male
    "dan": "am_adam",
    "mia": "af_nova",
    "zac": "am_puck",
    "zoe": "af_bella",
}

app = FastAPI(title="Kokoro CPU TTS (Orpheus-compatible) for Sparsh Mukthi 3D")
kokoro = Kokoro(os.path.join(HERE, "kokoro-v1.0.onnx"), os.path.join(HERE, "voices-v1.0.bin"))


class SpeechRequest(BaseModel):
    input: str
    voice: str = "tara"
    model: str = "orpheus"
    response_format: str = "wav"
    speed: float = 1.0


@app.get("/health")
def health():
    return {"ok": True, "engine": "kokoro-onnx (cpu)", "voices": sorted(VOICE_MAP)}


@app.post("/v1/audio/speech")
def speech(req: SpeechRequest):
    voice = VOICE_MAP.get(req.voice, req.voice if req.voice in VOICE_MAP.values() else "af_heart")
    samples, sample_rate = kokoro.create(req.input, voice=voice, speed=req.speed, lang="en-us")
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    return Response(content=buf.getvalue(), media_type="audio/wav")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5005)
