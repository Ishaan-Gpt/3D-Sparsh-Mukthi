import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLessonStore } from "../../store/useLessonStore";
import { boardBridge } from "../../lib/boardBridge";

const W = 1024;
const H = 512;

/**
 * A live whiteboard: a CanvasTexture plane. When the interactive Excalidraw
 * board has content, its exported canvas is mirrored here (everything the
 * teacher writes AND the child draws). Otherwise the classic text rendering
 * of the lesson board is drawn — the original architecture, unchanged.
 */
export function Whiteboard({ position = [0, 0.6, -16.6], rotation = [0, 0, 0], width = 13, height = 6.5 }) {
  const board = useLessonStore((s) => s.board);
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  const materialRef = useRef();

  useEffect(() => {
    const ctx = canvas.getContext("2d");

    const render = () => {
      // board surface
      ctx.fillStyle = "#f7f9f4";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#b8c4b0";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, W - 10, H - 10);

      // interactive board mirror wins whenever it exists
      if (boardBridge.canvas) {
        const src = boardBridge.canvas;
        const scale = Math.min((W - 30) / src.width, (H - 30) / src.height);
        const dw = src.width * scale;
        const dh = src.height * scale;
        ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
        texture.needsUpdate = true;
        return;
      }

      const b = useLessonStore.getState().board;
      // title
      ctx.fillStyle = "#20406b";
      ctx.font = "bold 52px 'Comic Sans MS', 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      wrapText(ctx, b.title || "", W / 2, 78, W - 120, 56);

      if (b.title) {
        ctx.strokeStyle = "#20406b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(120, 118);
        ctx.lineTo(W - 120, 118);
        ctx.stroke();
      }

      // lines
      ctx.textAlign = "left";
      ctx.fillStyle = "#2c3a2e";
      ctx.font = "42px 'Comic Sans MS', 'Segoe UI', sans-serif";
      let y = 190;
      for (const line of b.lines.slice(-5)) {
        y = wrapText(ctx, line, 90, y, W - 180, 52) + 64;
      }

      texture.needsUpdate = true;
    };

    render();
    boardBridge.events.addEventListener("update", render);
    return () => boardBridge.events.removeEventListener("update", render);
  }, [board, canvas, texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial ref={materialRef} map={texture} toneMapped={false} />
    </mesh>
  );
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}
