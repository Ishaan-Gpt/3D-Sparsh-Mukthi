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

dotenv.config();

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
        required: ["heading", "sentences", "boardPoints", "peerQuestion"],
        properties: {
          heading: { type: "string", description: "Short segment heading for the whiteboard" },
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
      description: "2 fun oral quiz questions with answers, phrased as spoken sentences",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
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
// Human-quality speech via Gemini TTS (expressive Indian-teacher delivery).
// Returns base64 PCM (24kHz mono 16-bit) that the client wraps as WAV.
// ---------------------------------------------------------------------------
const TTS_MODELS = ["gemini-2.5-flash-preview-tts"];
const ttsCache = new Map(); // key -> {audio, mime} (keeps repeated lines instant)

app.post("/api/tts", async (req, res) => {
  const { text = "", voiceName = "Kore", style = "a warm Indian primary school teacher" } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: "text required" });
  if (!geminiKey) return res.status(503).json({ error: "no tts provider" });

  const key = `${voiceName}|${style}|${text}`;
  if (ttsCache.has(key)) return res.json(ttsCache.get(key));

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI classroom proxy running on port ${PORT}`);
  console.log(`Providers: claude=${Boolean(anthropic)} openai=${Boolean(openai)}`);
});
