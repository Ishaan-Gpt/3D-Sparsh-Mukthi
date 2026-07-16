import { create } from "zustand";
import { boardBridge } from "../lib/boardBridge";

// Central lesson state. The engine (useLessonEngine) is the only writer of
// phase transitions; UI + 3D components read from here.
export const useLessonStore = create((set, get) => ({
  // ---- setup ----
  config: null, // { classLevel, subject, topic, teacher, studentNames, customDoubt, sessionMinutes, breakEveryMinutes }
  lesson: null, // AI lesson plan JSON
  error: null,

  // ---- flow ----
  phase: "dashboard", // dashboard | loading | error | intro | teaching | peerQuestion | doubt | whiteboard | recap | quiz | break | end
  segmentIndex: 0,
  resumePoint: null, // saved {phase, segmentIndex} while in break/doubt

  // ---- live presentation state ----
  progress: 0, // exact lesson completion 0..1 (spoken lines done / planned)
  caption: "", // sentence currently being spoken
  captionSpeaker: "", // who is speaking (teacher or a classmate)
  speaking: false, // TTS active → drives teacher animation
  board: { title: "", lines: [] }, // whiteboard content (current page)
  boardPages: [], // every finished page of this lesson — "My Whiteboard" notes
  boardAnim: null, // current segment's animated concept visual {kind, items, caption}
  raisedHandStudent: -1, // classmate index with hand up (peer question)
  boardFocus: false, // camera should frame the whiteboard
  boardOpen: false, // interactive (Excalidraw) whiteboard overlay is showing
  mcq: null, // live quiz question { question, options, correct, picked, index }

  // ---- immersive study (solar system module) ----
  appMode: "classroom", // classroom | solar
  solarMode: "choose", // choose | interact | tour
  selectedBody: null, // planet id for the info card
  tour: null, // AI-generated narration {stops:[{id,title,spoken,board}]}
  tourStep: 0,
  solarBoard: { title: "", lines: [] }, // teacher's floating text board in the tour
  solarEye: false, // 👁 AR mode: your webcam replaces space — touch the planets

  enterSolar: () => set({ appMode: "solar", solarMode: "choose", selectedBody: null, tourStep: 0 }),
  exitSolar: () => set({ appMode: "classroom", selectedBody: null, solarEye: false }),
  toggleSolarEye: () => set((s) => ({ solarEye: !s.solarEye })),
  setSolarMode: (solarMode) => set({ solarMode }),
  setSelectedBody: (selectedBody) => set({ selectedBody }),
  setTour: (tour) => set({ tour }),
  setTourStep: (tourStep) => set({ tourStep }),
  setSolarBoard: (solarBoard) => set({ solarBoard }),
  addSolarBoardLine: (line) =>
    set((s) => ({ solarBoard: { ...s.solarBoard, lines: [...s.solarBoard.lines, line] } })),

  // ---- doubt-safe participation ----
  doubtCheck: null, // {attempts} while "is your doubt clear?" popup is showing
  setDoubtCheck: (doubtCheck) => set({ doubtCheck }),

  // ---- interaction ----
  userHandRaised: false,
  pendingDoubt: null, // question text waiting to be answered
  breakEndsAt: null,
  sessionEndsAt: null,

  // ---- actions ----
  setConfig: (config) => set({ config }),
  setLesson: (lesson) => set({ lesson }),
  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error, phase: "error" }),
  setSegmentIndex: (segmentIndex) => set({ segmentIndex }),
  setCaption: (caption, captionSpeaker = "") => set({ caption, captionSpeaker }),
  setProgress: (progress) => set({ progress }),
  setSpeaking: (speaking) => set({ speaking }),
  // Starting a new page archives the finished one into boardPages, so the
  // child's "My Whiteboard" keeps everything taught so far. Re-teaching a
  // page (resume after doubt/break) replaces its archived copy.
  setBoard: (board) =>
    set((s) => {
      const prev = s.board;
      let boardPages = s.boardPages;
      if (prev.lines.length > 0) {
        boardPages = [...boardPages.filter((p) => p.title !== prev.title), { ...prev }];
      }
      return { board, boardPages };
    }),
  addBoardLine: (line) =>
    set((s) => ({ board: { ...s.board, lines: [...s.board.lines, line] } })),
  setBoardAnim: (boardAnim) => set({ boardAnim }),
  setRaisedHandStudent: (raisedHandStudent) => set({ raisedHandStudent }),
  setBoardFocus: (boardFocus) => set({ boardFocus }),
  setBoardOpen: (boardOpen) => set({ boardOpen }),
  setMcq: (mcq) => set({ mcq }),
  answerMcq: (i) =>
    set((s) => (s.mcq && s.mcq.picked == null ? { mcq: { ...s.mcq, picked: i } } : {})),
  raiseUserHand: () => {
    const s = get();
    if (["teaching", "peerQuestion", "recap", "quiz", "intro"].includes(s.phase)) {
      set({ userHandRaised: true });
    }
  },
  clearUserHand: () => set({ userHandRaised: false }),
  setPendingDoubt: (pendingDoubt) => set({ pendingDoubt }),
  setResumePoint: (resumePoint) => set({ resumePoint }),
  setBreakEndsAt: (breakEndsAt) => set({ breakEndsAt }),
  setSessionEndsAt: (sessionEndsAt) => set({ sessionEndsAt }),

  reset: () => {
    boardBridge.clear(); // wipe the interactive board between lessons
    set({
      appMode: "classroom",
      solarMode: "choose",
      selectedBody: null,
      tour: null,
      tourStep: 0,
      solarBoard: { title: "", lines: [] },
      solarEye: false,
      config: null,
      lesson: null,
      error: null,
      phase: "dashboard",
      segmentIndex: 0,
      resumePoint: null,
      progress: 0,
      caption: "",
      captionSpeaker: "",
      speaking: false,
      board: { title: "", lines: [] },
      boardPages: [],
      boardAnim: null,
      raisedHandStudent: -1,
      boardFocus: false,
      boardOpen: false,
      mcq: null,
      userHandRaised: false,
      pendingDoubt: null,
      breakEndsAt: null,
      sessionEndsAt: null,
    });
  },
}));
