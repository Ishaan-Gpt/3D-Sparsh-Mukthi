import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useLessonStore } from "../../store/useLessonStore";
import { gestureState } from "../../lib/gestureState";
import { dirToYawPitch } from "../../lib/threeUtils";

// You sit at the 2nd-row centre bench. The camera never moves — it only
// turns (head) and zooms (pinch / wheel). True first-person.
const SEAT = new THREE.Vector3(0, -0.9, 5.2);
const TEACHER_HEAD = new THREE.Vector3(-12, 2.6, -14);
const BOARD = new THREE.Vector3(0, 0.6, -16.6);

const BASE_FOV = 50;
const MAX_ZOOM_FOV = 22;
const GESTURE_YAW_RANGE = 2.2; // radians of look-around from hand position
const GESTURE_PITCH_RANGE = 1.0;

export function FPVCamera() {
  const { camera, gl } = useThree();
  const mouse = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 });
  const smooth = useRef({ yaw: null, pitch: null, gYaw: 0, gPitch: 0, fov: BASE_FOV });

  // mouse-drag look + wheel zoom (parallel to gestures)
  useEffect(() => {
    const el = gl.domElement;
    const down = (e) => {
      mouse.current.dragging = true;
      mouse.current.lastX = e.clientX;
      mouse.current.lastY = e.clientY;
    };
    const move = (e) => {
      if (!mouse.current.dragging) return;
      mouse.current.yaw = THREE.MathUtils.clamp(
        mouse.current.yaw + (e.clientX - mouse.current.lastX) * 0.004,
        -2.4,
        2.4
      );
      mouse.current.pitch = THREE.MathUtils.clamp(
        mouse.current.pitch + (e.clientY - mouse.current.lastY) * 0.003,
        -0.9,
        0.9
      );
      mouse.current.lastX = e.clientX;
      mouse.current.lastY = e.clientY;
    };
    const up = () => (mouse.current.dragging = false);
    let wheelZoom = 0;
    const wheel = (e) => {
      wheelZoom = THREE.MathUtils.clamp(wheelZoom + e.deltaY * -0.0012, 0, 1);
      mouse.current.wheelZoom = wheelZoom;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const st = useLessonStore.getState();
    const k = 1 - Math.exp(-delta * 4); // smoothing

    // zoom amount first — zooming always aims at the whiteboard
    let zoomK = mouse.current.wheelZoom ?? 0;
    if (gestureState.enabled && gestureState.pinching) {
      zoomK = Math.max(zoomK, THREE.MathUtils.clamp((0.42 - gestureState.pinch) / 0.3, 0, 1));
    }

    // where the lesson wants you to look by default
    const lessonTarget = st.boardFocus || st.phase === "whiteboard" ? BOARD : TEACHER_HEAD;
    // pinch/wheel zoom pulls the view onto the whiteboard
    const target = lessonTarget.clone().lerp(BOARD, THREE.MathUtils.clamp(zoomK * 2, 0, 1));
    const baseDir = target.clone().sub(SEAT).normalize();
    const base = dirToYawPitch(baseDir);

    // gesture look: open palm steers your head; drop the hand to return
    let gYawT = 0;
    let gPitchT = 0;
    if (gestureState.enabled && gestureState.present && gestureState.palmOpen && !gestureState.pinching) {
      gYawT = -(gestureState.x - 0.5) * GESTURE_YAW_RANGE;
      gPitchT = -(gestureState.y - 0.5) * GESTURE_PITCH_RANGE;
    }
    smooth.current.gYaw += (gYawT - smooth.current.gYaw) * k;
    smooth.current.gPitch += (gPitchT - smooth.current.gPitch) * k;

    const yawT = base.yaw + smooth.current.gYaw + -mouse.current.yaw;
    const pitchT = base.pitch + smooth.current.gPitch - mouse.current.pitch;
    if (smooth.current.yaw === null) {
      smooth.current.yaw = yawT;
      smooth.current.pitch = pitchT;
    }
    smooth.current.yaw += (yawT - smooth.current.yaw) * k;
    smooth.current.pitch += (pitchT - smooth.current.pitch) * k;

    camera.position.copy(SEAT);
    camera.rotation.set(smooth.current.pitch, smooth.current.yaw, 0, "YXZ");

    // pinch zoom (hold pinch; tighter pinch = closer) + wheel fallback
    const fovT = BASE_FOV - (BASE_FOV - MAX_ZOOM_FOV) * zoomK;
    smooth.current.fov += (fovT - smooth.current.fov) * k;
    if (Math.abs(camera.fov - smooth.current.fov) > 0.01) {
      camera.fov = smooth.current.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
