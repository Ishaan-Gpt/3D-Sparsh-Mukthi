# 🏫 Sparsh Mukthi 3D — AI Virtual Classroom (Classes 1–4)

A browser-based "Desktop VR" school for children aged 6–10. Pick a class, subject, topic and
teacher on a kid-friendly dashboard — then step into a real 3D classroom where an AI teacher
plans and delivers a full spoken lesson: teaching segments with a live whiteboard, curious
classmates who raise their hands and ask questions, step-by-step solving of *your* doubt on the
board, enforced eye-rest breaks, a recap and a quiz.

Built on React Three Fiber + Three.js, powered by Gemini (`gemini-3-flash-preview`, structured
JSON lesson plans) with Claude/OpenAI fallbacks, browser speech synthesis/recognition, and
MediaPipe webcam hand-raise detection. See [claude.md](claude.md) for the full architecture.

## Features

- 🧭 **Setup dashboard** — class 1–4, subject → topic curriculum, teacher persona, classmate
  count, session length, break interval, and an optional custom doubt.
- 🧑‍🏫 **AI teacher avatar** — animation state machine (idle / think / gesture) driven by real
  TTS: the lesson is literally paced by speech, not timers.
- 🧒 **Virtual classmates** — skeleton-cloned avatars, desynced idles, and a real raised hand
  when it's their turn to ask the AI-written peer question.
- 📝 **Live whiteboard** — a canvas texture where headings, bullets and numbered solution steps
  appear in sync with what the teacher is saying; the camera flies in for solving.
- ✋ **Ask anytime** — button, voice (hold-to-speak), or raise your *real* hand at the webcam
  (MediaPipe, fully local). The teacher pauses, answers your question via the AI, writes steps
  on the board, then resumes exactly where she left off.
- 🧘 **Break enforcement** — timed calm-screen breaks with a countdown and early-resume.
- 🎬 **Camera direction** — cinematic shots per lesson phase; free orbit stays available.

## Run it

```bash
# 1. AI proxy (port 3001) — keys live in proxy-server/.env
#    GEMINI_API_KEY=... (primary), CLAUDE_API_KEY / OPENAI_API_KEY (fallbacks)
cd proxy-server && npm install && node proxy.js

# 2. Frontend (port 5173)
npm install
npm run dev
```

Open http://localhost:5173 in Chrome/Edge (best speech support), set up your class, and enter.

## Credits

3D classroom scene and avatar assets from the original
[3d-ai-school-threejs](https://github.com/theringsofsaturn/3d-ai-school-threejs) project by
Emilian Kasemi (MIT licensed).
