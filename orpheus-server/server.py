"""
Orpheus TTS server for the Virtual Classroom.

Wraps canopyai/Orpheus-TTS (https://github.com/canopyai/Orpheus-TTS) in a tiny
OpenAI-compatible speech endpoint that proxy-server/proxy.js calls:

    POST /v1/audio/speech  {"input": "...", "voice": "tara", "response_format": "wav"}
    -> audio/wav bytes

Voices: tara, leah, jess, leo, dan, mia, zac, zoe — the classroom assigns a
unique one to the teacher and to every classmate so they all sound like
different real people.

Requires an NVIDIA GPU (the model is a 3B-param LLM served through vLLM).
If you don't run this server, the classroom automatically falls back to
Gemini TTS and then to the browser voice — nothing breaks.

Run:
    pip install -r requirements.txt
    python server.py            # listens on http://localhost:5005
Then in proxy-server/.env:
    ORPHEUS_TTS_URL=http://localhost:5005
"""
import io
import struct
import wave

from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel
from orpheus_tts import OrpheusModel

VOICES = {"tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"}
SAMPLE_RATE = 24000

app = FastAPI(title="Orpheus TTS for Sparsh Mukthi 3D")
model = OrpheusModel(model_name="canopylabs/orpheus-tts-0.1-finetune-prod")


class SpeechRequest(BaseModel):
    input: str
    voice: str = "tara"
    model: str = "orpheus"
    response_format: str = "wav"


@app.get("/health")
def health():
    return {"ok": True, "voices": sorted(VOICES)}


@app.post("/v1/audio/speech")
def speech(req: SpeechRequest):
    voice = req.voice if req.voice in VOICES else "tara"
    chunks = model.generate_speech(prompt=req.input, voice=voice)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for chunk in chunks:
            wf.writeframes(chunk)
    return Response(content=buf.getvalue(), media_type="audio/wav")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5005)
