import { useEffect, useRef, useState } from "react";
import { gestureState, gestureEvents } from "../../lib/gestureState";
import { useLessonStore } from "../../store/useLessonStore";
import "./GesturePanel.css";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const RAISE_MS = 3000;
const RAISE_COOLDOWN_MS = 6000;
const PINCH_ON = 0.35; // thumb-index ratio thresholds (hold = zoom)
const PINCH_OFF = 0.45;
// virtual-mouse tuning (inspired by the classic PyAutoGUI touchless mouse)
const FRAME_REDUCTION = 0.16; // dead border of the camera frame
const SMOOTHENING = 5; // cursor easing divisor
const CLICK_ON = 0.55; // index↔middle tip distance / hand size → click
const CLICK_OFF = 0.75; // must separate past this to re-arm (no repeat clicks)

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function analyse(lm) {
  // extended finger: tip further from wrist than its pip joint
  const wrist = lm[0];
  const ext = {};
  for (const [name, tip, pip] of [["index", 8, 6], ["middle", 12, 10], ["ring", 16, 14], ["pinky", 20, 18]]) {
    ext[name] = dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.15;
  }
  const extended = Object.values(ext).filter(Boolean).length;
  const handSize = Math.max(dist(wrist, lm[9]), 1e-3);
  return {
    palmOpen: extended >= 4,
    pointing: ext.index && !ext.middle && !ext.ring && !ext.pinky, // ☝️ cursor
    clickPose: ext.index && ext.middle && !ext.ring && !ext.pinky, // ✌️ click
    clickDist: dist(lm[8], lm[12]) / handSize, // index↔middle gap
    pinch: dist(lm[4], lm[8]) / handSize, // thumb↔index (zoom)
    ix: lm[8].x, // index fingertip (cursor)
    iy: lm[8].y,
    px: lm[9].x, // palm centre (look-around)
    py: lm[9].y,
  };
}

// map camera coords to screen with a dead border, like np.interp + clamp
const interp = (v) => Math.min(1, Math.max(0, (v - FRAME_REDUCTION) / (1 - 2 * FRAME_REDUCTION)));

/**
 * Gesture-first control panel: always-on webcam preview (bottom-right) with
 * live hand-landmark skeleton, plus the gesture interpreter that feeds
 * gestureState (look/zoom) and fires discrete events (hand raise, pinch tap).
 * All processing is local — no frames ever leave the browser.
 */
export function GesturePanel() {
  const [on, setOn] = useState(true);
  const [status, setStatus] = useState("starting"); // starting | on | error
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    gestureState.enabled = on && status === "on";
  }, [on, status]);

  useEffect(() => {
    if (!on) {
      setStatus("starting");
      return;
    }
    let cancelled = false;
    let stream, landmarker, raf;
    let raisedSince = 0;
    let raiseCooldownUntil = 0;
    let clickArmed = true; // latched: one click per ✌️-close, no repeats while held

    (async () => {
      try {
        const { FilesetResolver, HandLandmarker, FaceDetector } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
        // face presence for attention-aware teaching (best-effort)
        let faceDetector = null;
        try {
          faceDetector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
          });
        } catch (e) {
          console.warn("Face detector unavailable:", e.message);
        }
        let lastFaceCheck = 0;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 24 },
        });
        if (cancelled) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("on");

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const tick = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
          if (!video || video.readyState < 2) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          // mirrored preview
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0);
          ctx.restore();

          // attention: check for a face ~2x/sec
          const nowMs = Date.now();
          if (faceDetector && nowMs - lastFaceCheck > 500) {
            lastFaceCheck = nowMs;
            try {
              const faces = faceDetector.detectForVideo(video, performance.now());
              gestureState.facePresent = (faces.detections?.length ?? 0) > 0;
              if (gestureState.facePresent) gestureState.lastFaceAt = nowMs;
              else if (!gestureState.lastFaceAt) gestureState.lastFaceAt = nowMs; // arm on first run
            } catch { /* keep last state */ }
          }

          const res = landmarker.detectForVideo(video, performance.now());
          const lm = res.landmarks?.[0];

          if (!lm) {
            gestureState.present = false;
            gestureState.palmOpen = false;
            gestureState.pointing = false;
            gestureState.clickPose = false;
            gestureState.pinching = false;
            gestureState.raiseProgress = 0;
            raisedSince = 0;
            clickArmed = true;
            return;
          }

          const a = analyse(lm);
          const now = Date.now();
          gestureState.present = true;
          gestureState.palmOpen = a.palmOpen;
          gestureState.pointing = a.pointing;
          gestureState.clickPose = a.clickPose;
          gestureState.pinch = a.pinch;
          // look-around channel: palm centre, mirrored (raw — consumers smooth)
          gestureState.lookX = 1 - a.px;
          gestureState.lookY = a.py;

          // --- ☝️ cursor: index fingertip, dead-border mapped + smoothed ---
          if (a.pointing || a.clickPose) {
            const tx = interp(1 - a.ix); // mirror
            const ty = interp(a.iy);
            gestureState.x += (tx - gestureState.x) / SMOOTHENING;
            gestureState.y += (ty - gestureState.y) / SMOOTHENING;
          }

          // --- ✌️ click: index+middle together = ONE click, re-arm on separation ---
          if (a.clickPose) {
            if (clickArmed && a.clickDist < CLICK_ON) {
              clickArmed = false;
              const cx = gestureState.x * window.innerWidth;
              const cy = gestureState.y * window.innerHeight;
              const el = document.elementFromPoint(cx, cy);
              if (el && el.tagName !== "CANVAS" && !el.closest(".gesture-panel")) {
                el.click?.();
                el.focus?.();
              } else {
                gestureEvents.dispatchEvent(
                  new CustomEvent("pinch-select", {
                    detail: { x: gestureState.x, y: gestureState.y },
                  })
                );
              }
            } else if (!clickArmed && a.clickDist > CLICK_OFF) {
              clickArmed = true;
            }
          } else {
            clickArmed = true;
          }

          // --- 🤏 hold pinch = zoom (thumb-index, hysteresis; no click here) ---
          if (!gestureState.pinching && a.pinch < PINCH_ON && !a.clickPose) {
            gestureState.pinching = true;
          } else if (gestureState.pinching && (a.pinch > PINCH_OFF || a.clickPose)) {
            gestureState.pinching = false;
          }

          // --- ✋ hand raise: open palm in upper half, held 3s ---
          const raised = a.palmOpen && a.py < 0.55 && !gestureState.pinching;
          if (raised && now > raiseCooldownUntil) {
            if (!raisedSince) raisedSince = now;
            gestureState.raiseProgress = Math.min(1, (now - raisedSince) / RAISE_MS);
            if (gestureState.raiseProgress >= 1) {
              raisedSince = 0;
              raiseCooldownUntil = now + RAISE_COOLDOWN_MS;
              gestureState.raiseProgress = 0;
              gestureEvents.dispatchEvent(new Event("hand-raised"));
              useLessonStore.getState().raiseUserHand();
            }
          } else {
            raisedSince = 0;
            gestureState.raiseProgress = 0;
          }

          // --- draw skeleton (mirrored) ---
          ctx.strokeStyle = gestureState.pinching
            ? "#ff5d5d"
            : a.clickPose
              ? "#c17bff"
              : a.pointing
                ? "#5fd4ff"
                : a.palmOpen
                  ? "#38e07d"
                  : "#ffd166";
          ctx.lineWidth = 3;
          for (const [i, j] of CONNECTIONS) {
            ctx.beginPath();
            ctx.moveTo((1 - lm[i].x) * canvas.width, lm[i].y * canvas.height);
            ctx.lineTo((1 - lm[j].x) * canvas.width, lm[j].y * canvas.height);
            ctx.stroke();
          }
          ctx.fillStyle = "#fff";
          for (const p of lm) {
            ctx.beginPath();
            ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          // raise progress ring
          if (gestureState.raiseProgress > 0) {
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(
              canvas.width / 2,
              canvas.height / 2,
              40,
              -Math.PI / 2,
              -Math.PI / 2 + gestureState.raiseProgress * Math.PI * 2
            );
            ctx.stroke();
          }
        };
        tick();
      } catch (err) {
        console.error("Gesture panel failed:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      gestureState.enabled = false;
      gestureState.present = false;
    };
  }, [on]);

  return (
    <div className={`gesture-panel ${on ? "" : "collapsed"}`}>
      {on && (
        <div className="gesture-view">
          <video ref={videoRef} muted playsInline style={{ display: "none" }} />
          <canvas ref={canvasRef} className="gesture-canvas" />
          {status === "starting" && <div className="gesture-status">Starting camera…</div>}
          {status === "error" && <div className="gesture-status">⚠️ Camera unavailable</div>}
          <div className="gesture-legend">
            ✋ 3s ask · 🖐 look · ☝️ cursor · ✌️ close = click · 🤏 zoom
          </div>
        </div>
      )}
      <button className="gesture-toggle" onClick={() => setOn(!on)}>
        {on ? "Hide 📷" : "📷 Gestures"}
      </button>
    </div>
  );
}
