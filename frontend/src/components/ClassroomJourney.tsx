import { useEffect, useRef, useState } from "react";

// --- IMAGE URLS (all local, bundled with the site) ---
const HERO_IMAGE = "/hero_base.png";
const SECTION2_IMAGE = "/theme_space.png";
const SECTION3_IMG1 = "/theme_ocean.png";
const SECTION3_IMG2 = "/theme_dinosaur.png";
const SECTION3_BG = "/story_classmates.png";

// --- DATA CONSTANTS ---
const featureBars = ["Live AI Teacher", "Gesture Controls", "Guided Study Breaks"];
const lessonFlow = [
  { name: "Warm\nIntro", num: "01", active: true },
  { name: "Teaching\nSegments", num: "02", active: false },
  { name: "Peer\nQuestions", num: "03", active: false },
  { name: "Whiteboard\nSolving", num: null, active: false },
];

// --- CUSTOM HOOKS ---
function useMaskPositions(
  containerRef: React.RefObject<HTMLElement | null>,
  cardRefs: React.RefObject<(HTMLElement | null)[]>
) {
  const [positions, setPositions] = useState<{ x: number; y: number; sw: number; sh: number }[]>([]);

  const calculate = () => {
    const container = containerRef.current;
    const cards = cardRefs.current;
    if (!container || !cards) return;

    const containerRect = container.getBoundingClientRect();
    const newPos = cards.map((card) => {
      if (!card) return { x: 0, y: 0, sw: 0, sh: 0 };
      const cardRect = card.getBoundingClientRect();
      return {
        x: cardRect.left - containerRect.left,
        y: cardRect.top - containerRect.top,
        sw: containerRect.width,
        sh: containerRect.height,
      };
    });
    setPositions(newPos);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    calculate();
    const observer = new ResizeObserver(() => {
      calculate();
    });
    observer.observe(container);

    window.addEventListener("resize", calculate);
    window.addEventListener("scroll", calculate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", calculate);
      window.removeEventListener("scroll", calculate);
    };
  }, [containerRef, cardRefs]);

  return positions;
}

function useImageWidth(bgImage: string, sectionHeight: number) {
  const [renderWidth, setRenderWidth] = useState(0);

  useEffect(() => {
    if (!bgImage || !sectionHeight) return;
    const img = new Image();
    img.src = bgImage;
    img.onload = () => {
      const width = img.naturalWidth * (sectionHeight / img.naturalHeight);
      setRenderWidth(width);
    };
  }, [bgImage, sectionHeight]);

  return renderWidth;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function useStaggeredReveal(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(container);
        }
      },
      { threshold }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [threshold]);

  const getAnimStyle = (index: number): React.CSSProperties => {
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 120}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 120}ms`,
    };
  };

  return { containerRef, getAnimStyle };
}

// --- MASKED CARD COMPONENT ---
interface MaskedCardProps {
  bgImage: string;
  position?: { x: number; y: number; sw: number; sh: number };
  imageWidth: number;
  focalX: number;
  className?: string;
  children?: React.ReactNode;
  cardRef?: (el: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
}

function MaskedCard({
  bgImage,
  position,
  imageWidth,
  focalX,
  className = "",
  children,
  cardRef,
  style = {},
}: MaskedCardProps) {
  const computedStyle: React.CSSProperties = { ...style };

  if (position && position.sh > 0) {
    const overflow = imageWidth > position.sw ? imageWidth - position.sw : 0;
    const focalOffset = overflow * focalX;
    computedStyle.backgroundImage = `url(${bgImage})`;
    computedStyle.backgroundSize = `auto ${position.sh}px`;
    computedStyle.backgroundPosition = `-${position.x + focalOffset}px -${position.y}px`;
    computedStyle.backgroundRepeat = "no-repeat";
  }

  return (
    <div ref={cardRef} className={className} style={computedStyle}>
      {children}
    </div>
  );
}

// --- MAIN CLASSROOM JOURNEY COMPONENT ---
export default function ClassroomJourney() {
  const isMobile = useIsMobile();

  // --- SECTION 1 HOOKS ---
  const s1ContainerRef = useRef<HTMLElement>(null);
  const s1CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s1Positions = useMaskPositions(s1ContainerRef, s1CardRefs);
  const [s1Height, setS1Height] = useState(0);
  const s1ImageWidth = useImageWidth(HERO_IMAGE, s1Height);
  const s1Reveal = useStaggeredReveal();

  // --- SECTION 2 HOOKS ---
  const s2ContainerRef = useRef<HTMLElement>(null);
  const s2CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s2Positions = useMaskPositions(s2ContainerRef, s2CardRefs);
  const [s2Height, setS2Height] = useState(0);
  const s2ImageWidth = useImageWidth(SECTION2_IMAGE, s2Height);
  const s2Reveal = useStaggeredReveal();

  // --- SECTION 3 HOOKS ---
  const s3Reveal = useStaggeredReveal();

  // Measure heights on layout / resize
  useEffect(() => {
    const updateHeights = () => {
      if (s1ContainerRef.current) {
        setS1Height(s1ContainerRef.current.clientHeight);
      }
      if (s2ContainerRef.current) {
        setS2Height(s2ContainerRef.current.clientHeight);
      }
    };
    updateHeights();
    window.addEventListener("resize", updateHeights);
    return () => window.removeEventListener("resize", updateHeights);
  }, []);

  const s1FocalX = isMobile ? 0.7 : 0.8;
  const s2FocalX = isMobile ? 0.65 : 0.8;

  return (
    <div className="bg-white text-charcoalText font-heading select-none">

      {/* ================= SECTION 1: CLASSROOM HERO ================= */}
      <section
        ref={(el) => {
          s1ContainerRef.current = el;
          s1Reveal.containerRef.current = el;
        }}
        className="h-screen w-full overflow-hidden flex flex-col pt-24 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 relative bg-white"
        style={{ height: "100dvh" }}
      >
        {/* Feature Bars */}
        {featureBars.map((bar, i) => (
          <MaskedCard
            key={i}
            cardRef={(el) => {
              s1CardRefs.current[i] = el;
            }}
            bgImage={HERO_IMAGE}
            position={s1Positions[i]}
            imageWidth={s1ImageWidth}
            focalX={s1FocalX}
            className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative group"
            style={s1Reveal.getAnimStyle(i)}
          >
            {/* Frosted strip lifts on hover to reveal the full-colour image */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0 transition-opacity duration-500 group-hover:opacity-0" />
            <span className="flex items-center justify-center h-full text-charcoalText text-lg md:text-3xl font-bold text-center relative z-10 tracking-tight [text-shadow:0_1px_12px_rgba(255,255,255,0.85)]">
              {bar}
            </span>
          </MaskedCard>
        ))}

        {/* Main Hero Card (4th card index 3) */}
        <MaskedCard
          cardRef={(el) => {
            s1CardRefs.current[3] = el;
          }}
          bgImage={HERO_IMAGE}
          position={s1Positions[3]}
          imageWidth={s1ImageWidth}
          focalX={s1FocalX}
          className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
          style={s1Reveal.getAnimStyle(3)}
        >
          {/* Soft bottom scrim for headline legibility only */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/45 to-transparent z-0" />

          {/* Top Left Description */}
          <p className="absolute top-4 left-4 md:top-7 md:left-7 bg-white/70 backdrop-blur-md rounded-xl px-4 py-3 text-charcoalText text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[220px] md:max-w-[320px] z-10 text-left shadow-md">
            A real 3D classroom rendered in your browser — the AI teacher plans, speaks, and paces every lesson live.
          </p>

          {/* Bottom Left Branding */}
          <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10 text-left">
            <span className="block text-white text-xs md:text-sm font-semibold mb-1 md:mb-2 tracking-wide">
              Desktop VR for Classes 1–4
            </span>
            <h1 className="text-white text-[clamp(2.5rem,10vw,10rem)] font-bold leading-[0.79] tracking-tight">
              Virtual<br />Classroom
            </h1>
          </div>

          {/* Bottom Right Label */}
          <span className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-white text-xs md:text-sm font-semibold z-10 tracking-wide">
            No Headset Needed
          </span>
        </MaskedCard>
      </section>

      {/* ================= SECTION 2: LESSON GALLERY ================= */}
      <section
        ref={(el) => {
          s2ContainerRef.current = el;
          s2Reveal.containerRef.current = el;
        }}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 relative bg-white"
        style={{ minHeight: isMobile ? "auto" : "100dvh" }}
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">

          {/* Card 0: Top Left Lesson Gallery */}
          <MaskedCard
            cardRef={(el) => {
              s2CardRefs.current[0] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[0]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
            style={s2Reveal.getAnimStyle(0)}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35 z-0" />
            <h3 className="absolute top-4 left-5 md:top-6 md:left-7 text-white text-2xl md:text-3xl font-bold z-10 text-left tracking-tight">
              Lesson Gallery
            </h3>
            <span className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white text-xs md:text-sm font-semibold z-10 text-left">
              Every topic becomes a world
            </span>
          </MaskedCard>

          {/* Card 1: Top Right Card (spans 2 rows on desktop) */}
          <MaskedCard
            cardRef={(el) => {
              s2CardRefs.current[1] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[1]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[220px] md:min-h-0"
            style={s2Reveal.getAnimStyle(1)}
          >
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent z-0" />
            <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10 text-left">
              Raise your hand and the whole class waits —<br />your doubt is answered on the whiteboard.
            </p>
            <a
              href="http://localhost:5174/"
              className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-6 py-2.5 md:px-8 md:py-4 bg-white rounded-full text-charcoalText text-sm md:text-base font-bold z-10 hover:bg-vermillion hover:text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-md"
            >
              Enter Class
            </a>
          </MaskedCard>

          {/* Card 2: Bottom Left Doubt Solving */}
          <MaskedCard
            cardRef={(el) => {
              s2CardRefs.current[2] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[2]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
            style={s2Reveal.getAnimStyle(2)}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-0" />
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.9] z-10 text-left tracking-tight">
              Doubts<br />solved live
            </h2>
          </MaskedCard>

          {/* Card 3: Bottom Full Width Lesson Flow Row */}
          <MaskedCard
            cardRef={(el) => {
              s2CardRefs.current[3] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[3]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0 p-3"
            style={s2Reveal.getAnimStyle(3)}
          >
            <div className="absolute inset-0 z-10 flex flex-col md:flex-row gap-1.5 md:gap-2 p-2 md:p-3">
              {lessonFlow.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between text-left transition-all duration-300 hover:-translate-y-0.5 ${
                    step.active
                      ? "bg-white/90 backdrop-blur-md shadow-lg"
                      : "bg-black/25 backdrop-blur-xl border border-white/15 hover:bg-black/35"
                  }`}
                >
                  <h4
                    className={`text-lg md:text-2xl font-bold leading-[1.05] whitespace-pre-line tracking-tight ${
                      step.active ? "text-charcoalText" : "text-white"
                    }`}
                  >
                    {step.name}
                  </h4>
                  {step.num && (
                    <span
                      className={`self-end w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        step.active ? "border-charcoalText text-charcoalText" : "border-white text-white"
                      }`}
                    >
                      {step.num}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </MaskedCard>

        </div>
      </section>

      {/* ================= SECTION 3: IMMERSIVE STUDY ================= */}
      <section
        ref={s3Reveal.containerRef}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 bg-white"
        style={{ minHeight: isMobile ? "auto" : "100dvh" }}
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">

          {/* Left Column blocks */}
          <div className="flex flex-col gap-1.5 md:gap-2">

            {/* Heading Card */}
            <div
              style={s3Reveal.getAnimStyle(0)}
              className="rounded-xl md:rounded-2xl bg-white p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0 text-left border border-black/10"
            >
              <h2 className="text-[clamp(2.5rem,6.5vw,6rem)] font-bold leading-[0.95] text-charcoalText tracking-tight">
                Immersive<br />Study
              </h2>
              <p className="text-xs md:text-sm font-semibold text-vermillion uppercase tracking-wider">
                Step Inside Your Lesson
              </p>
            </div>

            {/* Side-by-Side Images Card */}
            <div
              style={s3Reveal.getAnimStyle(1)}
              className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
            >
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden border border-black/5 group">
                <img
                  src={SECTION3_IMG1}
                  alt="Ocean world lesson environment"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden border border-black/5 group">
                <img
                  src={SECTION3_IMG2}
                  alt="Prehistoric earth lesson environment"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Solar System Module Card */}
            <div
              style={s3Reveal.getAnimStyle(2)}
              className="rounded-xl md:rounded-2xl bg-vermillion/10 border border-vermillion/20 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0 text-left"
            >
              <div>
                <p className="text-xs md:text-sm font-semibold text-vermillion uppercase tracking-wider mb-2">
                  Guided Tour
                </p>
                <h3 className="text-xl md:text-3xl font-bold text-charcoalText leading-6 md:leading-8 tracking-tight">
                  Fly Through<br />the Solar<br />System
                </h3>
              </div>
              <a
                href="http://localhost:5174/"
                className="px-6 py-2.5 md:px-8 md:py-4 bg-charcoalText rounded-full text-white text-sm md:text-base font-bold hover:bg-vermillion hover:scale-105 active:scale-95 transition-all duration-200 shadow-md"
              >
                Try Demo
              </a>
            </div>

          </div>

          {/* Right Column (Single Tall Classmates Card) */}
          <div
            style={s3Reveal.getAnimStyle(3)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0 border border-black/5 group"
          >
            <img
              src={SECTION3_BG}
              alt="Virtual classmates in the 3D classroom"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            {/* Overlay Grid bottom cards */}
            <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2 z-10">

              {/* White Overlay card */}
              <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left shadow-lg">
                <h4 className="text-sm md:text-lg font-bold text-charcoalText leading-tight tracking-tight">
                  How the AI<br />Plans Your<br />Lesson
                </h4>
                <div className="self-end w-8 h-8 md:w-10 md:h-10 rounded-full border border-charcoalText flex items-center justify-center hover:bg-charcoalText hover:text-white transition-colors duration-300 cursor-pointer">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="rotate-[-45deg]"
                  >
                    <path
                      d="M1 7h12m0 0L8 2m5 5L8 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Glass Overlay card */}
              <div className="flex-1 bg-black/30 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left border border-white/15 shadow-lg">
                <h4 className="text-sm md:text-lg font-bold text-white leading-tight tracking-tight">
                  Breaks that<br />Protect<br />Young Eyes
                </h4>
                <div className="self-end w-8 h-8 md:w-10 md:h-10 rounded-full border border-white flex items-center justify-center text-white hover:bg-white hover:text-charcoalText transition-colors duration-300 cursor-pointer">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="rotate-[-45deg]"
                  >
                    <path
                      d="M1 7h12m0 0L8 2m5 5L8 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
