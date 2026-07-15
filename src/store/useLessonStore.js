import { create } from "zustand";

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
  caption: "", // sentence currently being spoken
  captionSpeaker: "", // who is speaking (teacher or a classmate)
  speaking: false, // TTS active → drives teacher animation
  board: { title: "", lines: [] }, // whiteboard content
  raisedHandStudent: -1, // classmate index with hand up (peer question)
  boardFocus: false, // camera should frame the whiteboard

  // ---- immersive study (solar system module) ----
  appMode: "classroom", // classroom | solar
  solarMode: "choose", // choose | interact | tour
  selectedBody: null, // planet id for the info card
  tour: null, // AI-generated narration {stops:[{id,title,spoken,board}]}
  tourStep: 0,
  solarBoard: { title: "", lines: [] }, // teacher's floating text board in the tour

  enterSolar: () => set({ appMode: "solar", solarMode: "choose", selectedBody: null, tourStep: 0 }),
  exitSolar: () => set({ appMode: "classroom", selectedBody: null }),
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
  setSpeaking: (speaking) => set({ speaking }),
  setBoard: (board) => set({ board }),
  addBoardLine: (line) =>
    set((s) => ({ board: { ...s.board, lines: [...s.board.lines, line] } })),
  setRaisedHandStudent: (raisedHandStudent) => set({ raisedHandStudent }),
  setBoardFocus: (boardFocus) => set({ boardFocus }),
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

  reset: () =>
    set({
      appMode: "classroom",
      solarMode: "choose",
      selectedBody: null,
      tour: null,
      tourStep: 0,
      solarBoard: { title: "", lines: [] },
      config: null,
      lesson: null,
      error: null,
      phase: "dashboard",
      segmentIndex: 0,
      resumePoint: null,
      caption: "",
      captionSpeaker: "",
      speaking: false,
      board: { title: "", lines: [] },
      raisedHandStudent: -1,
      boardFocus: false,
      userHandRaised: false,
      pendingDoubt: null,
      breakEndsAt: null,
      sessionEndsAt: null,
    }),
}));
