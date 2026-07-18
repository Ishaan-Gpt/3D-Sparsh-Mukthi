import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";
import { boardBridge } from "../../lib/boardBridge";

import "./Board.css";

/**
 * "My Notebook" — a brutalist, book-styled notebook the teacher writes in.
 *
 * - ONE page fills the view at a time; ◀ ▶ (or ✌️ gesture-click) turn pages
 *   with a real page-turn animation. New writing auto-flips to the live page.
 * - Every page taught so far (intro, segments, doubts, recap) is a chapter:
 *   thick borders, hard shadows, huge titles — stylized slide/PPT look.
 * - During the quiz an extra page appears whose MCQ options are big clickable
 *   answer cards — the child clicks (mouse, touch or ✌️) to mark the answer.
 * - The current page is still mirrored onto the 3D board plane via Excalidraw
 *   export (boardBridge); if Excalidraw fails, only the mirror is skipped —
 *   the book itself is pure HTML and always works.
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

// One page as Excalidraw elements — used ONLY for the 3D board mirror.
function emitPage(els, page, pageIdx, y, { live = false } = {}) {
  const accent = ACCENTS[pageIdx % ACCENTS.length];
  const title = wrap(page.title || "…", 38);
  const titleLines = title.split("\n").length;
  const bannerH = 40 + titleLines * 44;

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
    els.push({ type: "text", x: 900, y: y - 8, text: "✏️", fontSize: 26, ...AI });
  }
  return y + 34;
}

// strip the leading bullet/number from a line for HTML rendering
const lineParts = (raw) => {
  const line = String(raw).trim();
  const m = line.match(/^(\d+)[.)]\s*(.*)$/);
  if (m) return { num: m[1], text: m[2] };
  return { num: null, text: line.replace(/^•\s*/, "") };
};

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

  const [mod, setMod] = useState(null); // excalidraw module (3D mirror only)
  const exportTimer = useRef(null);
  const autoRef = useRef(false);

  // book state: which page is showing + turn animation direction
  const [pageIdx, setPageIdx] = useState(0);
  const [turnDir, setTurnDir] = useState("fwd");
  const followRef = useRef(true); // auto-flip to the newest page while true

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

  // Load Excalidraw once at mount purely for the 3D mirror export.
  useEffect(() => {
    let gone = false;
    import("@excalidraw/excalidraw")
      .then((m) => !gone && setMod(m))
      .catch((err) => {
        console.warn("Excalidraw unavailable — 3D mirror off:", err);
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

  useEffect(() => {
    if (mod && mod !== "failed") scheduleMirror();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, board, boardPages]);

  useEffect(() => () => clearTimeout(exportTimer.current), []);

  // ---- book pages: every chapter so far + the live page + the quiz page ----
  const chapters = [...boardPages.filter((p) => p.title !== board.title), board].filter(
    (p) => p.title || p.lines.length
  );
  const total = chapters.length + (mcq ? 1 : 0);
  const cur = Math.min(pageIdx, Math.max(0, total - 1));
  const onQuizPage = mcq && cur === total - 1;
  const livePage = !mcq && cur === total - 1;

  // the teacher keeps writing → follow the chalk (auto page-turn forward)
  useEffect(() => {
    if (followRef.current && total > 0 && pageIdx !== total - 1) {
      setTurnDir("fwd");
      setPageIdx(total - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, board.lines.length, board.title]);

  const nav = (d) => {
    const next = Math.min(total - 1, Math.max(0, cur + d));
    if (next === cur) return;
    followRef.current = next === total - 1; // flipping back pauses auto-follow
    setTurnDir(d > 0 ? "fwd" : "back");
    setPageIdx(next);
  };

  if (!boardOpen) return null;

  const accent = ACCENTS[cur % ACCENTS.length];
  const page = onQuizPage ? null : chapters[cur];

  return (
    <div className="board-overlay">
      <div className="board-frame">
        <div className="board-header">
          <span>
            {onQuizPage
              ? "✏️ QUIZ — click the right answer!"
              : "📖 MY NOTEBOOK — everything taught so far"}
          </span>
          <span className="board-mode">
            page {total ? cur + 1 : 0} / {total}
          </span>
          <button className="board-close" onClick={() => setBoardOpen(false)}>
            ✕ CLOSE
          </button>
        </div>



        <div className="book">
          <button
            className="book-nav prev"
            onClick={() => nav(-1)}
            disabled={cur === 0}
            aria-label="Previous page"
          >
            ◀
          </button>

          <div className="book-stage">
            {/* stacked-paper edges behind the page */}
            <div className="book-under u2" />
            <div className="book-under u1" />

            {onQuizPage ? (
              <div key={`quiz-${mcq.index}`} className={`book-page turn-${turnDir}`} style={{ "--accent": "#7b2d8b" }}>
                <div className="page-banner">
                  <span className="page-no">{cur + 1}</span>
                  <h2>QUIZ TIME 🎉</h2>
                </div>
                <p className="quiz-q">{mcq.question}</p>
                <div className="quiz-opts">
                  {mcq.options.map((opt, i) => {
                    const answered = mcq.picked != null;
                    const cls =
                      !answered ? "" : i === mcq.correct ? "right" : i === mcq.picked ? "wrong" : "dim";
                    return (
                      <button
                        key={i}
                        className={`quiz-opt ${cls}`}
                        disabled={answered}
                        onClick={() => answerMcq(i)}
                      >
                        <span className="quiz-letter">{OPTION_LETTERS[i] ?? i + 1}</span>
                        <span className="quiz-text">{opt}</span>
                        {answered && i === mcq.correct && <span className="quiz-mark ok">✔</span>}
                        {answered && i === mcq.picked && i !== mcq.correct && (
                          <span className="quiz-mark no">✘</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="quiz-verdict">
                  {mcq.picked == null
                    ? "TICK THE RIGHT ANSWER"
                    : mcq.picked === mcq.correct
                      ? "CORRECT! ⭐"
                      : "GOOD TRY!"}
                </p>
              </div>
            ) : page ? (
              <div key={cur} className={`book-page turn-${turnDir}`} style={{ "--accent": accent }}>
                <div className="page-banner">
                  <span className="page-no">{cur + 1}</span>
                  <h2>{page.title || "…"}</h2>
                </div>
                <div className="page-lines">
                  {page.lines.map((raw, j) => {
                    const { num, text } = lineParts(raw);
                    return (
                      <p key={j} className="page-line">
                        {num ? <span className="line-step">{num}</span> : <span className="line-dot" />}
                        {text}
                      </p>
                    );
                  })}
                  {livePage && <span className="page-chalk">✏️</span>}
                </div>
              </div>
            ) : (
              <div className="book-page empty">
                <p>The teacher hasn't written anything yet…</p>
              </div>
            )}
          </div>

          <button
            className="book-nav next"
            onClick={() => nav(1)}
            disabled={cur >= total - 1}
            aria-label="Next page"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
