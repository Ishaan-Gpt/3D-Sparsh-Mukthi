import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";
import { startListening, sttSupported } from "../../lib/stt";
import "./Hud.css";

const PHASE_LABELS = {
  intro: "👋 Welcome",
  teaching: "📚 Lesson",
  peerQuestion: "🙋 Classmate asks",
  doubt: "✋ Your question",
  whiteboard: "✏️ On the board",
  recap: "⭐ Recap",
  quiz: "🎉 Quiz",
  break: "🧘 Break",
  end: "🏁 Class over",
};

function useCountdown(target) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 500);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return "";
  const s = Math.floor(left / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function LessonHUD({ resumeFromBreak }) {
  const phase = useLessonStore((s) => s.phase);
  const config = useLessonStore((s) => s.config);
  const caption = useLessonStore((s) => s.caption);
  const captionSpeaker = useLessonStore((s) => s.captionSpeaker);
  const userHandRaised = useLessonStore((s) => s.userHandRaised);
  const raiseUserHand = useLessonStore((s) => s.raiseUserHand);
  const clearUserHand = useLessonStore((s) => s.clearUserHand);
  const setPendingDoubt = useLessonStore((s) => s.setPendingDoubt);
  const sessionEndsAt = useLessonStore((s) => s.sessionEndsAt);
  const breakEndsAt = useLessonStore((s) => s.breakEndsAt);
  const reset = useLessonStore((s) => s.reset);

  const enterSolar = useLessonStore((s) => s.enterSolar);
  const immersiveAvailable = /solar|planet|space/i.test(config?.topic ?? "");
  const sessionLeft = useCountdown(sessionEndsAt);
  const breakLeft = useCountdown(breakEndsAt);

  // ---- doubt input state ----
  const [doubtText, setDoubtText] = useState("");
  const [listening, setListening] = useState(false);
  const stopRef = useRef(null);

  const holdStart = () => {
    setListening(true);
    stopRef.current = startListening({
      onTranscript: (t) => setDoubtText(t),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
  };
  const holdEnd = () => stopRef.current?.();

  const submitDoubt = () => {
    const q = doubtText.trim();
    if (!q) return;
    setDoubtText("");
    setPendingDoubt(q);
  };

  const showDoubtModal = userHandRaised && phase !== "doubt";

  return (
    <div className="hud">
      {/* top bar */}
      <div className="hud-top">
        <span className="hud-topic">
          {config?.subject}: {config?.topic}
        </span>
        <span className="hud-chip">{PHASE_LABELS[phase] ?? phase}</span>
        {sessionLeft && <span className="hud-timer">⏱ {sessionLeft}</span>}
      </div>

      {/* captions */}
      {caption && phase !== "break" && (
        <div className="hud-caption">
          <span className="hud-speaker">{captionSpeaker}</span>
          {caption}
        </div>
      )}

      {/* side controls */}
      <div className="hud-controls">
        <button
          className="hud-btn raise"
          onClick={raiseUserHand}
          disabled={["break", "end", "doubt"].includes(phase)}
          title="Raise your hand to ask a question"
        >
          ✋ Ask
        </button>
        {immersiveAvailable && (
          <button
            className="hud-btn immersive"
            onClick={enterSolar}
            disabled={["break", "end"].includes(phase)}
            title="Turn the classroom into a 3D solar system!"
          >
            🪐 Immersive Study
          </button>
        )}
        <button className="hud-btn exit" onClick={reset} title="Leave the classroom">
          🚪 Exit
        </button>
      </div>

      {/* doubt modal */}
      {showDoubtModal && (
        <div className="hud-modal-backdrop">
          <div className="hud-modal">
            <h2>✋ Yes? What&apos;s your question?</h2>
            <input
              autoFocus
              type="text"
              value={doubtText}
              placeholder="Type your question…"
              onChange={(e) => setDoubtText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitDoubt()}
            />
            <div className="hud-modal-row">
              {sttSupported && (
                <button
                  className={listening ? "hud-btn mic on" : "hud-btn mic"}
                  onMouseDown={holdStart}
                  onMouseUp={holdEnd}
                  onTouchStart={holdStart}
                  onTouchEnd={holdEnd}
                >
                  🎤 {listening ? "Listening…" : "Hold to speak"}
                </button>
              )}
              <button className="hud-btn primary" onClick={submitDoubt} disabled={!doubtText.trim()}>
                Ask Teacher
              </button>
              <button
                className="hud-btn"
                onClick={() => {
                  setDoubtText("");
                  clearUserHand();
                }}
              >
                Never mind
              </button>
            </div>
          </div>
        </div>
      )}

      {/* break overlay */}
      {phase === "break" && (
        <div className="hud-break">
          <div className="hud-break-card">
            <h1>🧘 Break Time</h1>
            <p>Stand up, stretch, blink your eyes, and drink some water!</p>
            <div className="hud-break-timer">{breakLeft}</div>
            <button className="hud-btn primary" onClick={resumeFromBreak}>
              I&apos;m ready — back to class!
            </button>
          </div>
        </div>
      )}

      {/* end card */}
      {phase === "end" && (
        <div className="hud-break">
          <div className="hud-break-card">
            <h1>🌟 Great job today!</h1>
            <p>
              You finished the lesson on <strong>{config?.topic}</strong>.
            </p>
            <button className="hud-btn primary" onClick={reset}>
              🏫 Back to my dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
