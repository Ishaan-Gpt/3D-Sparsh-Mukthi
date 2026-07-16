import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";
import { boardBridge } from "../../lib/boardBridge";
import { ConceptPlayer } from "./ConceptPlayer";
import "./Board.css";

/**
 * "My Whiteboard" — the teacher's canvas, designed and written by the AI.
 *
 * - The TEACHER controls it: every page taught so far (intro, each segment,
 *   doubt solutions, recap) is kept and beautifully laid out — banners,
 *   colour-coded bullets, numbered step chips — streaming in live as she speaks.
 * - The child gets a READ-ONLY view (open it anytime with 🖍): all notes of
 *   the lesson so far, in realtime. Drawing tools unlock ONLY during the quiz,
 *   and the teacher waits until the child actually ticks an answer.
 * - A Remotion "concept in motion" animation strip plays above the notes for
 *   the current teaching segment.
 * - The current page is mirrored onto the 3D board plane via boardBridge.
 * - If Excalidraw fails to load, a simple HTML notes view takes over.
 */

const wrap = (text, width = 46) => {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
};

const AI = { customData: { ai: true } };
const OPTION_LETTERS = ["A", "B", "C", "D"];
// per-page accent colours — pages feel like chapters of a notebook
const ACCENTS = ["#e8590c", "#2f9e63", "#3b6fd4", "#c94f9a", "#9061d4", "#b8860b"];

// One nicely designed page. Returns the y where the next page starts.
function emitPage(els, page, pageIdx, y, { live = false } = {}) {
  const accent = ACCENTS[pageIdx % ACCENTS.length];
  const title = wrap(page.title || "…", 38);
  const titleLines = title.split("\n").length;
  const bannerH = 40 + titleLines * 44;

  // page banner: filled ribbon + page number badge
  els.push({
    type: "rectangle", x: 70, y, width: 820, height: bannerH, roundness: { type: 3 },
    backgroundColor: accent, fillStyle: "solid", strokeColor: accent, ...AI,
  });
  els.push({
    type: "ellipse", x: 84, y: y + bannerH / 2 - 19, width: 38, height: 38,
    backgroundColor: "#fffdf5", fillStyle: "solid", strokeColor: accent, ...AI,
  });
  els.push({
    type: "text", x: 96, y: y + bannerH / 2 - 13, text: String(pageIdx + 1),
    fontSize: 20, fontFamily: 1, strokeColor: accent, ...AI,
  });
  els.push({
    type: "text", x: 140, y: y + 18, text: title,
    fontSize: 33, fontFamily: 1, strokeColor: "#ffffff", ...AI,
  });
  y += bannerH + 22;

  for (const raw of page.lines) {
    const line = String(raw);
    const numbered = /^\d+[.)]/.test(line.trim());
    const text = wrap(line.replace(/^•\s*/, "").replace(/^\d+[.)]\s*/, ""), 50);
    const textLines = text.split("\n").length;

    if (numbered) {
      // numbered step chip (doubt solutions / working)
      const n = line.trim().match(/^(\d+)/)[1];
      els.push({
        type: "ellipse", x: 96, y: y - 2, width: 34, height: 34,
        backgroundColor: accent, fillStyle: "solid", strokeColor: accent, ...AI,
      });
      els.push({
        type: "text", x: 107, y: y + 3, text: n, fontSize: 18, fontFamily: 1, strokeColor: "#fff", ...AI,
      });
      els.push({
        type: "text", x: 146, y, text, fontSize: 26, fontFamily: 1, strokeColor: "#243329", ...AI,
      });
    } else {
      // bullet dot + text
      els.push({
        type: "ellipse", x: 102, y: y + 8, width: 15, height: 15,
        backgroundColor: accent, fillStyle: "solid", strokeColor: accent, ...AI,
      });
      els.push({
        type: "text", x: 134, y, text, fontSize: 26, fontFamily: 1, strokeColor: "#243329", ...AI,
      });
    }
    y += 24 + textLines * 32 + 14;
  }

  if (live) {
    // "chalk in hand" marker on the page being written right now
    els.push({
      type: "text", x: 900, y: y - 8, text: "✏️", fontSize: 26, ...AI,
    });
  }
  return y + 34;
}

// All pages taught so far + the live page + the MCQ block.
function buildNotebook(pages, board, mcq) {
  const els = [];
  let y = 40;
  const all = [...pages.filter((p) => p.title !== board.title), board].filter(
    (p) => p.title || p.lines.length
  );
  all.forEach((page, i) => {
    y = emitPage(els, page, i, y, { live: i === all.length - 1 && !mcq });
  });

  if (mcq) {
    const q = wrap(mcq.question, 48);
    els.push({
      type: "rectangle", x: 70, y, width: 820, height: 66 + q.split("\n").length * 20, roundness: { type: 3 },
      backgroundColor: "#f3e3f7", fillStyle: "solid", strokeColor: "#7b2d8b", ...AI,
    });
    els.push({
      type: "text", x: 96, y: y + 18, text: "🎉 " + q, fontSize: 28, fontFamily: 1, strokeColor: "#7b2d8b", ...AI,
    });
    y += 90 + q.split("\n").length * 20;
    mcq.options.forEach((opt, i) => {
      const answered = mcq.picked != null;
      const isCorrect = i === mcq.correct;
      const isPicked = i === mcq.picked;
      els.push({
        type: "rectangle", x: 96, y, width: 640, height: 58, roundness: { type: 3 },
        strokeColor: answered && isCorrect ? "#0a7d2c" : "#4a5568",
        backgroundColor: answered && isCorrect ? "#b9f6c3" : answered && isPicked ? "#ffd2d2" : "#ffffff",
        fillStyle: "solid", ...AI,
      });
      els.push({
        type: "text", x: 120, y: y + 15, text: `${OPTION_LETTERS[i] ?? i + 1}.  ${opt}`,
        fontSize: 24, fontFamily: 1, strokeColor: "#1a2233", ...AI,
      });
      if (answered && isCorrect) {
        els.push({ type: "text", x: 758, y: y + 6, text: "✔", fontSize: 42, strokeColor: "#0a7d2c", ...AI });
      } else if (answered && isPicked) {
        els.push({ type: "text", x: 758, y: y + 8, text: "✘", fontSize: 38, strokeColor: "#c0392b", ...AI });
      }
      y += 74;
    });
  }
  return els;
}

export function ExcalidrawBoard() {
  const board = useLessonStore((s) => s.board);
  const boardPages = useLessonStore((s) => s.boardPages);
  const boardAnim = useLessonStore((s) => s.boardAnim);
  const mcq = useLessonStore((s) => s.mcq);
  const boardOpen = useLessonStore((s) => s.boardOpen);
  const boardFocus = useLessonStore((s) => s.boardFocus);
  const setBoardOpen = useLessonStore((s) => s.setBoardOpen);
  const answerMcq = useLessonStore((s) => s.answerMcq);
  const phase = useLessonStore((s) => s.phase);

  const [mod, setMod] = useState(null); // excalidraw module | "failed" | null
  const [api, setApi] = useState(null);
  const exportTimer = useRef(null);
  const autoRef = useRef(false);

  // Auto-open when the lesson focuses the board (doubt/whiteboard/MCQ);
  // auto-close when that moment passes. Manual open/close always wins after.
  const wantAuto = boardFocus || phase === "whiteboard" || Boolean(mcq);
  useEffect(() => {
    if (wantAuto && !useLessonStore.getState().boardOpen) {
      autoRef.current = true;
      setBoardOpen(true);
    } else if (!wantAuto && autoRef.current) {
      autoRef.current = false;
      setBoardOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantAuto]);

  // Load Excalidraw (+ its css) once at mount, so the 3D mirror works even
  // before the overlay is first opened; fall back to simple HTML on failure.
  useEffect(() => {
    let gone = false;
    Promise.all([import("@excalidraw/excalidraw"), import("@excalidraw/excalidraw/index.css")])
      .then(([m]) => !gone && setMod(m))
      .catch((err) => {
        console.warn("Excalidraw unavailable, using simple board:", err);
        if (!gone) setMod("failed");
      });
    return () => {
      gone = true;
    };
  }, []);

  // Mirror ONLY the current page onto the 3D whiteboard plane (kept readable).
  const scheduleMirror = () => {
    if (!mod || mod === "failed") return;
    clearTimeout(exportTimer.current);
    exportTimer.current = setTimeout(async () => {
      try {
        const st = useLessonStore.getState();
        const els = [];
        emitPage(els, st.board, Math.max(0, st.boardPages.length), 30, { live: true });
        const canvas = await mod.exportToCanvas({
          elements: mod.convertToExcalidrawElements(els),
          appState: { viewBackgroundColor: "#f7f9f4", exportWithDarkMode: false },
          files: {},
          maxWidthOrHeight: 1024,
        });
        boardBridge.publish(canvas);
      } catch {
        /* mirror is best-effort */
      }
    }, 400);
  };

  // The teacher writes: rebuild the whole notebook whenever the lesson state
  // changes, keeping anything the child drew during the quiz.
  useEffect(() => {
    if (!api || !mod || mod === "failed") return;
    const aiElements = mod.convertToExcalidrawElements(buildNotebook(boardPages, board, mcq));
    const userElements = api.getSceneElements().filter((el) => !el.customData?.ai);
    api.updateScene({ elements: [...aiElements, ...userElements] });
    // follow the chalk: keep the newest writing in view
    try {
      const target = aiElements.slice(-6);
      if (target.length) api.scrollToContent(target, { fitToViewport: false, animate: true, duration: 260 });
    } catch {
      /* older excalidraw signature — non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, mod, board, boardPages, mcq]);

  // 3D mirror follows the current page even while the overlay is closed.
  useEffect(() => {
    if (mod && mod !== "failed") scheduleMirror();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, board, boardPages]);

  useEffect(() => () => clearTimeout(exportTimer.current), []);

  if (!boardOpen) return null;

  const Excalidraw = mod && mod !== "failed" ? mod.Excalidraw : null;
  const editable = Boolean(mcq); // quiz time is the only time the child edits

  return (
    <div className="board-overlay">
      <div className="board-frame">
        <div className="board-header">
          <span>
            {editable
              ? "✏️ Your turn — tick the right answer!"
              : "📖 My Whiteboard — everything your teacher has taught so far"}
          </span>
          <span className="board-mode">{editable ? "you can draw" : "read-only"}</span>
          <button className="board-close" onClick={() => setBoardOpen(false)}>
            ✕ Close
          </button>
        </div>

        <ConceptPlayer visual={boardAnim} heading={board.title} points={board.lines} />

        <div className="board-canvas-wrap">
          {Excalidraw ? (
            <Excalidraw
              excalidrawAPI={setApi}
              viewModeEnabled={!editable}
              initialData={{
                appState: {
                  viewBackgroundColor: "#fffdf5",
                  currentItemFontFamily: 1,
                  currentItemStrokeColor: "#c0392b",
                },
              }}
              UIOptions={{
                canvasActions: { loadScene: false, export: false, saveToActiveFile: false },
              }}
            />
          ) : mod === "failed" ? (
            <div className="board-simple">
              {[...boardPages.filter((p) => p.title !== board.title), board].map((p, i) => (
                <div key={i}>
                  <h2 style={{ borderColor: ACCENTS[i % ACCENTS.length], color: ACCENTS[i % ACCENTS.length] }}>
                    {i + 1}. {p.title}
                  </h2>
                  {p.lines.map((l, j) => (
                    <p key={j}>{l}</p>
                  ))}
                </div>
              ))}
              {mcq && <p className="board-simple-q">{mcq.question}</p>}
            </div>
          ) : (
            <div className="board-loading">Opening the whiteboard…</div>
          )}
        </div>

        {/* MCQ answer bar: real buttons so mouse, touch AND ✌️ gesture-click work */}
        {mcq && (
          <div className="board-mcq-bar">
            <span className="board-mcq-label">
              {mcq.picked == null ? "Tick the right answer:" : mcq.picked === mcq.correct ? "Correct! ⭐" : "Good try!"}
            </span>
            {mcq.options.map((opt, i) => (
              <button
                key={i}
                className={`board-mcq-btn ${
                  mcq.picked == null ? "" : i === mcq.correct ? "right" : i === mcq.picked ? "wrong" : "dim"
                }`}
                disabled={mcq.picked != null}
                onClick={() => answerMcq(i)}
              >
                {OPTION_LETTERS[i] ?? i + 1}. {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
