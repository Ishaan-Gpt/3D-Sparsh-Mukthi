import { useEffect, useRef } from "react";
import { gestureState } from "../../lib/gestureState";

// Global on-screen cursor mirroring your hand. Cyan ring in ☝️ pointing
// (cursor) mode, green in palm mode, shrinks red while pinching.
export function GestureCursor() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el) return;
      if (gestureState.enabled && gestureState.present) {
        el.style.opacity = "1";
        el.style.left = `${gestureState.x * 100}%`;
        el.style.top = `${gestureState.y * 100}%`;
        el.classList.toggle("pinching", gestureState.pinching);
        el.classList.toggle("pointing", gestureState.pointing);
      } else {
        el.style.opacity = "0";
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={ref} className="palm-cursor" />;
}
