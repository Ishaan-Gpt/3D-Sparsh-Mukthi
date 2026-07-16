import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useLessonStore } from "../../store/useLessonStore";
import { bodyById } from "../../data/solarData";
import { bodyPositions, cameraGoal } from "./SolarSystem";
import { speakLines, stopSpeech } from "../../lib/tts";

/**
 * Guided "Play animation" mode: the camera flies from the whole-system view
 * to each planet in turn while the teacher's VOICE narrates (TTS) and a
 * floating text board writes the key points beside the planet.
 * The user can still orbit freely and zoom in/out during the tour.
 */
export function GuidedTour() {
  const tour = useLessonStore((s) => s.tour);
  const tourStep = useLessonStore((s) => s.tourStep);
  const solarBoard = useLessonStore((s) => s.solarBoard);
  const boardRef = useRef();
  const cancelRef = useRef(null);

  // drive camera + narration per stop
  useEffect(() => {
    if (!tour) return;
    const stop = tour.stops[tourStep];
    if (!stop) return;
    const st = useLessonStore.getState();
    const teacher = st.config?.teacher ?? {};

    cameraGoal.driven = true;
    st.setSolarBoard({ title: stop.title, lines: [] });

    const per = Math.max(1, Math.ceil(stop.spoken.length / Math.max(1, stop.board.length)));
    cancelRef.current?.();
    cancelRef.current = speakLines(stop.spoken, {
      voiceGender: teacher.voiceGender,
      voiceName: teacher.voiceName,
      orpheusVoice: teacher.orpheusVoice,
      styleNote: `${teacher.name ?? "a teacher"}, a ${teacher.style ?? "warm"} Indian primary school teacher`,
      rate: teacher.rate,
      pitch: teacher.pitch,
      onLineStart: (line, i) => {
        st.setCaption(line, teacher.name ?? "Teacher");
        st.setSpeaking(true);
        const revealed = useLessonStore.getState().solarBoard.lines.length;
        if (Math.floor(i / per) >= revealed && stop.board[revealed]) {
          st.addSolarBoardLine("• " + stop.board[revealed]);
        }
      },
      onDone: (finished) => {
        st.setSpeaking(false);
        if (!finished) return;
        const next = tourStep + 1;
        if (next < tour.stops.length) {
          st.setTourStep(next);
        } else {
          st.setCaption("That was our journey through the solar system! 🚀", teacher.name);
          st.setSolarMode("choose");
        }
      },
    });

    return () => {
      cancelRef.current?.();
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, tourStep]);

  useEffect(
    () => () => {
      cameraGoal.driven = false;
      stopSpeech();
      useLessonStore.getState().setSpeaking(false);
    },
    []
  );

  useFrame(({ camera }, delta) => {
    if (!tour) return;
    const stop = tour.stops[tourStep];
    if (!stop) return;

    // camera goal for this stop
    let center;
    let viewR;
    if (stop.id === "overview") {
      center = new THREE.Vector3(0, 0, 0);
      viewR = 110;
    } else {
      const b = bodyById(stop.id);
      center = bodyPositions[stop.id] ?? new THREE.Vector3();
      viewR = Math.max(5, b.radius * 6);
    }
    cameraGoal.target.copy(center);
    cameraGoal.radius = viewR;

    // text board floats beside the subject, always facing you
    if (boardRef.current) {
      const right = new THREE.Vector3().subVectors(camera.position, center).normalize();
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();
      const p = center
        .clone()
        .addScaledVector(side, -viewR * 0.32)
        .addScaledVector(right, viewR * 0.18)
        .add(new THREE.Vector3(0, viewR * 0.1, 0));
      boardRef.current.position.lerp(p, 1 - Math.exp(-delta * 3));
      const s = viewR * 0.012;
      boardRef.current.scale.setScalar(THREE.MathUtils.lerp(boardRef.current.scale.x || s, s, 0.1));
      boardRef.current.lookAt(camera.position);
    }
  });

  return (
    <group ref={boardRef}>
      <TextBoard title={solarBoard.title} lines={solarBoard.lines} />
    </group>
  );
}

// A floating white text board (world-space canvas texture).
function TextBoard({ title, lines, width = 30, height = 18 }) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 480;
    return c;
  }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(248, 250, 255, 0.96)";
    ctx.fillRect(0, 0, 800, 480);
    ctx.strokeStyle = "#7f96c9";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 790, 470);
    ctx.fillStyle = "#1c2f66";
    ctx.font = "bold 46px 'Comic Sans MS', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title ?? "", 400, 66, 740);
    ctx.textAlign = "left";
    ctx.font = "34px 'Comic Sans MS', 'Segoe UI', sans-serif";
    ctx.fillStyle = "#22335c";
    let y = 140;
    for (const line of (lines ?? []).slice(-6)) {
      const words = String(line).split(" ");
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > 720 && cur) {
          ctx.fillText(cur, 40, y);
          y += 42;
          cur = w;
        } else cur = test;
      }
      ctx.fillText(cur, 40, y);
      y += 54;
    }
    texture.needsUpdate = true;
  }, [title, lines, canvas, texture]);

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}
