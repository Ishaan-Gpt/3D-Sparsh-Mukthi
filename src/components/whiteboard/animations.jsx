/* eslint-disable react/prop-types */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

/**
 * The teacher's animated slide — one per teaching segment, generated from the
 * AI lesson plan the moment it arrives (the whole deck is data-driven, so
 * every slide of today's class is ready up front) and played live through
 * @remotion/player as the teacher reaches it.
 *
 * Each slide: animated sky-wash background with drifting sparkles → the
 * heading types itself out with a chalk cursor and a hand-drawn underline →
 * board points spring in one by one → a concept animation plays center-stage:
 *   count     → tokens bounce in with a live counter + confetti finish
 *   cycle     → a ring draws itself, items orbit, an arrow sweeps the loop
 *   compare   → bars race up with counting labels, the winner gets a crown
 *   spotlight → the key idea bursts through rotating rays with floating chips
 */

export const ANIM_FPS = 30;
export const animDuration = (visual) =>
  ANIM_FPS * (6 + Math.max(2, visual?.items?.length ?? 2) * 1.2);

const PALETTE = ["#ff6b00", "#2f9e63", "#3b6fd4", "#c94f9a", "#b8860b", "#9061d4"];
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const bounce = Easing.bezier(0.34, 1.56, 0.64, 1);
const FONT = "'Comic Sans MS', 'Segoe UI', sans-serif";

// deterministic pseudo-random (stable across renders)
const rnd = (i, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------------
// backdrop: soft wash + slow rays + drifting sparkles
// ---------------------------------------------------------------------------
function Backdrop() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 140% at 20% 0%, #fff8e8 0%, #fdf3ff 55%, #eaf4ff 100%)" }}>
      <div
        style={{
          position: "absolute",
          left: "78%",
          top: "-30%",
          width: 700,
          height: 700,
          rotate: `${frame * 0.25}deg`,
          background:
            "conic-gradient(from 0deg, rgba(255,209,102,0.22) 0deg 14deg, transparent 14deg 40deg, rgba(255,209,102,0.22) 40deg 54deg, transparent 54deg 90deg, rgba(255,209,102,0.22) 90deg 104deg, transparent 104deg 360deg)",
          borderRadius: "50%",
        }}
      />
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 6 + rnd(i) * 10;
        const drift = Math.sin((frame / 60 + rnd(i, 2) * 6) * Math.PI) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${4 + rnd(i, 1) * 92}%`,
              top: `${6 + rnd(i, 3) * 80}%`,
              translate: `0px ${drift}px`,
              width: size,
              height: size,
              rotate: `${frame * (0.5 + rnd(i, 4))}deg`,
              opacity: 0.35 + rnd(i, 5) * 0.3,
              background: PALETTE[i % PALETTE.length],
              borderRadius: rnd(i, 6) > 0.5 ? "50%" : 3,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// confetti burst (used when a count completes)
function Confetti({ from }) {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0 || t > 55) return null;
  return (
    <>
      {Array.from({ length: 26 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${10 + rnd(i, 7) * 80}%`,
            top: "30%",
            translate: `${(rnd(i, 8) - 0.5) * 260}px ${t * (3 + rnd(i, 9) * 5) - 40}px`,
            rotate: `${t * (8 + rnd(i, 10) * 14)}deg`,
            width: 10,
            height: 14,
            opacity: interpolate(t, [0, 40, 55], [1, 1, 0]),
            background: PALETTE[i % PALETTE.length],
            borderRadius: 2,
          }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// heading: typewriter + chalk cursor + hand-drawn underline that draws itself
// ---------------------------------------------------------------------------
function Heading({ text }) {
  const frame = useCurrentFrame();
  const chars = Math.min(text.length, Math.floor(frame / 2)); // typewriter
  const typed = text.slice(0, chars);
  const done = chars >= text.length;
  const underline = interpolate(frame, [text.length * 2, text.length * 2 + 18], [520, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <div style={{ position: "absolute", top: 26, left: 48, right: 48 }}>
      <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 900, color: "#20406b", letterSpacing: -0.5 }}>
        {typed}
        <span style={{ opacity: done ? 0 : Math.round(frame / 8) % 2 }}>▌</span>
      </div>
      <svg width="520" height="14" style={{ marginTop: 2 }}>
        <path
          d="M4 8 C 120 2, 240 14, 360 7 S 480 4, 516 9"
          stroke="#ff6b00"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="520"
          strokeDashoffset={underline}
        />
      </svg>
    </div>
  );
}

// board points spring in one by one under the heading
function Points({ points, from }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 108, left: 52, display: "flex", flexDirection: "column", gap: 10 }}>
      {points.slice(0, 4).map((p, i) => {
        const t = frame - (from + i * 16);
        const s = interpolate(t, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: bounce });
        return (
          <div
            key={i}
            style={{
              scale: String(s),
              translate: `${interpolate(t, [0, 14], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut })}px 0px`,
              transformOrigin: "left center",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.85)",
              border: `2.5px solid ${PALETTE[i % PALETTE.length]}`,
              borderRadius: 999,
              padding: "7px 16px",
              fontFamily: FONT,
              fontSize: 21,
              fontWeight: 800,
              color: "#243329",
              width: "fit-content",
              boxShadow: "0 4px 12px rgba(32,64,107,0.12)",
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: PALETTE[i % PALETTE.length] }} />
            {String(p).replace(/^•\s*/, "")}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// concept scenes (center-right stage)
// ---------------------------------------------------------------------------
const STAGE = { position: "absolute", right: 30, top: 90, width: 460, height: 250 };

function CountScene({ items, from }) {
  const frame = useCurrentFrame();
  const per = 22;
  const shown = Math.max(0, Math.min(items.length, Math.floor((frame - from) / per) + 1));
  const allIn = frame - from > items.length * per;
  return (
    <div style={STAGE}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "center", height: 170 }}>
        {items.map((item, i) => {
          const t = frame - (from + i * per);
          const s = interpolate(t, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: bounce });
          const wobble = allIn ? Math.sin((frame / 14 + i) * Math.PI) * 3 : 0;
          return (
            <div
              key={i}
              style={{
                scale: String(s),
                rotate: `${wobble}deg`,
                background: PALETTE[i % PALETTE.length],
                color: "#fff",
                borderRadius: 18,
                padding: "16px 20px",
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 900,
                boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 74,
          fontWeight: 900,
          color: "#ff6b00",
          scale: String(1 + (((frame - from) % per) < 5 && !allIn ? 0.18 : 0)),
        }}
      >
        {shown}
      </div>
      <Confetti from={from + items.length * per + 6} />
    </div>
  );
}

function CycleScene({ items, from }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const n = Math.max(items.length, 2);
  const turn = ((frame - from) / (durationInFrames - from)) * Math.PI * 2 * 1.5;
  const active = Math.floor(((turn / (Math.PI * 2)) * n) % n);
  const ringDraw = interpolate(frame - from, [0, 30], [640, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  return (
    <div style={STAGE}>
      <svg width="460" height="250" style={{ position: "absolute" }}>
        <ellipse
          cx="230" cy="125" rx="150" ry="88"
          fill="none" stroke="#3b6fd4" strokeWidth="4" strokeLinecap="round"
          strokeDasharray="640" strokeDashoffset={ringDraw} opacity="0.55"
        />
      </svg>
      {items.map((item, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const isActive = i === active;
        const t = frame - (from + i * 10);
        const pop = interpolate(t, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: bounce });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 230 + Math.cos(a) * 150,
              top: 125 + Math.sin(a) * 88,
              translate: "-50% -50%",
              scale: String(pop * (isActive ? 1.25 : 1)),
              background: isActive ? PALETTE[i % PALETTE.length] : "rgba(255,255,255,0.92)",
              color: isActive ? "#fff" : "#20406b",
              border: `3px solid ${PALETTE[i % PALETTE.length]}`,
              borderRadius: 14,
              padding: "9px 14px",
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 900,
              whiteSpace: "nowrap",
              boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.22)" : "none",
            }}
          >
            {item}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 230 + Math.cos(turn - Math.PI / 2) * 150,
          top: 125 + Math.sin(turn - Math.PI / 2) * 88,
          translate: "-50% -50%",
          rotate: `${(turn * 180) / Math.PI}deg`,
          fontSize: 30,
        }}
      >
        🚀
      </div>
    </div>
  );
}

function CompareScene({ items, from }) {
  const frame = useCurrentFrame();
  const maxH = 150;
  const heights = items.map((_, i) => maxH * ((i + 1.6) / (items.length + 0.6)));
  const winner = heights.indexOf(Math.max(...heights));
  return (
    <div style={{ ...STAGE, display: "flex", gap: 30, alignItems: "flex-end", justifyContent: "center", paddingBottom: 34 }}>
      {items.map((item, i) => {
        const t = frame - (from + i * 12);
        const h = interpolate(t, [0, 26], [10, heights[i]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
        const grown = t > 26;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {i === winner && grown && (
              <div style={{ fontSize: 26, rotate: `${Math.sin(frame / 10) * 10}deg` }}>👑</div>
            )}
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: PALETTE[i % PALETTE.length] }}>
              {Math.round((h / maxH) * 10)}
            </div>
            <div
              style={{
                width: 74,
                height: h,
                background: `linear-gradient(180deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[i % PALETTE.length]}cc)`,
                borderRadius: "12px 12px 4px 4px",
                boxShadow: "0 6px 14px rgba(0,0,0,0.16)",
              }}
            />
            <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: "#20406b", maxWidth: 92, textAlign: "center" }}>
              {item}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpotlightScene({ items, caption, from }) {
  const frame = useCurrentFrame();
  const word = items[0] ?? caption;
  const t = frame - from;
  return (
    <div style={STAGE}>
      {[0.14, 0.1].map((op, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            translate: "-50% -50%",
            rotate: `${t * (k ? -0.8 : 0.6)}deg`,
            fontSize: 210,
            opacity: op,
            color: k ? "#ff8a3d" : "#ffd166",
          }}
        >
          ✳
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          translate: "-50% -50%",
          scale: String(
            interpolate(t, [0, 20], [0.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: bounce }) *
              (1 + Math.sin(frame / 16) * 0.035)
          ),
          fontFamily: FONT,
          fontSize: 54,
          fontWeight: 900,
          color: "#ff6b00",
          textAlign: "center",
          maxWidth: 400,
          textShadow: "0 4px 0 rgba(32,64,107,0.14)",
        }}
      >
        {word}
      </div>
      {items.slice(1, 4).map((it, i) => {
        const tt = t - 24 - i * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${8 + i * 32}%`,
              bottom: 6,
              opacity: interpolate(tt, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              translate: `0px ${interpolate(tt, [0, 12], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut })}px`,
              background: "rgba(255,255,255,0.9)",
              border: `3px solid ${PALETTE[i % PALETTE.length]}`,
              color: "#20406b",
              borderRadius: 12,
              padding: "6px 12px",
              fontFamily: FONT,
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {it}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// the slide
// ---------------------------------------------------------------------------
export function ConceptAnim({ kind = "spotlight", items = [], caption = "", heading = "", points = [] }) {
  const { fps } = useVideoConfig();
  const safeItems = (items ?? []).map((s) => String(s)).filter(Boolean).slice(0, 6);
  const stageItems = safeItems.length ? safeItems : [caption || heading || "Let's learn!"];
  const sceneFrom = Math.min(String(heading).length * 2 + 10, fps * 2);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, overflow: "hidden" }}>
      <Backdrop />
      {heading ? <Heading text={heading} /> : null}
      {points?.length ? <Points points={points} from={sceneFrom} /> : null}
      <Sequence from={sceneFrom} layout="none">
        {kind === "count" && <CountScene items={stageItems} from={0} />}
        {kind === "cycle" && <CycleScene items={stageItems} from={0} />}
        {kind === "compare" && <CompareScene items={stageItems} from={0} />}
        {(kind === "spotlight" || !["count", "cycle", "compare"].includes(kind)) && (
          <SpotlightScene items={stageItems} caption={caption} from={0} />
        )}
      </Sequence>
      {caption ? (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            width: "100%",
            textAlign: "center",
            fontSize: 24,
            fontWeight: 800,
            color: "#20406b",
            opacity: 0.9,
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
