// Bridge between the interactive Excalidraw whiteboard (2D overlay) and the
// 3D whiteboard plane in the classroom. The overlay exports its scene to a
// canvas; the 3D Whiteboard mirrors that canvas as its texture, so whatever
// the teacher/child draws appears on the classroom board too.
export const boardBridge = {
  canvas: null, // latest exported snapshot of the Excalidraw scene (or null)
  version: 0,
  events: new EventTarget(),
  publish(canvas) {
    this.canvas = canvas;
    this.version++;
    this.events.dispatchEvent(new Event("update"));
  },
  clear() {
    this.canvas = null;
    this.version++;
    this.events.dispatchEvent(new Event("update"));
  },
};
