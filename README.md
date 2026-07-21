# Sparsh Mukthi 3D — AI Virtual Classroom

Sparsh Mukthi 3D is an interactive AI classroom for children in Classes 1–4 (roughly ages 6–10). It is designed for a child who needs more than a chatbot or a recorded video: a warm teacher leads a complete lesson, classmates ask questions, the child can interrupt with a doubt, and the lesson adapts while it is happening.

## The education problem

Many children studying independently do not have a patient teacher available for every question. Existing learning tools often give a static explanation, but do not create the feeling of a guided class or respond to confusion in context.

Sparsh Mukthi addresses that gap with a guided, spoken lesson that combines explanation, visual teaching, peer questions, student participation, step-by-step doubt solving, recap, quiz practice, and healthy screen breaks.

## What the student experiences

1. Choose a class, subject, topic, teacher style, classmates, and lesson length.
2. Enter a 3D classroom with an animated teacher and virtual classmates.
3. Hear a structured lesson delivered through speech while the whiteboard updates with the explanation.
4. Watch classmates raise their hands and ask topic-specific questions.
5. Raise a hand, use the button, or speak a doubt. The teacher pauses, answers it, writes steps on the board, and resumes the lesson.
6. Take a real interactive quiz on the whiteboard.
7. Receive enforced eye-rest and water breaks before continuing.

## Key implementation

- React, React Three Fiber, and Three.js power the classroom, avatars, camera choreography, and 3D scene.
- A lesson state machine drives `intro → teaching → peerQuestion → doubt → whiteboard → recap → quiz → break`, using actual speech completion events rather than arbitrary timers.
- The AI proxy generates strict JSON lesson plans containing teaching segments, board points, peer questions, doubt solutions, recap content, and quiz questions.
- Gemini is the primary structured-generation provider, with Claude and OpenAI fallbacks when configured.
- Browser speech recognition and speech synthesis provide a local fallback for participation and narration. The proxy also supports Gemini TTS and an optional Orpheus TTS server.
- MediaPipe webcam hand/face tracking supports local hand-raise interaction and attention-aware prompts.
- The whiteboard reveals points in sync with spoken sentences and becomes an interactive quiz surface.
- API keys stay on the server in `proxy-server/.env`; they are never placed in the frontend bundle.

## Run locally

Requirements: Node.js 18+ and a modern Chrome or Edge browser.

### 1. Configure the AI proxy

```bash
cd proxy-server
npm install
```

Create `proxy-server/.env` and add at least one provider key:

```env
GEMINI_API_KEY=your_key_here
# Optional fallbacks:
# CLAUDE_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
# Optional TTS server:
# ORPHEUS_TTS_URL=http://localhost:8000
```

### 2. Install and start the application

From the repository root:

```bash
npm install
npm run dev
```

The combined command starts the AI proxy on port `3001` and Vite on port `5174`. Open:

```text
http://localhost:5174
```

For separate processes, run `npm run dev:ai` and `npm run dev:web` in two terminals. The Vite proxy forwards `/api/*` requests to `http://localhost:3001`.

## Verification commands

```bash
npm run build
npm run lint
```

The browser experience requires microphone permission for voice input and camera permission only for the optional webcam hand/attention features. If no TTS provider is available, the app falls back to browser speech where supported.

## Hackathon submission details

### Category

Education — an AI-guided classroom for primary-school learners.

### Demo

- Live demo: **Add public deployment URL here**
- YouTube demo, under three minutes: **Add public video URL here**
- Test account: **Not required for the local build; add credentials here if the deployed demo requires them**

### Codex and GPT-5.6 usage

This project was developed with Codex using the GPT-5.6 Luna and Tera configurations available during development. Luna was used primarily for application, lesson-engine, AI-proxy, and interaction work. Tera was used primarily for the 3D classroom, avatar rigging, Three.js composition, camera choreography, and animation blending.

Examples of meaningful Codex-assisted work include:

- Designing the strict JSON lesson-plan schema and provider fallback orchestration in `proxy-server/proxy.js`.
- Building the speech-paced lesson engine and its interruption/resume behavior.
- Implementing peer-question sequencing, child-safe doubt handling, and the interactive quiz flow.
- Working through avatar cloning, animation cross-fades, whiteboard synchronization, and camera direction.
- Integrating local gesture/attention signals and the optional immersive solar-system learning module.

### Codex Session IDs

Codex Session ID for the main development conversation:

```text
019f7fcd-5db9-7f20-b5af-1f223e1c7a39
```

Additional development sessions, if required by the submission form:

```text
PASTE OTHER RELEVANT /feedback IDS HERE
```

The Session ID cannot be read from the repository or generated by the application. Before submitting, open each important Codex conversation, run `/feedback`, and copy the displayed ID into this section. If the submission form accepts only one ID, use the main development conversation and keep the others in this README.

## Honest readiness assessment

The strongest part of this project is that it demonstrates a complete learning loop rather than a single AI generation call. The lesson is structured, spoken, visual, interruptible, and assessed. That gives it a credible Education-category story and a memorable demo.

The biggest submission risks are operational, not the absence of the Sol configuration:

- A public live demo and public YouTube video still need to be added.
- The demo must be tested with the exact environment and API keys used by judges.
- The README should be accompanied by a short, polished walkthrough showing one lesson, one peer question, one live doubt, and the quiz.
- Provider and TTS fallbacks need a visible failure state if an external model or browser speech feature is unavailable.
- The repository currently has no meaningful automated test suite, so the final smoke test should cover lesson generation, speech progression, doubt interruption/resume, quiz selection, and break resume.

You do not need Sol to make a credible submission. Do not claim that Sol was used. Clearly documenting that the project was built with the available Luna and Tera GPT-5.6 configurations is more trustworthy than inventing a configuration you did not use. Other teams may have more polish, but a working end-to-end classroom with meaningful student interaction is a stronger position than a visually impressive AI demo that only generates text.

## Credits and licensing

The 3D classroom scene and avatar assets are based on the original [3d-ai-school-threejs](https://github.com/theringsofsaturn/3d-ai-school-threejs) project by Emilian Kasemi. See the upstream project for its MIT license and attribution details.
