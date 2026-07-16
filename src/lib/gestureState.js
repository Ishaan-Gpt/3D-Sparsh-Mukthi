// Shared, frame-rate mutable gesture state. Written by GesturePanel every
// video frame; read inside useFrame loops (no React re-renders per frame).
export const gestureState = {
  enabled: false,
  present: false, // a hand is visible
  palmOpen: false, // >= 4 fingers extended → look-around mode
  pointing: false, // index only → cursor mode
  clickPose: false, // index + middle up → click pose
  x: 0.5, // smoothed CURSOR position (index fingertip), mirrored
  y: 0.5,
  lookX: 0.5, // palm centre — steering channel for look-around (separate from cursor)
  lookY: 0.5,
  pinch: 1, // thumb-index distance / hand size (small = pinched)
  pinching: false, // hold-to-zoom
  raiseProgress: 0, // 0..1 toward the 3s hand-raise trigger
  facePresent: false, // attention-aware teaching signal
  lastFaceAt: 0, // timestamp of last face detection (0 = face tracking off)
};

// Discrete gesture events: "pinch-select" ({detail:{x,y}}), "hand-raised"
export const gestureEvents = new EventTarget();
