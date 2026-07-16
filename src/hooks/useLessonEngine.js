import { useEffect, useRef } from "react";
import { useLessonStore } from "../store/useLessonStore";
import { speakLines, stopSpeech, warmSpeechCache } from "../lib/tts";
import { askDoubt } from "../lib/api";
import { gestureState } from "../lib/gestureState";
import { studentVoice } from "../data/curriculum";

// Each classmate speaks with their OWN voice (Orpheus/Gemini/browser chain).
const childVoice = (index) => ({
  ...studentVoice(index),
  styleNote: "an excited, curious 8-year-old Indian school kid",
});
const BREAK_SECONDS = 120;
const ATTENTION_AFTER_MS = 12000; // no face this long → teacher checks on you
const ATTENTION_COOLDOWN_MS = 45000;

// Some models pre-number board steps ("1. Foo") — strip so we number once.
const stripNum = (s) => String(s).replace(/^\s*\d+[.)]\s*/, "");

const CLASSMATE_REACTIONS = [
  "Ooh! I did not know that!",
  "Wow, that is so cool!",
  "That was a good question!",
  "Now I understand it too!",
];

// ---------------------------------------------------------------------------
// Lesson progress: exact % of planned spoken lines completed (replaces the
// wall-clock timer, which drifted whenever the class paused or detoured).
// ---------------------------------------------------------------------------
function lessonProgress(lesson, phase, segIdx, line) {
  if (!lesson) return null;
  if (phase === "end") return 1;
  const segs = lesson.segments ?? [];
  const segLen = (sg) => (sg.sentences?.length ?? 0) + 1 + (sg.peerQuestion?.answer?.length ?? 0);
  let total = lesson.intro?.length ?? 0;
  const segStart = [];
  for (const sg of segs) {
    segStart.push(total);
    total += segLen(sg);
  }
  const wbStart = total;
  total += lesson.doubtSolution?.spoken?.length ?? 0;
  const recapStart = total;
  total += lesson.recap?.length ?? 0;
  const quizStart = total;
  total += (lesson.quiz?.length ?? 0) * 3 + 1; // question + prompt + feedback each, + goodbye

  let done;
  if (phase === "intro") done = line;
  else if (phase === "teaching") done = (segStart[segIdx] ?? 0) + line;
  else if (phase === "peerQuestion") done = (segStart[segIdx] ?? 0) + (segs[segIdx]?.sentences?.length ?? 0) + 1;
  else if (phase === "whiteboard") done = wbStart + line;
  else if (phase === "recap") done = recapStart + line;
  else if (phase === "quiz") done = quizStart + line * 3;
  else return null; // interruptions (doubt/break/pause) keep the last value
  return Math.min(0.99, Math.max(0, done / Math.max(1, total)));
}

// child-safe shuffle with a stable seed per question (no reshuffle on resume)
function shuffled(arr, seed) {
  const a = [...arr];
  let s = seed + 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The conductor. AI proposes content (the lesson plan); this engine decides
 * when each piece plays. Every phase is paced by real speech, and
 * timers/events (breaks, hand-raise doubts, attention drops, immersive mode,
 * user pause) interrupt and resume from the exact sentence.
 */
export function useLessonEngine() {
  const store = useLessonStore;
  const cancelRef = useRef(null); // cancels the in-flight speech sequence
  const lineProgressRef = useRef(0); // sentence index inside current phase, for resume
  const nextBreakAtRef = useRef(Infinity);
  const interruptSaveRef = useRef(null); // saved spot for doubt/pause/attention
  const attentionCooldownRef = useRef(0);
  const doubtAttemptsRef = useRef(0);
  const lastDoubtRef = useRef("");

  const s = () => store.getState();

  const teacherVoice = () => {
    const t = s().config?.teacher ?? {};
    return {
      voiceGender: t.voiceGender,
      voiceName: t.voiceName ?? (t.voiceGender === "male" ? "Charon" : "Kore"),
      orpheusVoice: t.orpheusVoice ?? (t.voiceGender === "male" ? "leo" : "tara"),
      styleNote: `${t.name ?? "a teacher"}, a ${t.style ?? "warm"} Indian primary school teacher`,
      rate: t.rate,
      pitch: t.pitch,
    };
  };

  const speak = (lines, opts) => {
    cancelRef.current?.();
    cancelRef.current = speakLines(lines, {
      ...teacherVoice(),
      ...opts,
      onLineStart: (line, i) => {
        s().setSpeaking(true);
        s().setCaption(line, opts?.speaker ?? s().config?.teacher?.name ?? "Teacher");
        opts?.onLineStart?.(line, i);
        const st = s();
        const p = lessonProgress(st.lesson, st.phase, st.segmentIndex, lineProgressRef.current);
        if (p != null) st.setProgress(p);
      },
      onDone: (finished) => {
        s().setSpeaking(false);
        if (finished) opts?.onDone?.();
      },
    });
  };

  // Save the current spot, run an interruption phase, restore later.
  const saveSpot = () => {
    const st = s();
    interruptSaveRef.current = {
      phase: ["break", "doubt", "doubtWait", "paused", "attention", "immersive"].includes(st.phase)
        ? "teaching"
        : st.phase,
      segmentIndex: st.segmentIndex,
      line: lineProgressRef.current,
    };
  };

  const restoreSpot = () => {
    const st = s();
    const saved = interruptSaveRef.current ?? { phase: "recap", segmentIndex: st.segmentIndex, line: 0 };
    interruptSaveRef.current = null;
    lineProgressRef.current = saved.line;
    const seg = st.lesson?.segments?.[saved.segmentIndex];
    if (saved.phase === "teaching" && seg) st.setBoard({ title: seg.heading, lines: [] });
    st.setSegmentIndex(saved.segmentIndex);
    st.setPhase(saved.phase);
  };

  // Move to a phase, but detour through a break first if one is due.
  const goTo = (phase, segmentIndex = s().segmentIndex) => {
    lineProgressRef.current = 0;
    const inBreakablePhase = ["teaching", "peerQuestion", "recap", "quiz"].includes(phase);
    if (inBreakablePhase && Date.now() >= nextBreakAtRef.current) {
      s().setResumePoint({ phase, segmentIndex });
      s().setBreakEndsAt(Date.now() + BREAK_SECONDS * 1000);
      s().setPhase("break");
      return;
    }
    s().setSegmentIndex(segmentIndex);
    s().setPhase(phase);
  };

  // boardPoints may be [{text, afterSentence}] (new) or plain strings (fallback)
  const normalizePoints = (points, sentenceCount) =>
    (points ?? []).map((p, i) =>
      typeof p === "string"
        ? { text: p, afterSentence: Math.floor((i * sentenceCount) / Math.max(1, points.length)) }
        : p
    );

  // ------------------------------------------------------------------
  // Whole-lesson voice preload: as soon as the plan arrives, every planned
  // line (teacher AND each classmate's voice) is generated into the cache in
  // the background — playback is then instant; only live doubts wait.
  // ------------------------------------------------------------------
  const lessonForWarmup = useLessonStore((st) => st.lesson);
  useEffect(() => {
    const l = lessonForWarmup;
    if (!l) return;
    const st = s();
    const names = st.config?.studentNames ?? [];
    const name = st.config?.userName ?? "dear";
    const tv = teacherVoice();
    const tasks = [{ lines: l.intro, opts: tv }];
    (l.segments ?? []).forEach((seg) => {
      tasks.push({ lines: seg.sentences, opts: tv });
      if (seg.peerQuestion) {
        const who = Math.min(Math.max(seg.peerQuestion.studentIndex ?? 0, 0), Math.max(0, names.length - 1));
        tasks.push({ lines: [seg.peerQuestion.question], opts: childVoice(who) });
        tasks.push({ lines: seg.peerQuestion.answer, opts: tv });
      }
    });
    tasks.push({ lines: l.doubtSolution?.spoken ?? [], opts: tv });
    tasks.push({ lines: l.recap, opts: tv });
    (l.quiz ?? []).forEach((q, i) => {
      const right = q.options?.[q.correctIndex] ?? q.answer;
      tasks.push({
        lines: [
          `Quiz time! Question ${i + 1}: ${q.question}`,
          `Good try! The right answer is: ${right}.`,
        ],
        opts: tv,
      });
    });
    tasks.push({
      lines: [
        "Tick the right answer on the board!",
        "Correct! Very well done, superstar!",
        l.goodbye,
        `Yes ${name}? What is your question, my dear?`,
        "That's a wonderful question! Let me think.",
        "Hmm, let me explain it another way!",
        `So ${name}, is your doubt clear now?`,
        `Wonderful, ${name}! Never be afraid to ask questions.`,
      ],
      opts: tv,
    });
    // classmate reactions in every student's own voice
    names.forEach((_, idx) => tasks.push({ lines: CLASSMATE_REACTIONS, opts: childVoice(idx) }));
    return warmSpeechCache(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonForWarmup]);

  // ------------------------------------------------------------------
  // Phase scripts
  // ------------------------------------------------------------------
  const phase = useLessonStore((st) => st.phase);
  const segmentIndex = useLessonStore((st) => st.segmentIndex);
  const lesson = useLessonStore((st) => st.lesson);
  const pendingDoubt = useLessonStore((st) => st.pendingDoubt);
  const userHandRaised = useLessonStore((st) => st.userHandRaised);
  const appMode = useLessonStore((st) => st.appMode);

  useEffect(() => {
    if (!lesson) return;
    const st = s();
    const startLine = lineProgressRef.current;
    const teacher = st.config?.teacher?.name ?? "Teacher";
    const track = (line, i) => {
      lineProgressRef.current = startLine + i;
    };

    if (phase === "intro") {
      if (startLine === 0) st.setBoard({ title: lesson.title, lines: [] });
      st.setBoardFocus(false);
      if (nextBreakAtRef.current === Infinity) {
        const mins = st.config?.breakEveryMinutes ?? 10;
        nextBreakAtRef.current = Date.now() + mins * 60 * 1000;
        st.setSessionEndsAt(Date.now() + (st.config?.sessionMinutes ?? 20) * 60 * 1000);
      }
      speak(lesson.intro.slice(startLine), {
        speaker: teacher,
        onLineStart: track,
        onDone: () => goTo("teaching", 0),
      });
    }

    if (phase === "teaching") {
      const seg = lesson.segments[segmentIndex];
      if (!seg) return goTo("recap");
      if (startLine === 0) st.setBoard({ title: seg.heading, lines: [] });
      st.setBoardAnim(seg.visual ?? null); // animated concept for this segment
      st.setBoardFocus(false);
      const points = normalizePoints(seg.boardPoints, seg.sentences.length);
      speak(seg.sentences.slice(startLine), {
        speaker: teacher,
        onLineStart: (line, i) => {
          track(line, i);
          const abs = startLine + i;
          // reveal every board point whose sentence has arrived — true sync
          let revealed = s().board.lines.length;
          while (revealed < points.length && points[revealed].afterSentence <= abs) {
            s().addBoardLine("• " + points[revealed].text);
            revealed++;
          }
        },
        onDone: () => goTo("peerQuestion"),
      });
    }

    if (phase === "peerQuestion") {
      const seg = lesson.segments[segmentIndex];
      const pq = seg?.peerQuestion;
      const names = st.config?.studentNames ?? [];
      if (!pq) return advanceAfterSegment();
      const who = Math.min(Math.max(pq.studentIndex, 0), names.length - 1);
      const childName = names[who] ?? "A classmate";
      st.setRaisedHandStudent(who);
      speak([pq.question], {
        ...childVoice(who),
        speaker: childName,
        onDone: () => {
          s().setRaisedHandStudent(-1);
          speak(pq.answer, { speaker: teacher, onDone: advanceAfterSegment });
        },
      });
    }

    if (phase === "whiteboard") {
      const sol = lesson.doubtSolution;
      if (!sol?.spoken?.length) return goTo("recap");
      if (startLine === 0) st.setBoard({ title: "Let's solve your doubt! ✏️", lines: [] });
      st.setBoardAnim(null);
      st.setBoardFocus(true);
      const per = Math.max(1, Math.ceil(sol.spoken.length / Math.max(1, sol.boardSteps.length)));
      speak(sol.spoken.slice(startLine), {
        speaker: teacher,
        onLineStart: (line, i) => {
          track(line, i);
          const abs = startLine + i;
          const stepIdx = Math.floor(abs / per);
          const revealed = s().board.lines.length;
          if (stepIdx >= revealed && sol.boardSteps[revealed]) {
            s().addBoardLine(`${revealed + 1}. ${stripNum(sol.boardSteps[revealed])}`);
          }
        },
        onDone: () => {
          s().setBoardFocus(false);
          goTo("recap");
        },
      });
    }

    if (phase === "recap") {
      if (startLine === 0) st.setBoard({ title: "What we learned today ⭐", lines: [] });
      st.setBoardAnim(null);
      st.setBoardFocus(false);
      speak(lesson.recap.slice(startLine), {
        speaker: teacher,
        onLineStart: track,
        onDone: () => goTo("quiz"),
      });
    }

    if (phase === "quiz") {
      // Interactive quiz: each question with options becomes a tickable MCQ on
      // the whiteboard; the child answers before the teacher reveals anything.
      // lineProgressRef holds the QUESTION index here, so breaks/doubts resume
      // at the same question.
      if (startLine === 0) st.setBoard({ title: "Quiz Time! 🎉", lines: [] });
      st.setBoardAnim(null);
      askQuizQuestion(startLine);
    }

    if (phase === "break") {
      st.setCaption("Break time! Stretch, blink, and drink some water. 🧘", teacher);
      const t = setTimeout(resumeFromBreak, Math.max(0, (st.breakEndsAt ?? 0) - Date.now()));
      return () => clearTimeout(t);
    }

    if (phase === "end") {
      st.setProgress(1);
      st.setCaption("Class dismissed! Great job today. 🌟", teacher);
    }

    if (phase === "dashboard") {
      cancelRef.current?.();
      stopSpeech();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, segmentIndex, lesson]);

  // ------------------------------------------------------------------
  // Interactive quiz (MCQ on the whiteboard)
  // ------------------------------------------------------------------
  const askQuizQuestion = (i) => {
    const st = s();
    const teacher = st.config?.teacher?.name ?? "Teacher";
    const quiz = st.lesson?.quiz ?? [];
    if (i >= quiz.length) {
      speak([st.lesson.goodbye], { speaker: teacher, onDone: () => s().setPhase("end") });
      return;
    }
    lineProgressRef.current = i;
    const q = quiz[i];
    let options = (q.options ?? []).map((o) => String(o).trim()).filter(Boolean);
    let correct;

    if (options.length >= 2) {
      correct = Number.isInteger(q.correctIndex) ? q.correctIndex : options.indexOf(q.answer);
      correct = Math.min(Math.max(correct, 0), options.length - 1);
    } else {
      // The plan came without options (older plan / fallback provider) —
      // synthesize choices so the teacher ALWAYS stops and waits for a tick.
      const distractors = quiz
        .filter((_, j) => j !== i)
        .map((x) => String(x.answer ?? "").trim())
        .filter((x) => x && x !== q.answer);
      options = shuffled([q.answer, ...distractors, "Something else!"].slice(0, 3), i);
      correct = Math.max(0, options.indexOf(q.answer));
    }

    speak([`Quiz time! Question ${i + 1}: ${q.question}`, "Tick the right answer on the board!"], {
      speaker: teacher,
      // the MCQ appears on the whiteboard; the teacher goes SILENT and the
      // engine waits — nothing advances until the child actually picks
      onDone: () => s().setMcq({ question: q.question, options, correct, picked: null, index: i }),
    });
  };

  // React to the child ticking an option: feedback, then the next question.
  const mcq = useLessonStore((st) => st.mcq);
  useEffect(() => {
    if (!mcq || mcq.picked == null) return;
    const teacher = s().config?.teacher?.name ?? "Teacher";
    const right = mcq.picked === mcq.correct;
    const lines = right
      ? ["Correct! Very well done, superstar!"]
      : [`Good try! The right answer is: ${mcq.options[mcq.correct]}.`];
    speak(lines, {
      speaker: teacher,
      onDone: () => {
        s().setMcq(null);
        if (s().phase === "quiz") askQuizQuestion(mcq.index + 1);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcq?.picked]);

  // If an interruption (doubt/break/pause) pulls us out of the quiz, drop the
  // open MCQ — resuming re-asks the same question cleanly.
  useEffect(() => {
    if (phase !== "quiz" && s().mcq) s().setMcq(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const advanceAfterSegment = () => {
    const st = s();
    const next = st.segmentIndex + 1;
    if (next < st.lesson.segments.length) return goTo("teaching", next);
    const hasDoubt = st.lesson.doubtSolution?.spoken?.length > 0;
    goTo(hasDoubt ? "whiteboard" : "recap");
  };

  const resumeFromBreak = () => {
    const st = s();
    if (st.phase !== "break") return;
    const mins = st.config?.breakEveryMinutes ?? 10;
    nextBreakAtRef.current = Date.now() + mins * 60 * 1000;
    st.setBreakEndsAt(null);
    const rp = st.resumePoint ?? { phase: "recap", segmentIndex: st.segmentIndex };
    st.setResumePoint(null);
    st.setSegmentIndex(rp.segmentIndex);
    st.setPhase(rp.phase);
  };

  // ------------------------------------------------------------------
  // Doubt-safe participation:
  // hand raised → class pauses, teacher calls YOUR name and waits →
  // you ask → AI answers → "Is your doubt clear?" → yes: praise + classmate
  // reaction; no: re-explained differently → resume at the exact sentence.
  // ------------------------------------------------------------------
  useEffect(() => {
    const st = s();
    if (!lesson) return;
    const name = st.config?.userName ?? "dear";

    if (userHandRaised && !pendingDoubt && !["doubtWait", "doubt", "break", "paused", "immersive", "end", "attention"].includes(st.phase)) {
      saveSpot();
      cancelRef.current?.();
      stopSpeech();
      st.setPhase("doubtWait");
      speak([`Yes ${name}? What is your question, my dear?`], { speaker: st.config?.teacher?.name });
    }

    if (!userHandRaised && st.phase === "doubtWait" && !pendingDoubt) {
      // student changed their mind
      cancelRef.current?.();
      stopSpeech();
      restoreSpot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHandRaised]);

  useEffect(() => {
    if (!pendingDoubt || !lesson) return;
    const st = s();
    if (st.phase === "doubt") return;
    if (!interruptSaveRef.current) saveSpot(); // doubt typed without hand-raise path

    cancelRef.current?.();
    stopSpeech();
    st.setPhase("doubt");
    doubtAttemptsRef.current = 0;
    lastDoubtRef.current = pendingDoubt;
    answerCurrentDoubt(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDoubt]);

  const answerCurrentDoubt = async (reexplain) => {
    const st = s();
    const teacher = st.config?.teacher?.name ?? "Teacher";
    const name = st.config?.userName ?? "dear";
    doubtAttemptsRef.current += 1;

    speak([reexplain ? "Hmm, let me explain it another way!" : "That's a wonderful question! Let me think."], {
      speaker: teacher,
      onDone: async () => {
        try {
          const { data } = await askDoubt(lastDoubtRef.current, st.config, {
            studentName: name,
            reexplain,
          });
          const steps = data.boardSteps ?? [];
          if (steps.length) {
            s().setBoard({ title: `${name}'s question ✋`, lines: [] });
            s().setBoardFocus(true);
          }
          const per = Math.max(1, Math.ceil(data.spoken.length / Math.max(1, steps.length)));
          speak(data.spoken, {
            speaker: teacher,
            onLineStart: (line, i) => {
              const stepIdx = Math.floor(i / per);
              const revealed = s().board.lines.length;
              if (steps.length && stepIdx >= revealed && steps[revealed]) {
                s().addBoardLine(`${revealed + 1}. ${stripNum(steps[revealed])}`);
              }
            },
            onDone: () => {
              speak([`So ${name}, is your doubt clear now?`], {
                speaker: teacher,
                onDone: () => s().setDoubtCheck({ attempts: doubtAttemptsRef.current }),
              });
            },
          });
        } catch {
          speak(["Hmm, I could not hear that properly. Let us continue, and you can ask me again!"], {
            speaker: teacher,
            onDone: finishDoubt,
          });
        }
      },
    });
  };

  const answerDoubtCheck = (isClear) => {
    const st = s();
    st.setDoubtCheck(null);
    const teacher = st.config?.teacher?.name ?? "Teacher";
    const name = st.config?.userName ?? "dear";
    const names = st.config?.studentNames ?? [];

    if (isClear) {
      const classmate = names[Math.floor(Math.random() * names.length)];
      const reaction = CLASSMATE_REACTIONS[Math.floor(Math.random() * CLASSMATE_REACTIONS.length)];
      speak([`Wonderful, ${name}! Never be afraid to ask questions.`], {
        speaker: teacher,
        onDone: () => {
          if (classmate) {
            const idx = names.indexOf(classmate);
            s().setRaisedHandStudent(idx);
            speak([reaction], {
              ...childVoice(idx),
              speaker: classmate,
              onDone: () => {
                s().setRaisedHandStudent(-1);
                finishDoubt();
              },
            });
          } else finishDoubt();
        },
      });
    } else if (doubtAttemptsRef.current < 2) {
      answerCurrentDoubt(true);
    } else {
      speak([`No problem, ${name}. Some ideas take time — we will explore this again after class, I promise!`], {
        speaker: teacher,
        onDone: finishDoubt,
      });
    }
  };

  const finishDoubt = () => {
    const st = s();
    st.setBoardFocus(false);
    st.setPendingDoubt(null);
    st.clearUserHand();
    st.setDoubtCheck(null);
    restoreSpot();
  };

  // ------------------------------------------------------------------
  // User pause / resume (leave and come back later)
  // ------------------------------------------------------------------
  const pauseClass = () => {
    const st = s();
    if (!st.lesson || ["paused", "break", "end", "dashboard"].includes(st.phase)) return;
    saveSpot();
    cancelRef.current?.();
    stopSpeech();
    st.setPhase("paused");
    st.setCaption("Class paused. Come back whenever you are ready! ⏸", st.config?.teacher?.name);
  };

  const resumeClass = () => {
    if (s().phase !== "paused") return;
    restoreSpot();
  };

  // ------------------------------------------------------------------
  // Attention-aware teaching: if the webcam sees no face for a while
  // during teaching, the teacher stops and calls you by name.
  // ------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      const st = s();
      if (!st.lesson || st.appMode !== "classroom") return;
      if (!["intro", "teaching", "peerQuestion", "recap", "quiz"].includes(st.phase)) return;
      if (!gestureState.enabled || !gestureState.lastFaceAt) return;
      const now = Date.now();
      if (now - gestureState.lastFaceAt < ATTENTION_AFTER_MS) return;
      if (now < attentionCooldownRef.current) return;
      attentionCooldownRef.current = now + ATTENTION_COOLDOWN_MS;

      const name = st.config?.userName ?? "dear";
      saveSpot();
      cancelRef.current?.();
      stopSpeech();
      st.setPhase("attention");
      speak([`${name}? Are you with me? Come back, we are learning something amazing!`], {
        speaker: st.config?.teacher?.name,
        onDone: restoreSpot,
      });
    }, 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Immersive Study (solar module): pause on entry, resume on exit.
  // ------------------------------------------------------------------
  const solarSaveRef = useRef(null);
  useEffect(() => {
    const st = s();
    if (appMode === "solar") {
      if (!lesson) return;
      solarSaveRef.current = {
        phase: ["break", "doubt", "doubtWait", "paused", "attention", "immersive"].includes(st.phase)
          ? "teaching"
          : st.phase,
        segmentIndex: st.segmentIndex,
        line: lineProgressRef.current,
      };
      cancelRef.current?.();
      stopSpeech();
      st.setSpeaking(false);
      st.setCaption("", "");
      st.setPhase("immersive");
    } else if (appMode === "classroom" && solarSaveRef.current) {
      const saved = solarSaveRef.current;
      solarSaveRef.current = null;
      stopSpeech();
      lineProgressRef.current = saved.line;
      const seg = st.lesson?.segments?.[saved.segmentIndex];
      if (saved.phase === "teaching" && seg) st.setBoard({ title: seg.heading, lines: [] });
      st.setSegmentIndex(saved.segmentIndex);
      st.setPhase(saved.phase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      cancelRef.current?.();
      stopSpeech();
    },
    []
  );

  return { resumeFromBreak, pauseClass, resumeClass, answerDoubtCheck };
}
