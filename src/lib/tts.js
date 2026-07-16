// Speech engine that paces the whole lesson. Primary path: Gemini TTS via the
// proxy (real human Indian-teacher voice with pauses/emphasis). Fallback:
// browser speechSynthesis (en-IN preferred). Callbacks fire on line start /
// done so captions, animation and phase transitions stay in sync with audio.

let currentToken = 0;
let currentAudio = null;
let serverTTSBroken = false; // flip to fallback for the session after a failure
const audioCache = new Map(); // key -> object URL of a wav blob

// ---------- browser-voice fallback helpers ----------
let voicesCache = [];
function loadVoices() {
  voicesCache = window.speechSynthesis?.getVoices?.() ?? [];
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function pickVoice(gender = "female") {
  const english = voicesCache.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const indian = english.filter((v) => v.lang.toLowerCase() === "en-in");
  const femaleHints = /female|zira|susan|hazel|samantha|aria|jenny|neerja|heera|swara/i;
  const maleHints = /male|david|mark|guy|ravi|prabhat|madhur/i;
  const hint = gender === "male" ? maleHints : femaleHints;
  return (
    indian.find((v) => hint.test(v.name)) ||
    indian[0] ||
    english.find((v) => hint.test(v.name)) ||
    english[0] ||
    null
  );
}

// ---------- PCM(24k mono s16) -> WAV blob ----------
function pcmBase64ToWavUrl(b64, rate = 24000) {
  const bin = atob(b64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const write = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, pcm.length, true);
  return URL.createObjectURL(new Blob([header, pcm], { type: "audio/wav" }));
}

async function fetchLineAudio(text, opts, retries = 1) {
  const voiceName = opts.voiceName ?? (opts.voiceGender === "male" ? "Charon" : "Kore");
  const orpheusVoice = opts.orpheusVoice ?? (opts.voiceGender === "male" ? "leo" : "tara");
  const style = opts.styleNote ?? "a warm Indian primary school teacher";
  const key = `${orpheusVoice}|${voiceName}|${style}|${text}`;
  if (audioCache.has(key)) return audioCache.get(key);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName, orpheusVoice, style }),
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const { audio, rate } = await res.json();
      const url = pcmBase64ToWavUrl(audio, rate);
      audioCache.set(key, url);
      return url;
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 700)); // brief backoff (model overload)
    }
  }
}

// ---------- whole-lesson preloader ----------
// Warm the audio cache for the ENTIRE lesson right after the plan arrives, so
// ~90% of speech starts instantly from cache (Orpheus generates once, up
// front). Only live doubt answers still generate on the fly. Concurrency is
// limited so the TTS server stays responsive for the line being spoken NOW.
export function warmSpeechCache(tasks, { concurrency = 2 } = {}) {
  let cancelled = false;
  const queue = [];
  for (const t of tasks) {
    for (const line of t.lines || []) {
      const text = String(line).trim();
      if (text) queue.push({ text, opts: t.opts || {} });
    }
  }
  let idx = 0;
  const worker = async () => {
    while (!cancelled && idx < queue.length && !serverTTSBroken) {
      const job = queue[idx++];
      try {
        await fetchLineAudio(job.text, job.opts, 0);
      } catch {
        /* the live speaker will fetch/fallback when the line actually plays */
      }
    }
  };
  for (let i = 0; i < Math.max(1, concurrency); i++) worker();
  return () => {
    cancelled = true;
  };
}

// ---------- main sequential speaker ----------
export function speakLines(lines, opts = {}) {
  const token = ++currentToken;
  const clean = (lines || []).map((l) => String(l).trim()).filter(Boolean);
  if (clean.length === 0) {
    opts.onDone?.(true);
    return () => {};
  }

  if (!serverTTSBroken) {
    speakViaServer(clean, opts, token);
  } else {
    speakViaBrowser(clean, opts, token);
  }

  return () => {
    if (token === currentToken) currentToken++;
    haltAudio();
  };
}

let consecutiveTTSFailures = 0;

// Speak one line with the browser voice (used only when a single server line
// fails — the sequence continues instead of restarting).
function speakOneBrowser(line, opts) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return setTimeout(resolve, Math.max(1500, line.length * 55));
    const u = new SpeechSynthesisUtterance(line);
    const voice = pickVoice(opts.voiceGender);
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.1;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  });
}

async function speakViaServer(lines, opts, token) {
  // pipeline 2 lines ahead: neural TTS (Orpheus) can be slower than realtime,
  // so the next lines generate WHILE the current one plays — no gaps, and the
  // same human voice is used for every line, not just the first.
  const pending = new Map();
  const ensure = (i) => {
    if (i >= lines.length) return null;
    if (!pending.has(i)) pending.set(i, fetchLineAudio(lines[i], opts).catch((e) => e));
    return pending.get(i);
  };
  ensure(0);
  for (let i = 0; i < lines.length; i++) {
    if (token !== currentToken) return;
    ensure(i + 1);
    ensure(i + 2);
    const urlOrErr = await ensure(i);
    if (token !== currentToken) return;

    opts.onLineStart?.(lines[i], i);
    try {
      if (urlOrErr instanceof Error) throw urlOrErr;
      await new Promise((resolve, reject) => {
        const a = new Audio(urlOrErr);
        currentAudio = a;
        a.onended = resolve;
        a.onerror = () => reject(new Error("audio playback failed"));
        a.play().catch(reject);
      });
      consecutiveTTSFailures = 0;
    } catch {
      // this line falls back to the browser voice; sequence continues
      consecutiveTTSFailures++;
      if (consecutiveTTSFailures >= 4) serverTTSBroken = true;
      if (token !== currentToken) return;
      await speakOneBrowser(lines[i], opts);
    }
    if (token !== currentToken) return;
    opts.onLineEnd?.(lines[i], i);
  }
  if (token === currentToken) opts.onDone?.(true);
}

function speakViaBrowser(lines, opts, token) {
  const synth = window.speechSynthesis;
  if (!synth) {
    // last resort: timer pacing so the lesson still flows
    let i = 0;
    const step = () => {
      if (token !== currentToken) return;
      if (i >= lines.length) return opts.onDone?.(true);
      opts.onLineStart?.(lines[i], i);
      setTimeout(() => {
        opts.onLineEnd?.(lines[i], i);
        i += 1;
        step();
      }, Math.max(1800, lines[i].length * 55));
    };
    step();
    return;
  }

  synth.cancel();
  const voice = pickVoice(opts.voiceGender);
  let i = 0;
  const speakNext = () => {
    if (token !== currentToken) return;
    if (i >= lines.length) return opts.onDone?.(true);
    const u = new SpeechSynthesisUtterance(lines[i]);
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.1;
    u.onstart = () => token === currentToken && opts.onLineStart?.(lines[i], i);
    u.onend = () => {
      if (token !== currentToken) return;
      opts.onLineEnd?.(lines[i], i);
      i += 1;
      setTimeout(speakNext, 220); // natural breath pause
    };
    u.onerror = () => {
      if (token !== currentToken) return;
      i += 1;
      speakNext();
    };
    synth.speak(u);
  };
  speakNext();
}

function haltAudio() {
  currentAudio?.pause();
  currentAudio = null;
  window.speechSynthesis?.cancel();
}

export function stopSpeech() {
  currentToken++;
  haltAudio();
}
