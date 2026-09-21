# Codex session notes — uncommitted work-in-progress

This documents what a prior Codex session did in this repo, reconstructed from
the uncommitted changes it left in the working tree (there's no session log
to read from — this is a diff-by-diff reading of every modified and new
file). Nothing described here is committed yet; it's still sitting as local
changes (`git status`) as of this writing.

## 1. New feature: "Heart Journey" — a human heart immersive-study module

A second "Immersive Study" experience alongside the existing Solar System
tour, for the Science curriculum's new "The Human Heart and Blood Flow ❤️"
topic (added to classes 3 and 4 in `src/data/curriculum.js`).

- **`src/components/heart/HeartSystem.jsx`** — a small Three.js scene: four
  heart chambers (right/left atrium, right/left ventricle) as pulsing
  spheres, plus four Catmull-Rom curve "blood vessels" rendered as tubes with
  animated flowing particles along them. Chambers are clickable.
- **`src/components/heart/HeartHUD.jsx`** + **`Heart.css`** — the 2D overlay:
  a "choose" screen (Explore Chambers vs. Guided Blood-Flow Tour), an
  interact mode showing an info card per chamber on click, and a 4-step
  guided tour (right atrium → right ventricle → left atrium → left
  ventricle) with Back/Next.
- **`useLessonStore.js`** — new `appMode: "heart"` alongside `classroom` /
  `solar`, plus `heartMode`, `selectedHeartPart`, `heartTourStep` state and
  `enterHeart`/`exitHeart`/`setHeartMode`/etc. actions, wired the same way
  the Solar System module already was.
- **`App.jsx`** — renders `<HeartSystem/><HeartHUD/>` when `appMode === "heart"`.
- **`LessonHUD.jsx`** — a "❤️ Heart Journey" button, shown whenever
  `config.subject === "Science"`.

This module is functionally complete but visually minimal (tight one-liner
component bodies, no polish pass) — reads like a fast first draft rather than
a finished feature.

## 2. Teacher persona system: multiple 3D models, not just one

`src/components/world/Teacher.jsx` used to hardcode a single model
(`/models/cop/scene.gltf`). It now:

- Picks the model from `config.teacher.modelUrl` (falls back to
  `emilian-avatar.glb`).
- Looks up an `ANIM_CONFIG` entry per model URL for that rig's own clip names
  (the "cop" rig has different animation names than the Avaturn/Emilian
  rig); anything not listed falls back to the shared Avaturn clip set.
- While the teacher is speaking, cross-fades through a *rotating, randomized*
  set of talk-gesture clips (`greet`, `think`, `look_around`, `thanks`) every
  2-4 seconds instead of one static gesture, fading back to idle when speech
  stops.

`src/data/curriculum.js`'s `TEACHER_PRESETS` grew from 3 to 5 personas, each
now carrying a `modelUrl`:
- Miss Anaya, Mr. Vikram, Miss Sarah (existing, now explicit about which
  model they use — Anaya/Sarah on Emilian, Vikram on the cop rig)
- **Aswath Mu** (new, formal/warm, male voice) — uses the neutral Emilian rig
- **Ishaan** (new, "mysterious and wise", male voice) — uses `ishaan.glb`,
  a from-Emilian retarget carrying the full 8-clip animation set (see the
  code comment: `ishaan.glb` originally shipped with only a single unusable
  Mixamo backflip clip and was re-exported with Emilian's clips retargeted
  onto its skeleton).

**Left unresolved, per a comment in `curriculum.js`:** an "Anaya/Aswath model
swap" was attempted and rejected — a recolor-only reskin of the Emilian mesh
looked like "the same guy in different clothes," so both presets currently
point at the neutral unmodified rig instead. `public/models/anaya-avatar.glb`
and `aswath-avatar.glb` (~4.3MB / ~4.7MB) exist on disk as leftovers from that
rejected attempt but aren't referenced by any code.

## 3. TTS pipeline: reliability pass (`src/lib/tts.js`)

- **`preloadLines()`** (new, exported) — awaits (with a timeout) generating
  audio for a given set of lines before returning. `Dashboard.jsx` now calls
  this for the lesson's first 3 intro lines before entering the classroom,
  so the very first words the child hears are the real Kokoro/Orpheus voice,
  never the robot `speechSynthesis` fallback.
- **In-flight request dedupe** — concurrent calls for the same line+voice
  key now share one fetch instead of firing duplicates (a "warm cache"
  background job and a "need it now" playback request could previously race
  each other).
- **Live-request priority** — a `liveCount` counter tracks lines that must
  play *right now*; the background `warmSpeechCache` worker yields (polls
  every 250ms) while any live request is in flight, so the TTS server isn't
  competing with itself.
- **Temporary backoff instead of permanent fallback** — previously, 4
  consecutive TTS failures permanently switched the whole session to the
  browser voice (`serverTTSBroken = true`, never reset). Now it's a timed
  cooldown (`serverTTSBrokenUntil`, 75s) — the human voice automatically
  comes back later in the same class instead of being lost for the rest of
  the session.

## 4. Local Kokoro/Orpheus TTS server (`orpheus-server/cpu_server.py`)

- A `threading.Lock` now serializes ONNX generation calls — concurrent
  requests were slowing every request down (and tripping the proxy's
  timeout) on CPU; now they queue instead.
- A `@app.on_event("startup")` warmup generates one throwaway line
  ("Hello class!") at boot so the model's JIT/first-call overhead is already
  paid before the first real request arrives.

## 5. Production deployment plumbing (Vercel)

This is the through-line connecting most of the smaller diffs — getting all
three deployable pieces (root classroom app, `proxy-server`, `frontend`
marketing site) ready to run as separate Vercel deployments instead of only
`localhost`:

- **`src/lib/api.js`** — `API_BASE` is now exported and reads
  `import.meta.env.VITE_API_BASE`, falling back to same-origin (`""`) for
  local dev. `src/lib/webrtcBridge.js` and `src/webrtcBridge_local.js` both
  switched from a hardcoded `http://<hostname>:3001` to the same
  `API_BASE`-driven URL.
- **`proxy-server/proxy.js`** — explicit CORS middleware (headers set by
  hand, plus the `cors` package configured with `origin: "*"`, and an
  explicit `OPTIONS` preflight handler) so the deployed classroom app can
  call a proxy running on a different origin. The server now also exports
  `module.exports = app` and only calls `app.listen()` when run directly
  (`require.main === module`) — needed because Vercel imports the file as a
  serverless function rather than executing it as a long-running process.
- **`proxy-server/vercel.json`** (new) — `@vercel/node` build pointed at
  `proxy.js`, with CORS response headers and a catch-all rewrite.
  **`proxy-server/.vercelignore`**, **`proxy-server/.gitignore`** (new).
- **`frontend/src/lib/config.ts`** (new) — `CLASSROOM_URL`, reading
  `VITE_CLASSROOM_URL` at build time, falling back to
  `http://localhost:5174/`. Every hardcoded `href="http://localhost:5174/"`
  demo-class link across the landing page (`Hero.tsx`, `Analytics.tsx`,
  `AIIntelligence.tsx`, `SexyFooter.tsx`, `StoryCardShowcase.tsx`) was
  swapped to `href={CLASSROOM_URL}`.
- **Root `.vercelignore`** (new) — excludes the local-only `tools/gen3d`
  venv/model-cache/generated-output and `orpheus-server`'s venv/weights from
  any Vercel upload.
- **`.gitignore`** (root and `frontend/`) — added `.vercel`, plus ignores for
  `tools/gen3d`'s venv, Shap-E model cache, and generated `.obj`/`.glb`/`.ply`
  test output.

## 6. OpenAI fallback: switched from raw HTTP to the official SDK

`proxy-server/package.json` gained an `openai` (`^4.29.2`) dependency;
`proxy.js` now calls `openai.chat.completions.create(...)` via the SDK
client (`askOpenAIJSON`) instead of a hand-rolled HTTP call. Behavior
(last-resort fallback after Gemini and Claude both fail) is unchanged —
this is an implementation swap, not a new capability.

## 7. Landing page (`frontend/`): background-mask math rewrite

`frontend/src/components/ClassroomJourney.tsx` (~650 lines touched) replaces
its old `useMaskPositions`/`useImageWidth`/`useIsMobile` hook trio with a
single `useCoverMask` hook that does real CSS `background-size: cover` math
(comparing container aspect ratio to image aspect ratio to compute scale and
centering offsets) — fixing visible blank/white gaps that could appear
around the section's masked background image at certain viewport sizes.

## 8. New tool: `tools/gen3d/` — local offline text-to-3D

A small pipeline for generating simple static prop meshes from a text prompt
entirely offline, no API keys or cloud service:

- **`generate.py`** — runs Shap-E (OpenAI, MIT-licensed, CPU-only here) to
  turn a prompt into a `.obj` mesh with per-vertex color. ~10-12 min per
  generation at 16 diffusion steps, ~40+ min at the default 64 (better
  quality). First run downloads ~4GB of weights into
  `shap_e_model_cache/` (gitignored).
- **`convert_to_glb.py`** — a Blender `--background --python` script that
  bakes the per-vertex color into a material and exports `.glb`, for
  dropping into the Three.js scene.
- **`README.md`** — is explicit about the ceiling: Shap-E only produces
  *static* meshes (no skeleton/skinning/animation), so it's good for
  furniture/props/decoration and explicitly **not** a path to new rigged,
  animated characters like the Teacher/Student avatars — those still need a
  pre-rigged asset or a proper rigging pipeline.
- Two test outputs (`test_chair.glb`, `test_chair.obj`, `test_chair2.glb`)
  are sitting in the folder from trying this out — plausibly early
  exploration toward the "generate a bench for the students to sit on" idea,
  though nothing in the classroom scene currently references them.

## Loose ends / things worth a follow-up look

- `public/models/heart-download.json` — 58 bytes, sitting in `public/models/`
  next to the real `.glb` files. Too small to be a real asset; likely a
  stray artifact (e.g. a failed download's error response saved to disk by
  mistake) rather than intentional.
- The Heart Journey module has no curriculum-driven content yet — the four
  chamber descriptions in `HeartHUD.jsx` are hardcoded, unlike the rest of
  the app which gets its lesson content from the AI proxy.
- None of this is committed. `git status` still shows all of it as modified/
  untracked in the working tree.
