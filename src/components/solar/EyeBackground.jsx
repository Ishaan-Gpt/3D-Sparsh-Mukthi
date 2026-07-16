import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";

/**
 * 👁 Eye mode: a full-screen mirrored webcam feed BEHIND the (transparent)
 * solar-system canvas, so the planets float in the child's own room and can
 * be "touched" with the hand gestures (🖐 fly, 🤏 zoom, ✌️ tap a planet).
 * Its own low-impact stream; frames never leave the browser. If the camera
 * is unavailable, eye mode simply switches itself off — space returns.
 */
export function EyeBackground() {
  const solarEye = useLessonStore((s) => s.solarEye);
  const toggleSolarEye = useLessonStore((s) => s.toggleSolarEye);
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!solarEye) return;
    let cancelled = false;
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (err) {
        console.warn("Eye mode camera unavailable:", err);
        if (!cancelled) toggleSolarEye(); // graceful: fall back to space
      }
    })();
    return () => {
      cancelled = true;
      setReady(false);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [solarEye, toggleSolarEye]);

  if (!solarEye) return null;
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      className="solar-eye-video"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}
