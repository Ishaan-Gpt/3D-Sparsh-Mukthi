import { useEffect, useRef } from "react";
import { useLessonStore } from "../store/useLessonStore";
import { speakLines, stopSpeech } from "../lib/tts";
import { askDoubt } from "../lib/api";

const CHILD_VOICE = { voiceGender: "female", rate: 1.05, pitch: 1.45 };
// Some models pre-number board steps ("1. Foo") — strip so we number once.
const stripNum = (s) => String(s).replace(/^\s*\d+[.)]\s*/, "");
const BREAK_SECONDS = 120;

/**
 * The conductor. AI proposes content (the lesson plan); this engine decides
 * when each piece plays. Every phase is paced by real TTS callbacks, and
 * timers/events (breaks, hand-raise doubts) interrupt and resume cleanly.
 */
export function useLessonEngine() {
  const store = useLessonStore;
  const cancelRef = useRef(null); // cancels the in-flight speech sequence
  const lineProgressRef = useRef(0); // sentence index inside current phase, for resume
  const nextBreakAtRef = useRef(Infinity);

  const s = () => store.getState();

  const teacherVoice = () => {
    const t = s().config?.teacher ?? {};
    return { voiceGender: t.voiceGender, rate: t.rate, pitch: t.pitch };
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
      },
      onDone: (finished) => {
        s().setSpeaking(false);
        if (finished) opts?.onDone?.();
      },
    });
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

  // ------------------------------------------------------------------
  // Phase scripts — run whenever phase/segment changes
  // ------------------------------------------------------------------
  const phase = useLessonStore((st) => st.phase);
  const segmentIndex = useLessonStore((st) => st.segmentIndex);
  const lesson = useLessonStore((st) => st.lesson);
  const pendingDoubt = useLessonStore((st) => st.pendingDoubt);

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
      st.setBoardFocus(false);
      const per = Math.max(1, Math.ceil(seg.sentences.length / Math.max(1, seg.boardPoints.length)));
      speak(seg.sentences.slice(startLine), {
        speaker: teacher,
        onLineStart: (line, i) => {
          track(line, i);
          const abs = startLine + i;
          const pointIdx = Math.floor(abs / per);
          const revealed = s().board.lines.length;
          if (pointIdx >= revealed && seg.boardPoints[revealed]) {
            s().addBoardLine("• " + seg.boardPoints[revealed]);
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
        ...CHILD_VOICE,
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
      if (startLine === 0)
        st.setBoard({ title: "What we learned today ⭐", lines: [] });
      st.setBoardFocus(false);
      speak(lesson.recap.slice(startLine), {
        speaker: teacher,
        onLineStart: track,
        onDone: () => goTo("quiz"),
      });
    }

    if (phase === "quiz") {
      const lines = [];
      lesson.quiz.forEach((q, i) => {
        lines.push(`Quiz time! Question ${i + 1}: ${q.question}`);
        lines.push(`The answer is: ${q.answer}`);
      });
      lines.push(lesson.goodbye);
      if (startLine === 0) st.setBoard({ title: "Quiz Time! 🎉", lines: [] });
      speak(lines.slice(startLine), {
        speaker: teacher,
        onLineStart: track,
        onDone: () => s().setPhase("end"),
      });
    }

    if (phase === "break") {
      st.setCaption("Break time! Stretch, blink, and drink some water. 🧘", teacher);
      const t = setTimeout(resumeFromBreak, Math.max(0, (st.breakEndsAt ?? 0) - Date.now()));
      return () => clearTimeout(t);
    }

    if (phase === "end") {
      st.setCaption("Class dismissed! Great job today. 🌟", teacher);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, segmentIndex, lesson]);

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
  // Live doubt: user raised hand and submitted a question → interrupt,
  // ask the AI for real, answer on the board, then resume where we were.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!pendingDoubt || !lesson) return;
    const st = s();
    if (st.phase === "doubt") return;

    const resume = { phase: st.phase, segmentIndex: st.segmentIndex };
    const resumeLine = lineProgressRef.current;
    cancelRef.current?.();
    stopSpeech();
    st.setResumePoint(resume);
    st.setPhase("doubt");
    const teacher = st.config?.teacher?.name ?? "Teacher";

    speak([`That's a wonderful question! Let me think about it.`], {
      speaker: teacher,
      onDone: async () => {
        try {
          const { data } = await askDoubt(pendingDoubt, st.config);
          const steps = data.boardSteps ?? [];
          if (steps.length) {
            s().setBoard({ title: "Your question ✋", lines: [] });
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
            onDone: finishDoubt,
          });
        } catch (err) {
          speak(
            ["Hmm, I could not hear that properly. Let us continue, and you can ask me again!"],
            { speaker: teacher, onDone: finishDoubt }
          );
        }
      },
    });

    function finishDoubt() {
      const st2 = s();
      st2.setBoardFocus(false);
      st2.setPendingDoubt(null);
      st2.clearUserHand();
      const rp = st2.resumePoint ?? { phase: "recap", segmentIndex: st2.segmentIndex };
      st2.setResumePoint(null);
      lineProgressRef.current = resumeLine;
      st2.setSegmentIndex(rp.segmentIndex);
      // restore board for the interrupted segment
      const seg = st2.lesson.segments[rp.segmentIndex];
      if (rp.phase === "teaching" && seg) {
        st2.setBoard({ title: seg.heading, lines: [] });
      }
      st2.setPhase(rp.phase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDoubt]);

  // ------------------------------------------------------------------
  // Immersive Study (solar module): pause the lesson on entry, resume
  // from the exact sentence on exit.
  // ------------------------------------------------------------------
  const appMode = useLessonStore((st) => st.appMode);
  const solarSaveRef = useRef(null);
  useEffect(() => {
    const st = s();
    if (appMode === "solar") {
      if (!lesson) return;
      solarSaveRef.current = {
        phase: ["break", "doubt", "immersive"].includes(st.phase) ? "teaching" : st.phase,
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

  return { resumeFromBreak };
}
