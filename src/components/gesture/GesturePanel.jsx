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
// two-hand zoom (from the classic touchless virtual-mouse): spread both index
// fingertips apart to zoom IN, bring them together to zoom OUT
const ZOOM_STEP = 0.045; // normalized spread change to register — slight/tremor movements do nothing
const ZOOM_GAIN = 1.8; // spread change → zoom level
// virtual-mouse tuning (inspired by the classic PyAutoGUI touchless mouse)
const FRAME_REDUCTION = 0.16; // dead border of the camera frame
const SMOOTHENING = 5; // cursor easing divisor
const CLICK_ON = 0.55; // index↔middle tip distance / hand size → click
const CLICK_OFF = 0.75; // must separate past this to re-arm (no repeat clicks)
// anti-jitter deviation gates: natural hand tremor below these thresholds is
// ignored entirely, so the cursor/camera/zoom hold perfectly still.
const CURSOR_DEADZONE = 0.01; // normalized screen units
const LOOK_DEADZONE = 0.015; // palm-steering channel
const PINCH_DEADBAND = 0.03; // pinch ratio — tiny finger tremble ≠ zoom change
const LOOK_EMA = 0.18; // extra low-pass on the look channel

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

// mirrored skeleton overlay for any number of hands
function drawHands(ctx, canvas, hands, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const lm of hands) {
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
  }
}

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
    let zoomPrevDist = null; // two-hand spread from the previous frame

    (async () => {
      try {
        const { FilesetResolver, HandLandmarker, FaceDetector } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2, // two hands = zoom gesture
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
          const allHands = res.landmarks ?? [];
          gestureState.twoHands = allHands.length === 2;

          if (allHands.length === 0) {
            gestureState.present = false;
            gestureState.palmOpen = false;
            gestureState.pointing = false;
            gestureState.clickPose = false;
            gestureState.pinching = false;
            gestureState.raiseProgress = 0;
            gestureState.zoomVel = 0;
            zoomPrevDist = null;
            raisedSince = 0;
            clickArmed = true;
            return;
          }

          // --- 🙌 TWO-HAND ZOOM: spread index tips apart = in, together = out ---
          if (allHands.length === 2) {
            const p = allHands[0][8];
            const q = allHands[1][8];
            const spread = Math.hypot(p.x - q.x, p.y - q.y);
            if (zoomPrevDist == null) zoomPrevDist = spread;
            const delta = spread - zoomPrevDist;
            if (Math.abs(delta) > ZOOM_STEP) {
              gestureState.zoomK = Math.min(1, Math.max(0, gestureState.zoomK + delta * ZOOM_GAIN));
              gestureState.zoomVel = delta;
              zoomPrevDist = spread;
            } else {
              gestureState.zoomVel = 0;
            }
            // zoom mode suspends the one-hand channels
            gestureState.present = true;
            gestureState.palmOpen = false;
            gestureState.pointing = false;
            gestureState.clickPose = false;
            gestureState.raiseProgress = 0;
            raisedSince = 0;
            clickArmed = true;

            // draw both skeletons + the zoom line between index tips
            drawHands(ctx, canvas, allHands, "#5fd4ff");
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo((1 - p.x) * canvas.width, p.y * canvas.height);
            ctx.lineTo((1 - q.x) * canvas.width, q.y * canvas.height);
            ctx.stroke();
            return;
          }

          zoomPrevDist = null;
          gestureState.zoomVel = 0;
          const lm = allHands[0];
          const a = analyse(lm);
          const now = Date.now();
          gestureState.present = true;
          gestureState.palmOpen = a.palmOpen;
          gestureState.pointing = a.pointing;
          gestureState.clickPose = a.clickPose;
          // pinch: deadband + low-pass so a slight finger tremble while
          // holding a zoom doesn't make the camera jitter
          if (Math.abs(a.pinch - gestureState.pinch) > PINCH_DEADBAND) {
            gestureState.pinch += (a.pinch - gestureState.pinch) * 0.35;
          }
          // look-around channel: palm centre, mirrored, deadzoned + smoothed
          const lx = 1 - a.px;
          const ly = a.py;
          if (Math.hypot(lx - gestureState.lookX, ly - gestureState.lookY) > LOOK_DEADZONE) {
            gestureState.lookX += (lx - gestureState.lookX) * LOOK_EMA;
            gestureState.lookY += (ly - gestureState.lookY) * LOOK_EMA;
          }

          // --- ☝️ cursor: index fingertip, dead-border mapped + smoothed ---
          if (a.pointing || a.clickPose) {
            const tx = interp(1 - a.ix); // mirror
            const ty = interp(a.iy);
            // deviation gate: hold still inside the deadzone, then follow with
            // adaptive easing (small moves glide, big moves snap)
            const d = Math.hypot(tx - gestureState.x, ty - gestureState.y);
            if (d > CURSOR_DEADZONE) {
              const ease = Math.min(0.5, Math.max(1 / SMOOTHENING, d * 2.5));
              gestureState.x += (tx - gestureState.x) * ease;
              gestureState.y += (ty - gestureState.y) * ease;
            }
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

          // --- ✋ hand raise: open palm in upper half, held 3s ---
          const raised = a.palmOpen && a.py < 0.55;
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
          const color = a.clickPose
            ? "#c17bff"
            : a.pointing
              ? "#5fd4ff"
              : a.palmOpen
                ? "#38e07d"
                : "#ffd166";
          drawHands(ctx, canvas, [lm], color);
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
            ✋ 3s ask · 🖐 look · ☝️ cursor · ✌️ close = click · 🙌 two hands = zoom
          </div>
        </div>
      )}
      <button className="gesture-toggle" onClick={() => setOn(!on)}>
        {on ? "Hide 📷" : "📷 Gestures"}
      </button>
    </div>
  );
}
