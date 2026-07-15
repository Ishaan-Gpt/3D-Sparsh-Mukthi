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

async function fetchLineAudio(text, opts) {
  const voiceName = opts.voiceName ?? (opts.voiceGender === "male" ? "Charon" : "Kore");
  const style = opts.styleNote ?? "a warm Indian primary school teacher";
  const key = `${voiceName}|${style}|${text}`;
  if (audioCache.has(key)) return audioCache.get(key);
  const res = await fetch("http://localhost:3001/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceName, style }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const { audio, rate } = await res.json();
  const url = pcmBase64ToWavUrl(audio, rate);
  audioCache.set(key, url);
  return url;
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
    speakViaServer(clean, opts, token).catch(() => {
      if (token !== currentToken) return;
      serverTTSBroken = true;
      speakViaBrowser(clean, opts, token);
    });
  } else {
    speakViaBrowser(clean, opts, token);
  }

  return () => {
    if (token === currentToken) currentToken++;
    haltAudio();
  };
}

async function speakViaServer(lines, opts, token) {
  // prefetch line 0 (and pipeline the rest while playing)
  let nextPromise = fetchLineAudio(lines[0], opts);
  for (let i = 0; i < lines.length; i++) {
    if (token !== currentToken) return;
    const url = await nextPromise;
    if (token !== currentToken) return;
    if (i + 1 < lines.length) nextPromise = fetchLineAudio(lines[i + 1], opts);

    opts.onLineStart?.(lines[i], i);
    await new Promise((resolve, reject) => {
      const a = new Audio(url);
      currentAudio = a;
      a.onended = resolve;
      a.onerror = () => reject(new Error("audio playback failed"));
      a.play().catch(reject);
    });
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
    // subtle prosody variation so it doesn't drone
    u.rate = (opts.rate ?? 0.95) + (Math.random() - 0.5) * 0.06;
    u.pitch = (opts.pitch ?? 1.1) + (Math.random() - 0.5) * 0.08;
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
