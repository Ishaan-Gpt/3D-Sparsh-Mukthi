import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";
import { startListening, sttSupported } from "../../lib/stt";
import { stopSpeech } from "../../lib/tts";
import "./Hud.css";

const PHASE_LABELS = {
  intro: "👋 Welcome",
  teaching: "📚 Lesson",
  peerQuestion: "🙋 Classmate asks",
  doubtWait: "✋ Your turn",
  doubt: "✋ Your question",
  whiteboard: "✏️ On the board",
  recap: "⭐ Recap",
  quiz: "🎉 Quiz",
  break: "🧘 Break",
  paused: "⏸ Paused",
  attention: "👀 Attention",
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
  const sec = Math.floor(left / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function LessonHUD({ resumeFromBreak, pauseClass, resumeClass, answerDoubtCheck }) {
  const phase = useLessonStore((s) => s.phase);
  const config = useLessonStore((s) => s.config);
  const caption = useLessonStore((s) => s.caption);
  const captionSpeaker = useLessonStore((s) => s.captionSpeaker);
  const raiseUserHand = useLessonStore((s) => s.raiseUserHand);
  const clearUserHand = useLessonStore((s) => s.clearUserHand);
  const setPendingDoubt = useLessonStore((s) => s.setPendingDoubt);
  const doubtCheck = useLessonStore((s) => s.doubtCheck);
  const progress = useLessonStore((s) => s.progress);
  const breakEndsAt = useLessonStore((s) => s.breakEndsAt);
  const enterSolar = useLessonStore((s) => s.enterSolar);
  const reset = useLessonStore((s) => s.reset);
  const boardOpen = useLessonStore((s) => s.boardOpen);
  const setBoardOpen = useLessonStore((s) => s.setBoardOpen);

  const breakLeft = useCountdown(breakEndsAt);
  const pct = Math.round(progress * 100);

  const immersiveAvailable = /solar|planet|space/i.test(config?.topic ?? "");
  const quit = () => {
    stopSpeech();
    reset();
  };

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

  return (
    <div className="hud">
      {/* top bar */}
      <div className="hud-top">
        <span className="hud-topic">
          {config?.subject}: {config?.topic}
        </span>
        <span className="hud-chip">{PHASE_LABELS[phase] ?? phase}</span>
        <span className="hud-timer hud-progress" title="How much of today's lesson is done">
          <span className="hud-progress-bar">
            <span className="hud-progress-fill" style={{ width: `${pct}%` }} />
          </span>
          {pct}%
        </span>
      </div>

      {/* captions */}
      {caption && !["break", "paused"].includes(phase) && (
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
          disabled={["break", "end", "doubt", "doubtWait", "paused"].includes(phase)}
          title="Raise your hand to ask a question"
        >
          ✋ Ask
        </button>
        {immersiveAvailable && (
          <button
            className="hud-btn immersive"
            onClick={enterSolar}
            disabled={["break", "end", "paused"].includes(phase)}
            title="Turn the classroom into a 3D solar system!"
          >
            🪐 Immersive Study
          </button>
        )}
        <button
          className="hud-btn"
          onClick={() => setBoardOpen(!boardOpen)}
          disabled={["break", "end", "paused"].includes(phase)}
          title="All the notes your teacher has written so far, live"
        >
          📖 {boardOpen ? "Close board" : "My Whiteboard"}
        </button>
        <button
          className="hud-btn"
          onClick={pauseClass}
          disabled={["break", "end", "paused", "doubt", "doubtWait"].includes(phase)}
          title="Pause the class — come back later"
        >
          ⏸ Pause class
        </button>
        <button className="hud-btn exit" onClick={quit} title="Leave the classroom">
          🚪 Quit
        </button>
      </div>

      {/* doubt modal — teacher has called your name and is waiting */}
      {phase === "doubtWait" && (
        <div className="hud-modal-backdrop">
          <div className="hud-modal">
            <h2>
              ✋ Yes {config?.userName ?? ""}? The class is waiting for your question!
            </h2>
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

      {/* "is your doubt clear?" check */}
      {doubtCheck && (
        <div className="hud-modal-backdrop">
          <div className="hud-modal doubt-check">
            <h2>🧑‍🏫 Is your doubt clear now?</h2>
            <div className="hud-modal-row center">
              <button className="hud-btn primary big" onClick={() => answerDoubtCheck(true)}>
                😊 Yes, I got it!
              </button>
              <button className="hud-btn big" onClick={() => answerDoubtCheck(false)}>
                🤔 Not yet…
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

      {/* user-paused overlay */}
      {phase === "paused" && (
        <div className="hud-break">
          <div className="hud-break-card">
            <h1>⏸ Class Paused</h1>
            <p>Your teacher is waiting patiently. Come back whenever you are ready!</p>
            <div className="hud-modal-row center">
              <button className="hud-btn primary big" onClick={resumeClass}>
                ▶ Resume class
              </button>
              <button className="hud-btn big" onClick={quit}>
                🚪 Quit for today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* end card */}
      {phase === "end" && (
        <div className="hud-break">
          <div className="hud-break-card">
            <h1>🌟 Great job today, {config?.userName}!</h1>
            <p>
              You finished the lesson on <strong>{config?.topic}</strong>.
            </p>
            <button className="hud-btn primary" onClick={quit}>
              🏫 Back to my dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
