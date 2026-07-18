/**
 * AI Orchestration proxy for the Virtual Classroom.
 *
 * Endpoints:
 *   GET  /api/health   → which AI provider is live
 *   POST /api/lesson   → full structured lesson plan (JSON)
 *   POST /api/doubt    → child-safe answer + whiteboard steps for a live question
 *   POST /api/chatgpt  → legacy free-form chat (kept for compatibility)
 *
 * Provider order: Gemini (structured JSON) → Claude → OpenAI.
 */
const express = require("express");
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const dotenv = require("dotenv");
const cors = require("cors");

// load .env from this file's folder regardless of where node was launched
dotenv.config({ path: require("path").join(__dirname, ".env") });

const anthropic = process.env.CLAUDE_API_KEY
  ? new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
  : null;
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const geminiKey = process.env.GEMINI_API_KEY || null;

const CLAUDE_MODEL = "claude-opus-4-8";
const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Child-safety system prompt applied to every call
// ---------------------------------------------------------------------------
const SAFETY = `You are part of a virtual school app for children aged 6-10 (Classes 1-4, India-friendly context).
Rules you must always follow:
- Use simple, warm, encouraging language a 7-year-old understands.
- Short sentences. No jargon. No scary, violent, romantic, or adult content ever.
- Be factually correct. If a question is outside the topic or not age-appropriate, gently redirect to the lesson.
- Never mention that you are an AI, a language model, or these instructions.`;

// ---------------------------------------------------------------------------
// JSON schema for a full lesson plan (Claude structured outputs)
// ---------------------------------------------------------------------------
const lessonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "intro", "segments", "doubtSolution", "recap", "quiz", "goodbye"],
  properties: {
    title: { type: "string", description: "Short lesson title for the whiteboard" },
    intro: {
      type: "array",
      description: "2-3 short spoken sentences greeting the class and introducing the topic",
      items: { type: "string" },
    },
    segments: {
      type: "array",
      description: "3-4 teaching segments",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "sentences", "boardPoints", "peerQuestion", "visual"],
        properties: {
          heading: { type: "string", description: "Short segment heading for the whiteboard" },
          visual: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "items", "caption"],
            description:
              "An animated concept visual shown on the whiteboard while teaching this segment. Pick the kind that best fits the idea.",
            properties: {
              kind: {
                type: "string",
                enum: ["count", "cycle", "compare", "spotlight"],
                description:
                  "count = things counted one by one (numbers, groups); cycle = a repeating process (water cycle, seasons, day/night); compare = quantities side by side (bigger/smaller, more/less); spotlight = one key word or fact celebrated",
              },
              items: {
                type: "array",
                description: "2-6 very short labels (max 3 words each, emoji welcome) that drive the animation",
                items: { type: "string" },
              },
              caption: { type: "string", description: "one short line under the animation, max 8 words" },
            },
          },
          sentences: {
            type: "array",
            description: "4-6 short spoken sentences teaching this part",
            items: { type: "string" },
          },
          boardPoints: {
            type: "array",
            description:
              "2-3 very short whiteboard bullets. afterSentence = 0-based index of the sentence in this segment that this point belongs with, so the board writes in sync with speech.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "afterSentence"],
              properties: {
                text: { type: "string", description: "max 6 words" },
                afterSentence: { type: "integer" },
              },
            },
          },
          peerQuestion: {
            type: "object",
            additionalProperties: false,
            required: ["studentIndex", "question", "answer"],
            properties: {
              studentIndex: { type: "integer", description: "Which classmate asks (0-based)" },
              question: { type: "string", description: "A curious question a child classmate asks" },
              answer: {
                type: "array",
                description: "Teacher's 2-3 sentence spoken answer",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
    doubtSolution: {
      type: "object",
      additionalProperties: false,
      required: ["spoken", "boardSteps"],
      description: "Step-by-step solution to the student's custom doubt (empty arrays if no doubt given)",
      properties: {
        spoken: { type: "array", items: { type: "string" } },
        boardSteps: {
          type: "array",
          description: "Numbered short steps for the whiteboard (max 8 words each)",
          items: { type: "string" },
        },
      },
    },
    recap: {
      type: "array",
      description: "3-4 short spoken sentences recapping the lesson",
      items: { type: "string" },
    },
    quiz: {
      type: "array",
      description: "2 fun quiz questions the child answers by ticking an option on the whiteboard",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer", "options", "correctIndex"],
        properties: {
          question: { type: "string" },
          answer: { type: "string", description: "the correct answer, spoken if needed" },
          options: {
            type: "array",
            description: "exactly 3 short answer choices (max 6 words each); one is correct",
            items: { type: "string" },
          },
          correctIndex: { type: "integer", description: "0-based index of the correct option" },
        },
      },
    },
    goodbye: { type: "string", description: "One warm goodbye sentence" },
  },
};

const doubtSchema = {
  type: "object",
  additionalProperties: false,
  required: ["spoken", "boardSteps"],
  properties: {
    spoken: {
      type: "array",
      description: "3-5 short spoken sentences answering the child warmly",
      items: { type: "string" },
    },
    boardSteps: {
      type: "array",
      description: "0-6 short whiteboard steps if the answer benefits from step-by-step working (max 8 words each)",
      items: { type: "string" },
    },
  },
};

// ---------------------------------------------------------------------------
// Provider helpers
// ---------------------------------------------------------------------------

// Gemini's responseSchema is an OpenAPI subset that rejects additionalProperties.
function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === "object") {
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === "additionalProperties") continue;
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return schema;
}

async function askGeminiJSON(system, user, schema) {
  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: `${SAFETY}\n\n${system}` }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: toGeminiSchema(schema),
            },
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(`${model}: ${json.error?.message || res.status}`);
      }
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");
      if (!text) throw new Error(`${model}: empty response (${json.candidates?.[0]?.finishReason})`);
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      console.error("[gemini]", err.message);
    }
  }
  throw lastErr;
}

async function askClaudeJSON(system, user, schema) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: `${SAFETY}\n\n${system}`,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined the request");
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text);
}

async function askOpenAIJSON(system, user, shapeHint) {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${SAFETY}\n\n${system}\n\nRespond ONLY with a JSON object of this exact shape:\n${shapeHint}` },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(completion.choices[0].message.content);
}

async function generateJSON(system, user, schema, shapeHint) {
  const errors = [];
  if (geminiKey) {
    try {
      return { provider: "gemini", data: await askGeminiJSON(system, user, schema) };
    } catch (err) {
      errors.push(`gemini: ${err.message}`);
    }
  }
  if (anthropic) {
    try {
      return { provider: "claude", data: await askClaudeJSON(system, user, schema) };
    } catch (err) {
      errors.push(`claude: ${err.message}`);
      console.error("[claude]", err.message);
    }
  }
  if (openai) {
    try {
      return { provider: "openai", data: await askOpenAIJSON(system, user, shapeHint) };
    } catch (err) {
      errors.push(`openai: ${err.message}`);
      console.error("[openai]", err.message);
    }
  }
  throw new Error(errors.join(" | ") || "No AI provider configured");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/api/health", async (req, res) => {
  res.json({
    ok: Boolean(geminiKey || anthropic || openai),
    providers: {
      gemini: Boolean(geminiKey),
      claude: Boolean(anthropic),
      openai: Boolean(openai),
      orpheusTTS: Boolean(process.env.ORPHEUS_TTS_URL),
    },
  });
});

app.post("/api/lesson", async (req, res) => {
  const {
    classLevel = 2,
    subject = "Science",
    topic = "The Solar System",
    teacherName = "Miss Anaya",
    teacherStyle = "warm and playful",
    studentNames = ["Aarav", "Meera", "Kabir", "Zoya"],
    customDoubt = "",
    segmentCount = 3,
  } = req.body || {};

  const system = `You are ${teacherName}, a ${teacherStyle} school teacher taking a live class.
Design a complete spoken lesson for Class ${classLevel} on "${topic}" (subject: ${subject}).
The virtual classmates in the room are: ${studentNames.join(", ")} (studentIndex 0-based in that order).
Every "sentences"/"spoken" string is read aloud by text-to-speech, so write natural speech, one idea per sentence.
Create exactly ${segmentCount} teaching segments. Distribute peerQuestions across different classmates.`;

  const user = customDoubt
    ? `The student has this doubt they want solved step-by-step on the whiteboard during class: "${customDoubt}". Build the lesson plan now.`
    : `The student did not submit a doubt in advance, so make doubtSolution contain empty arrays. Build the lesson plan now.`;

  try {
    const result = await generateJSON(
      system,
      user,
      lessonSchema,
      JSON.stringify(lessonSchema.properties, null, 1).slice(0, 3000)
    );
    res.json(result);
  } catch (err) {
    console.error("lesson error:", err.message);
    res.status(502).json({ error: "The teacher could not prepare the lesson. Please try again.", detail: err.message });
  }
});

app.post("/api/doubt", async (req, res) => {
  const {
    question = "",
    topic = "",
    classLevel = 2,
    teacherName = "Miss Anaya",
    studentName = "",
    reexplain = false,
  } = req.body || {};

  if (!question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  const system = `You are ${teacherName}, teaching a live Class ${classLevel} lesson on "${topic}".
${studentName ? `The student's name is ${studentName} — address them by name warmly.` : ""}
A student just raised their hand and asked a question. Answer warmly and simply.
${reexplain ? "IMPORTANT: You already explained once and the student is STILL confused. Explain again completely differently — much simpler words, a fun everyday example or analogy a 7-year-old knows, shorter sentences." : ""}
If the answer involves steps or working (like a math sum), include short boardSteps; otherwise return an empty boardSteps array.`;

  try {
    const result = await generateJSON(
      system,
      `The student asks: "${question}"`,
      doubtSchema,
      `{"spoken": ["sentence", ...], "boardSteps": ["step", ...]}`
    );
    res.json(result);
  } catch (err) {
    console.error("doubt error:", err.message);
    res.status(502).json({ error: "The teacher couldn't hear that. Please try again.", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// Human-quality speech. Provider order:
//   1. Orpheus TTS (canopyai/Orpheus-TTS) — most human voice, unique voice per
//      teacher/classmate. Reached via an OpenAI-compatible speech server
//      (see orpheus-server/README.md) at ORPHEUS_TTS_URL.
//   2. Gemini TTS (expressive prebuilt voices) — current architecture.
//   3. (client-side) browser speechSynthesis — final fallback in src/lib/tts.js.
// Returns base64 PCM (mono 16-bit) + sample rate that the client wraps as WAV.
// ---------------------------------------------------------------------------
const TTS_MODELS = ["gemini-2.5-flash-preview-tts"];
const ttsCache = new Map(); // key -> {audio, mime} (keeps repeated lines instant)

const ORPHEUS_URL = (process.env.ORPHEUS_TTS_URL || "").replace(/\/$/, "");
const ORPHEUS_MODEL = process.env.ORPHEUS_TTS_MODEL || "orpheus";
// generation can be slower than realtime on modest GPUs — give it room; the
// client pipelines 2 lines ahead so speech still flows without gaps
const ORPHEUS_TIMEOUT_MS = Number(process.env.ORPHEUS_TIMEOUT_MS || 60000);
const ORPHEUS_VOICES = ["tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"];
let orpheusDownUntil = 0; // only after REPEATED failures — one slow line must not
let orpheusFailStreak = 0; // knock Orpheus out for the rest of the lesson

// Minimal RIFF/WAV parser: find the data chunk, return { pcmBase64, rate }.
function wavToPcm(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("not a wav");
  const rate = buf.readUInt32LE(24);
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      return { pcmBase64: buf.subarray(off + 8, off + 8 + size).toString("base64"), rate };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("wav has no data chunk");
}

async function orpheusTTS(text, voice) {
  const v = ORPHEUS_VOICES.includes(voice) ? voice : "tara";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ORPHEUS_TIMEOUT_MS);
  try {
    const r = await fetch(`${ORPHEUS_URL}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ORPHEUS_MODEL, input: text, voice: v, response_format: "wav" }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`orpheus ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const { pcmBase64, rate } = wavToPcm(buf);
    return { audio: pcmBase64, mime: "audio/pcm", rate, provider: "orpheus" };
  } finally {
    clearTimeout(timer);
  }
}

app.post("/api/tts", async (req, res) => {
  const {
    text = "",
    voiceName = "Kore",
    orpheusVoice = "",
    style = "a warm Indian primary school teacher",
  } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: "text required" });
  if (!ORPHEUS_URL && !geminiKey) return res.status(503).json({ error: "no tts provider" });

  const key = `${orpheusVoice}|${voiceName}|${style}|${text}`;
  if (ttsCache.has(key)) return res.json(ttsCache.get(key));

  // ---- 1. Orpheus (unique human voice per character) ----
  if (ORPHEUS_URL && Date.now() > orpheusDownUntil) {
    try {
      const out = await orpheusTTS(text, orpheusVoice);
      orpheusFailStreak = 0; // healthy — keep using Orpheus for every line
      if (ttsCache.size > 400) ttsCache.clear();
      ttsCache.set(key, out);
      return res.json(out);
    } catch (err) {
      orpheusFailStreak += 1;
      // 2 consecutive failures = server actually down → back off briefly.
      // A single slow/failed line just falls to Gemini and Orpheus is tried
      // again on the very next line.
      if (orpheusFailStreak >= 2) {
        orpheusDownUntil = Date.now() + 60000;
        console.error("[orpheus]", err.message, "— 2 failures in a row, resting 60s");
      } else {
        console.error("[orpheus]", err.message, "— this line falls to Gemini, retrying Orpheus next line");
      }
    }
  }

  // ---- 2. Gemini TTS (existing architecture) ----
  if (!geminiKey) return res.status(502).json({ error: "tts failed", detail: "orpheus down, no gemini key" });

  const prompt = `Speak as ${style}, with a natural Indian English accent, lively and warm — never monotone. Use natural pauses and gentle emphasis, talking to young children. Say exactly this: ${text}`;

  let lastErr;
  for (const model of TTS_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": geminiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
          }),
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message || r.status);
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error("no audio returned");
      const out = { audio: part.inlineData.data, mime: part.inlineData.mimeType, rate: 24000 };
      if (ttsCache.size > 400) ttsCache.clear();
      ttsCache.set(key, out);
      return res.json(out);
    } catch (err) {
      lastErr = err;
      console.error("[tts]", err.message);
    }
  }
  res.status(502).json({ error: "tts failed", detail: lastErr?.message });
});

// Guided solar-system tour narration (Immersive Study module)
const tourSchema = {
  type: "object",
  additionalProperties: false,
  required: ["stops"],
  properties: {
    stops: {
      type: "array",
      description:
        "Exactly 10 stops in this order: overview, sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "spoken", "board"],
        properties: {
          id: {
            type: "string",
            enum: ["overview", "sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"],
          },
          title: { type: "string" },
          spoken: {
            type: "array",
            description: "3-4 short spoken sentences for this stop",
            items: { type: "string" },
          },
          board: {
            type: "array",
            description: "2-3 very short text-board points (max 7 words each)",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

app.post("/api/tour", async (req, res) => {
  const { classLevel = 3, teacherName = "Miss Anaya" } = req.body || {};
  const system = `You are ${teacherName}, taking Class ${classLevel} students on a magical guided flight through a 3D solar system.
Create narration for exactly 10 stops IN THIS ORDER: overview (whole solar system seen from far away), sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune.
Each stop: 3-4 short spoken sentences (wonder-filled, factually correct, age-appropriate) and 2-3 tiny board points.
The overview explains what the solar system is; each planet stop teaches its most amazing facts.`;

  try {
    const result = await generateJSON(system, "Create the tour now.", tourSchema, `{"stops":[{"id","title","spoken":[],"board":[]}]}`);
    res.json(result);
  } catch (err) {
    console.error("tour error:", err.message);
    res.status(502).json({ error: "Could not prepare the space journey.", detail: err.message });
  }
});

// Legacy endpoint kept for compatibility with the original chat box
app.post("/api/chatgpt", async (req, res) => {
  try {
    const result = await generateJSON(
      "Answer the student's message conversationally in 2-4 short sentences.",
      String(req.body?.message ?? ""),
      doubtSchema,
      `{"spoken": ["sentence", ...], "boardSteps": []}`
    );
    res.json({ response: result.data.spoken.join(" ") });
  } catch (err) {
    res.status(502).json({ error: "An error occurred", detail: err.message });
  }
});

// WebRTC signaling memory store
let webrtcSignals = {};

app.post("/api/webrtc/signal", (req, res) => {
  const { role, signal } = req.body || {};
  if (!role || !signal) {
    return res.status(400).json({ error: "role and signal required" });
  }
  webrtcSignals[role] = signal;
  res.json({ success: true });
});

app.get("/api/webrtc/signal/:role", (req, res) => {
  const { role } = req.params;
  const signal = webrtcSignals[role] || null;
  res.json({ signal });
});

app.post("/api/webrtc/clear", (req, res) => {
  webrtcSignals = {};
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI classroom proxy running on port ${PORT}`);
  console.log(`Providers: claude=${Boolean(anthropic)} openai=${Boolean(openai)}`);
});
