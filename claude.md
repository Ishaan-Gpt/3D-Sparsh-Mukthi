# Sparsh Mukthi 3D — AI Virtual Classroom (Classes 1–4)

A browser-based "Desktop VR" classroom for children aged 6–10. A real 3D classroom, a real AI teacher
who plans and delivers a structured lesson, virtual classmates who react and ask questions, a whiteboard
that solves the child's own doubt step-by-step, voice in/out, webcam hand-raise, and enforced study breaks.
No mockups — every layer is functional.

## 1. What actually exists (assets & keys)

- `public/models/classroom.glb` — 30MB classroom (desks, chairs, board, props). Static.
- `public/models/emilian-avatar.glb` — rigged Avaturn humanoid, animations:
  `IdleV4.2(maya_head)`, `greet`, `think`, `look_around`, `thanks`, `walking`, `running`, `fight`.
  No lip-sync morph targets → speaking is conveyed via gesture/animation blending + captions, not visemes.
- `public/models/emilian.glb` — same rig (used for classmate clones via `SkeletonUtils.clone`).
- `proxy-server/.env` — `GEMINI_API_KEY` (live, primary), plus `CLAUDE_API_KEY` / `OPENAI_API_KEY`
  fallbacks. Provider order: Gemini (`gemini-3-flash-preview` → `gemini-3.1-flash-lite`) → Claude → OpenAI.
- Optional `ORPHEUS_TTS_URL` in `proxy-server/.env` — points at an Orpheus TTS server
  (`orpheus-server/`, OpenAI-compatible `/v1/audio/speech`). TTS order: Orpheus (unique human voice
  per teacher AND per classmate, see `orpheusVoice` in `src/data/curriculum.js`) → Gemini TTS →
  browser speechSynthesis. Orpheus failures back off 60s and fall through automatically.
- "My Whiteboard": AI-designed notebook (`src/components/whiteboard/ExcalidrawBoard.jsx`, Excalidraw).
  The TEACHER controls the canvas — every finished page (intro, segments, doubts, recap) is archived
  in `boardPages` and laid out with banners/bullets/step chips, streaming live with speech. The child
  view is READ-ONLY; drawing unlocks only during quiz MCQs (schema `options`/`correctIndex`), and the
  engine waits until an option is ticked. A Remotion `@remotion/player` strip
  (`ConceptPlayer.jsx` + `animations.jsx`; schema field `visual: {kind, items, caption}`) plays an
  animated concept per segment. Current page mirrors onto the 3D plane via `src/lib/boardBridge.js`;
  every layer degrades gracefully (no Excalidraw → HTML notes; no Remotion → just no strip).
- Solar "eye" mode: 👁 button in the solar HUD swaps the space background for the child's mirrored
  webcam feed (`src/components/solar/EyeBackground.jsx`, transparent canvas) so planets float in the
  room and are touched via the existing gestures.
- Gestures: zoom is TWO-HANDED (spread both index tips apart = in, together = out; `zoomK`/`zoomVel`
  in `src/lib/gestureState.js`); ☝️ cursor with deadzone + adaptive easing; ✌️ click; ✋ 3s raise.
  `tools/virtual-mouse/virtual_mouse.py` is an optional companion that drives the REAL Windows
  cursor with the same gestures (browsers cannot move the OS pointer).

## 2. Architecture (user-oriented)

The user journey drives the architecture:

```
Dashboard (setup)  →  3D Classroom (lesson)  →  Break  →  Resume  →  Recap  →  End
      │                      │
      │                      ├─ Lesson Engine (deterministic phase machine, timers, events)
      │                      ├─ AI Orchestration (proxy-server: lesson plan JSON, doubt answers)
      │                      ├─ 3D layer (Teacher, Students, Whiteboard, CameraDirector)
      │                      ├─ Voice (TTS queue drives phases; hold-to-speak STT)
      │                      └─ Gesture (MediaPipe HandLandmarker → "hand raised" event)
      └─ writes LessonConfig into the zustand store
```

### Layers

1. **Setup Dashboard** (`src/components/dashboard/`) — kid-friendly full-screen form:
   class (1–4) → subject → topic (from `src/data/curriculum.js`), classmate count (2–6),
   teacher persona (name/style/voice), session length + break interval, optional custom doubt.
   On "Enter Classroom" it requests a full lesson plan from the AI, then mounts the scene.

2. **Lesson Engine** (`src/hooks/useLessonEngine.js` + `src/store/useLessonStore.js`) —
   a deterministic state machine. Phases:
   `loading → intro → teaching(segment i) → peerQuestion → teaching… → doubt → whiteboard → recap → end`,
   with `break` interruptions on a timer and `doubt` entered any time via hand-raise/chat/mic.
   **AI proposes content; the engine decides when it plays.** Every spoken line is a TTS utterance whose
   `onend` advances the machine — the lesson is literally paced by real speech.

3. **AI Orchestration** (`proxy-server/proxy.js`) —
   - `POST /api/lesson` → full lesson plan as strict JSON (intro, 3–4 teaching segments each with board
     bullets, peer questions with per-student attribution, custom-doubt solution steps, recap, quiz).
   - `POST /api/doubt` → child-safe answer + whiteboard steps for a live question, with lesson context.
   - `GET /api/health` → which provider is live.
   Child-safety system prompt on every call; Gemini first (structured `responseSchema` JSON), then
   Claude, then OpenAI.

4. **3D Scene** (`src/components/world/`) —
   - `Teacher.jsx` — animation state machine (idle/greet/think/look_around) with cross-fades; while the
     TTS engine is speaking it cycles talk-gestures and subtly moves the head bone.
   - `Students.jsx` — N `SkeletonUtils` clones with per-student material tint, scale jitter, desynced idle;
     a student plays `greet` (arm raise) when it's their peer-question turn.
   - `Whiteboard.jsx` — a `CanvasTexture` plane: lesson title + step-by-step lines are drawn (typewriter
     reveal) in sync with what the teacher is currently saying.
   - `CameraDirector.jsx` — `CameraControls`; frames the teacher during teaching, flies to the board
     during whiteboard/solving phases, pulls back for breaks.

5. **Interaction** —
   - Voice out: `src/lib/tts.js` — queued `speechSynthesis` with per-persona voice/pitch/rate and
     `onstart/onend` callbacks (drives captions, teacher animation, and phase advance).
   - Voice in: hold-to-speak `webkitSpeechRecognition` (Chrome/Edge).
   - Gesture: `src/hooks/useHandRaise.js` — MediaPipe `HandLandmarker` on a low-res webcam feed; an open
     hand held in the upper frame for ~700ms fires `raiseHand()`. Fully optional; a HUD ✋ button is the
     always-available fallback.

6. **HUD** (`src/components/hud/`) — phase chip, live captions, session/break timer, ✋ raise-hand,
   🎤 hold-to-speak, doubt input, break overlay (calm full-screen pause), end-of-lesson recap card.

## 3. Ports & running

- `npm run dev` → Vite on **5173** (frontend).
- `cd proxy-server && node proxy.js` → AI proxy on **3001**.
- Frontend calls the proxy at `http://localhost:3001`.

## 4. Non-negotiables

- Real AI responses only — no canned lesson text in the client except loading/error states.
- Child-appropriate output enforced in the proxy system prompt (age 6–10, simple words, warm tone).
- Everything degrades gracefully: no webcam → button; no STT → typing; AI down → clear friendly error.
- No raw audio/video ever leaves the browser; webcam frames are processed locally by MediaPipe.

## 5. Extension hooks (later)

Blender MCP for new rooms/props; Avaturn avatars with visemes for true lip-sync; multi-room scenes;
parent progress dashboard; networked multi-student sessions.
