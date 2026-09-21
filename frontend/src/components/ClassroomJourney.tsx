import { useEffect, useRef, useState } from "react";
import { CLASSROOM_URL } from "../lib/config";
import { ArrowUpRight } from "lucide-react";

// Local bundled background images
const HERO_IMAGE = "/hero_base.png";
const SECTION2_IMAGE = "/theme_space.png";
const SECTION3_BG = "/story_classmates.png";
const SECTION3_IMG1 = "/theme_ocean.png";
const SECTION3_IMG2 = "/theme_dinosaur.png";

const featureBars = ["Live AI Teacher", "Gesture Controls", "Guided Study Breaks"];

const lessonFlow = [
  { name: "Warm\nIntro", num: "01", active: true },
  { name: "Teaching\nSegments", num: "02", active: false },
  { name: "Peer\nQuestions", num: "03", active: false },
  { name: "Whiteboard\nSolving", num: "04", active: false },
];

/**
 * Custom hook for 100% seamless background window-masking.
 * Uses exact CSS 'cover' aspect-ratio math so the background image
 * covers 100% of the container with ZERO blank white voids on any screen resolution.
 */
function useCoverMask(
  containerRef: React.RefObject<HTMLElement | null>,
  cardRefs: React.RefObject<(HTMLElement | null)[]>,
  bgImageSrc: string
) {
  const [cardStyles, setCardStyles] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let imgAR = 16 / 9; // Fallback aspect ratio
    const img = new Image();
    img.src = bgImageSrc;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        imgAR = img.naturalWidth / img.naturalHeight;
      }
      calculate();
    };

    const calculate = () => {
      const c = containerRef.current;
      const cards = cardRefs.current;
      if (!c || !cards) return;

      const cRect = c.getBoundingClientRect();
      const W = cRect.width;
      const H = cRect.height;
      if (W === 0 || H === 0) return;

      // Exact background-size: cover scale math
      let bgW: number;
      let bgH: number;
      let offX = 0;
      let offY = 0;

      if (W / H > imgAR) {
        bgW = W;
        bgH = W / imgAR;
        offY = (bgH - H) / 2;
      } else {
        bgH = H;
        bgW = H * imgAR;
        offX = (bgW - W) / 2;
      }

      const newStyles = cards.map((card) => {
        if (!card) return {};
        const kRect = card.getBoundingClientRect();
        const cardX = kRect.left - cRect.left;
        const cardY = kRect.top - cRect.top;

        const posX = -(cardX + offX);
        const posY = -(cardY + offY);

        return {
          backgroundImage: `url(${bgImageSrc})`,
          backgroundSize: `${Math.round(bgW)}px ${Math.round(bgH)}px`,
          backgroundPosition: `${Math.round(posX)}px ${Math.round(posY)}px`,
          backgroundRepeat: "no-repeat",
        };
      });

      setCardStyles(newStyles);
    };

    calculate();

    const ro = new ResizeObserver(() => calculate());
    ro.observe(container);

    window.addEventListener("resize", calculate);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calculate);
    };
  }, [containerRef, cardRefs, bgImageSrc]);

  return cardStyles;
}

export default function ClassroomJourney() {
  // --- SECTION 1 REFS & MASK ---
  const s1ContainerRef = useRef<HTMLElement>(null);
  const s1CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s1Styles = useCoverMask(s1ContainerRef, s1CardRefs, HERO_IMAGE);

  // --- SECTION 2 REFS & MASK ---
  const s2ContainerRef = useRef<HTMLElement>(null);
  const s2CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s2Styles = useCoverMask(s2ContainerRef, s2CardRefs, SECTION2_IMAGE);

  // --- SECTION 3 REFS & MASK ---
  const s3ContainerRef = useRef<HTMLElement>(null);
  const s3CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s3Styles = useCoverMask(s3ContainerRef, s3CardRefs, SECTION3_BG);

  return (
    <div className="bg-white text-charcoalText font-heading select-none w-full">
      
      {/* ================= SECTION 1: VIRTUAL CLASSROOM HERO ================= */}
      <section
        ref={s1ContainerRef}
        className="min-h-screen w-full flex flex-col pt-20 sm:pt-24 px-3 sm:px-6 pb-4 gap-2 sm:gap-3 relative bg-white overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Top 3 Feature Mask Bars */}
        {featureBars.map((bar, i) => (
          <div
            key={i}
            ref={(el) => {
              s1CardRefs.current[i] = el;
            }}
            style={s1Styles[i]}
            className="w-full h-14 sm:h-20 shrink-0 rounded-2xl overflow-hidden relative group border border-black/10 shadow-sm"
          >
            {/* Frosted glass overlay that lifts on hover */}
            <div className="absolute inset-0 bg-white/45 backdrop-blur-md z-0 transition-opacity duration-500 group-hover:opacity-0" />
            <span className="flex items-center justify-center h-full text-charcoalText text-base sm:text-2xl font-extrabold text-center relative z-10 tracking-tight drop-shadow-sm">
              {bar}
            </span>
          </div>
        ))}

        {/* Main Hero Masked Card */}
        <div
          ref={(el) => {
            s1CardRefs.current[3] = el;
          }}
          style={s1Styles[3]}
          className="w-full flex-1 min-h-[420px] sm:min-h-[520px] rounded-3xl overflow-hidden relative border border-black/10 shadow-xl flex flex-col justify-between p-5 sm:p-8 group"
        >
          {/* Subtle Scrim for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20 z-0 pointer-events-none" />

          {/* Top Left Description Pill */}
          <div className="relative z-10 flex items-start justify-between">
            <p className="bg-white/85 backdrop-blur-md rounded-2xl px-4 py-3 text-charcoalText text-xs sm:text-sm font-semibold leading-relaxed max-w-[280px] sm:max-w-[380px] text-left shadow-lg border border-white/50">
              ✨ A real 3D classroom rendered in your browser — the AI teacher plans, speaks, and paces every lesson live.
            </p>
            
            <span className="bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full hidden sm:inline-block">
              No Headset Needed
            </span>
          </div>

          {/* Bottom Row: Branding & Title */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-8 text-left">
            <div>
              <span className="block text-white text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 drop-shadow-md">
                Desktop VR for Classes 1–4
              </span>
              <h1 className="text-white text-4xl sm:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tight drop-shadow-lg">
                Virtual<br />Classroom
              </h1>
            </div>

            <a
              href={CLASSROOM_URL}
              className="inline-flex items-center gap-2 bg-vermillion text-white hover:bg-white hover:text-charcoalText font-bold text-sm sm:text-base px-7 py-3.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Enter Classroom</span>
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: LESSON GALLERY ================= */}
      <section
        ref={s2ContainerRef}
        className="min-h-screen w-full flex flex-col pt-4 px-3 sm:px-6 pb-4 gap-2 sm:gap-3 relative bg-white overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-2 sm:gap-3">
          
          {/* Card 0: Top Left Gallery */}
          <div
            ref={(el) => {
              s2CardRefs.current[0] = el;
            }}
            style={s2Styles[0]}
            className="rounded-2xl overflow-hidden relative min-h-[160px] border border-black/10 shadow-md p-6 flex flex-col justify-between"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-0" />
            <h3 className="relative z-10 text-white text-2xl sm:text-4xl font-extrabold text-left tracking-tight">
              Lesson Gallery
            </h3>
            <span className="relative z-10 text-white/90 text-xs sm:text-sm font-semibold text-left">
              Every topic becomes a living world
            </span>
          </div>

          {/* Card 1: Top Right Doubts Detail */}
          <div
            ref={(el) => {
              s2CardRefs.current[1] = el;
            }}
            style={s2Styles[1]}
            className="md:row-span-2 rounded-2xl overflow-hidden relative min-h-[220px] border border-black/10 shadow-md p-6 sm:p-8 flex flex-col justify-between"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-0" />
            <p className="relative z-10 text-white text-base sm:text-lg font-semibold leading-relaxed text-left max-w-md">
              Raise your hand and the whole class waits — your doubt is answered live on the whiteboard.
            </p>
            <div className="relative z-10 flex justify-end">
              <a
                href={CLASSROOM_URL}
                className="inline-flex items-center gap-2 bg-white text-charcoalText hover:bg-vermillion hover:text-white font-bold text-sm px-6 py-3 rounded-full shadow-md transition-all duration-300"
              >
                <span>Enter Class</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          {/* Card 2: Bottom Left Title */}
          <div
            ref={(el) => {
              s2CardRefs.current[2] = el;
            }}
            style={s2Styles[2]}
            className="rounded-2xl overflow-hidden relative min-h-[160px] border border-black/10 shadow-md p-6 flex items-center"
          >
            <div className="absolute inset-0 bg-black/35 z-0" />
            <h2 className="relative z-10 text-white text-3xl sm:text-5xl font-black leading-none text-left tracking-tight">
              Doubts<br />solved live
            </h2>
          </div>

          {/* Card 3: Bottom Full Width Lesson Flow */}
          <div
            ref={(el) => {
              s2CardRefs.current[3] = el;
            }}
            style={s2Styles[3]}
            className="col-span-1 md:col-span-2 rounded-2xl overflow-hidden relative min-h-[180px] border border-black/10 shadow-md p-3 sm:p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 h-full">
              {lessonFlow.map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-300 ${
                    step.active
                      ? "bg-white text-charcoalText shadow-lg"
                      : "bg-black/30 border border-white/20 text-white hover:bg-black/50"
                  }`}
                >
                  <h4 className="text-sm sm:text-lg font-bold leading-tight whitespace-pre-line">
                    {step.name}
                  </h4>
                  <span
                    className={`self-end text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                      step.active
                        ? "border-charcoalText text-charcoalText"
                        : "border-white text-white"
                    }`}
                  >
                    {step.num}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ================= SECTION 3: IMMERSIVE STUDY ================= */}
      <section
        ref={s3ContainerRef}
        className="min-h-screen w-full flex flex-col pt-4 px-3 sm:px-6 pb-6 gap-2 sm:gap-3 relative bg-white overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          
          {/* Left Column Blocks */}
          <div className="flex flex-col gap-2 sm:gap-3">
            
            {/* Heading Card */}
            <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between min-h-[160px] text-left border border-black/10 shadow-md">
              <span className="text-xs font-bold text-vermillion uppercase tracking-widest block">
                Step Inside Your Lesson
              </span>
              <h2 className="text-3xl sm:text-6xl font-black tracking-tight leading-none">
                Immersive<br />Study
              </h2>
            </div>

            {/* Twin Images Card */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 h-40 sm:h-48">
              <div className="rounded-2xl overflow-hidden relative border border-black/10 shadow-sm group">
                <img
                  src={SECTION3_IMG1}
                  alt="Ocean World"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2 left-2 text-white text-xs font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md">
                  🌊 Ocean World
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden relative border border-black/10 shadow-sm group">
                <img
                  src={SECTION3_IMG2}
                  alt="Prehistoric World"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2 left-2 text-white text-xs font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md">
                  🦖 Prehistoric Earth
                </span>
              </div>
            </div>

            {/* Solar System Tour Card */}
            <div className="rounded-2xl bg-vermillion/10 border border-vermillion/20 p-6 flex items-center justify-between text-left">
              <div>
                <span className="text-xs font-bold text-vermillion uppercase tracking-widest block mb-1">
                  Guided Tour
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-charcoalText">
                  Fly Through the Solar System
                </h3>
              </div>
              <a
                href={CLASSROOM_URL}
                className="px-5 py-2.5 bg-charcoalText text-white hover:bg-vermillion font-bold text-xs sm:text-sm rounded-full shadow-md transition-all duration-300"
              >
                Try Demo
              </a>
            </div>

          </div>

          {/* Right Column: Tall Masked Classmates Card */}
          <div
            ref={(el) => {
              s3CardRefs.current[0] = el;
            }}
            style={s3Styles[0]}
            className="rounded-2xl overflow-hidden relative min-h-[380px] border border-black/10 shadow-lg p-6 flex flex-col justify-between group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-0" />

            <div className="relative z-10 text-left">
              <span className="bg-white/90 backdrop-blur-md text-charcoalText text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                Social Learning Engine
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 text-charcoalText shadow-md border border-white/40">
                <h4 className="text-xs font-extrabold mb-1">How AI Plans Lessons</h4>
                <p className="text-[11px] text-charcoalText/70">Pacing adapts live to student responses.</p>
              </div>
              <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-white shadow-md border border-white/20">
                <h4 className="text-xs font-extrabold mb-1">Eye Rest Breaks</h4>
                <p className="text-[11px] text-slate-300">Enforces pauses during long study sessions.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
