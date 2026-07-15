import * as THREE from "three";

// Procedural canvas textures — zero downloads, stylized but detailed.
const cache = {};

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return `#${c.getHexString()}`;
}

export function planetTexture(body) {
  if (cache[body.id]) return cache[body.id];
  const [canvas, ctx] = makeCanvas(512, 256);
  const W = 512;
  const H = 256;

  if (body.kind === "gas") {
    // horizontal bands with wobble
    for (let y = 0; y < H; y++) {
      const band = Math.sin(y * 0.09 + Math.sin(y * 0.021) * 3);
      ctx.fillStyle = shade(body.color, band * 0.09 + (Math.random() - 0.5) * 0.02);
      ctx.fillRect(0, y, W, 1);
    }
    if (body.id === "jupiter") {
      // great red spot
      const g = ctx.createRadialGradient(340, 170, 4, 340, 170, 30);
      g.addColorStop(0, "#c14f2b");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(340, 170, 34, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (body.kind === "earth") {
    ctx.fillStyle = "#2b5cc4";
    ctx.fillRect(0, 0, W, H);
    // continents: blobby green patches
    ctx.fillStyle = "#3e8f4e";
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W;
      const y = H * 0.15 + Math.random() * H * 0.7;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.5) {
        const r = 12 + Math.random() * 26;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6);
      }
      ctx.fill();
    }
    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * W, Math.random() * H, 14 + Math.random() * 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // ice caps
    ctx.fillStyle = "#eef6ff";
    ctx.fillRect(0, 0, W, 16);
    ctx.fillRect(0, H - 16, W, 16);
  } else {
    // rocky: base + speckle noise + craters
    ctx.fillStyle = body.color;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = shade(body.color, (Math.random() - 0.5) * 0.18);
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    for (let i = 0; i < 30; i++) {
      const r = 3 + Math.random() * 9;
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.fillStyle = shade(body.color, -0.1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(body.color, 0.06);
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (body.id === "mars") {
      ctx.fillStyle = "#f3e9dd";
      ctx.fillRect(0, 0, W, 10);
      ctx.fillRect(0, H - 10, W, 10);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache[body.id] = tex;
  return tex;
}

export function ringTexture() {
  if (cache.__ring) return cache.__ring;
  const [canvas, ctx] = makeCanvas(256, 16);
  for (let x = 0; x < 256; x++) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(x * 0.22) * Math.sin(x * 0.045));
    ctx.fillStyle = `rgba(226, 205, 154, ${a})`;
    ctx.fillRect(x, 0, 1, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  cache.__ring = tex;
  return tex;
}

export function glowTexture(color = "#ffcf6f") {
  const key = `__glow${color}`;
  if (cache[key]) return cache[key];
  const [canvas, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.4, color + "88");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  cache[key] = tex;
  return tex;
}
