// Hold-to-speak speech recognition (Chrome/Edge Web Speech API).
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const sttSupported = Boolean(SpeechRecognition);

export function startListening({ onTranscript, onEnd, onError }) {
  if (!SpeechRecognition) {
    onError?.("Speech recognition is not supported in this browser.");
    return () => {};
  }
  const rec = new SpeechRecognition();
  rec.lang = "en-IN";
  rec.continuous = true;
  rec.interimResults = true;

  let finalText = "";
  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += t + " ";
      else interim += t;
    }
    onTranscript?.((finalText + interim).trim());
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.(finalText.trim());
  rec.start();
  return () => rec.stop();
}
