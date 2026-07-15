import { useEffect, useRef, useState } from "react";

// --- IMAGE URLS ---
const HERO_IMAGE = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_113640_ccf3cf97-d447-425b-a134-d7b09fc743fc.png&w=1280&q=85";
const SECTION2_IMAGE = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114219_414dfe80-f15c-4e25-bf52-b13721f4bd88.png&w=1280&q=85";
const SECTION3_IMG1 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115253_c19ab167-8dd5-48b4-967d-b9f0d9d6e8fb.png&w=1280&q=85";
const SECTION3_IMG2 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115237_fc519057-6e87-4abf-999a-9610b8b085b4.png&w=1280&q=85";
const SECTION3_BG = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114355_752ba9e6-0942-4abb-9047-5d9bb16632e9.png&w=1280&q=85";

// --- DATA CONSTANTS ---
const featureBars = ["Advanced Dentistry", "High Quality Equipment", "Friendly Staff"];
const services = [
  { name: "Dental\nVeneers", num: "01", active: true },
  { name: "Dental\nCrowns", num: "02", active: false },
  { name: "Teeth\nWhitening", num: "03", active: false },
  { name: "Dental\nImplants", num: null, active: false },
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

// --- MAIN DENTAL CLINIC COMPONENT ---
export default function DentalClinic() {
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
    <div className="bg-white text-black font-sans select-none" style={{ fontFamily: "'Open Sauce One', sans-serif" }}>
      
      {/* ================= SECTION 1: HERO ================= */}
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
            className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative"
            style={s1Reveal.getAnimStyle(i)}
          >
            {/* Dark semi-opaque overlay inside visual card */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0" />
            <span className="flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center relative z-10">
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
          {/* Overlay to support readability */}
          <div className="absolute inset-0 bg-black/10 z-0" />

          {/* Top Left Description */}
          <p className="absolute top-4 left-4 md:top-7 md:left-7 text-black text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10 text-left">
            We wish to provide professional dental services that match the current technologies
          </p>

          {/* Bottom Left Branding */}
          <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10 text-left">
            <span className="block text-black text-xs md:text-sm font-semibold mb-1 md:mb-2">
              Trusted Dentist in West New York
            </span>
            <h1 className="text-black text-[clamp(2.5rem,10vw,10rem)] font-bold leading-[0.79] tracking-tight">
              Dental<br />Care
            </h1>
          </div>

          {/* Bottom Right Label */}
          <span className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-white text-xs md:text-sm font-semibold z-10">
            Free Consultation
          </span>
        </MaskedCard>
      </section>

      {/* ================= SECTION 2: SMILE GALLERY ================= */}
      <section
        ref={(el) => {
          s2ContainerRef.current = el;
          s2Reveal.containerRef.current = el;
        }}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 relative bg-white"
        style={{ minHeight: isMobile ? "auto" : "100dvh" }}
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
          
          {/* Card 0: Top Left Smile Gallery */}
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
            <div className="absolute inset-0 bg-black/15 z-0" />
            <h3 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-2xl md:text-3xl font-bold z-10 text-left">
              Smile Gallery
            </h3>
            <span className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white md:text-black text-xs md:text-sm font-semibold z-10 text-left">
              Our cosmetic dental work
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
            <div className="absolute inset-0 bg-black/10 z-0" />
            <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10 text-left">
              If you want a gorgeous smile,<br />call us to ask about a smile makeover.
            </p>
            <button className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-6 py-2.5 md:px-8 md:py-4 bg-white rounded-full text-black text-sm md:text-base font-bold z-10 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-md">
              Call Us
            </button>
          </MaskedCard>

          {/* Card 2: Bottom Left Smile Makeover */}
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
            <div className="absolute inset-0 bg-black/15 z-0" />
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.9] z-10 text-left">
              Smile<br />makeover
            </h2>
          </MaskedCard>

          {/* Card 3: Bottom Full Width Services Row */}
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
            <div className="absolute inset-0 bg-black/5 z-0" />
            <div className="absolute inset-0 z-10 flex flex-col md:flex-row gap-1.5 md:gap-2 p-2 md:p-3">
              {services.map((svc, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between text-left transition-all duration-300 ${
                    svc.active
                      ? "bg-white/90 backdrop-blur-md shadow-lg"
                      : "bg-white/20 backdrop-blur-xl border border-white/10"
                  }`}
                >
                  <h4
                    className={`text-lg md:text-2xl font-bold leading-[1.05] whitespace-pre-line ${
                      svc.active ? "text-black" : "text-white"
                    }`}
                  >
                    {svc.name}
                  </h4>
                  {svc.num && (
                    <span
                      className={`self-end w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        svc.active ? "border-black text-black" : "border-white text-white"
                      }`}
                    >
                      {svc.num}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </MaskedCard>

        </div>
      </section>

      {/* ================= SECTION 3: IMPLANT DENTISTRY ================= */}
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
              className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0 text-left border border-black/5"
            >
              <h2 className="text-[clamp(2.5rem,6.5vw,6rem)] font-bold leading-[0.95] text-black">
                Implant<br />Dentistry
              </h2>
              <p className="text-xs md:text-sm font-semibold text-black/60 uppercase tracking-wider">
                Restore Missing Teeth
              </p>
            </div>

            {/* Side-by-Side Images Card */}
            <div
              style={s3Reveal.getAnimStyle(1)}
              className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
            >
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden border border-black/5">
                <img
                  src={SECTION3_IMG1}
                  alt="Implant Procedure"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden border border-black/5">
                <img
                  src={SECTION3_IMG2}
                  alt="Dental Restoration"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Consultation Card */}
            <div
              style={s3Reveal.getAnimStyle(2)}
              className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0 text-left"
            >
              <div>
                <p className="text-xs md:text-sm font-semibold text-black/50 uppercase tracking-wider mb-2">
                  Consultation
                </p>
                <h3 className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8">
                  Dental<br />Restoration<br />Services
                </h3>
              </div>
              <button className="px-6 py-2.5 md:px-8 md:py-4 bg-white rounded-full text-black text-sm md:text-base font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-md">
                Book Online
              </button>
            </div>

          </div>

          {/* Right Column (Single Tall Patient Card) */}
          <div
            style={s3Reveal.getAnimStyle(3)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0 border border-black/5"
          >
            <img
              src={SECTION3_BG}
              alt="Smiling patient"
              className="w-full h-full object-cover"
            />
            {/* Overlay Grid bottom cards */}
            <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2 z-10">
              
              {/* White Overlay card */}
              <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left shadow-lg">
                <h4 className="text-sm md:text-lg font-bold text-black leading-tight">
                  The Process<br />of Installing<br />Implants
                </h4>
                <div className="self-end w-8 h-8 md:w-10 md:h-10 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors duration-300">
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
              <div className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left border border-white/10 shadow-lg">
                <h4 className="text-sm md:text-lg font-bold text-white leading-tight">
                  Caring<br />for Dental<br />Implants
                </h4>
                <div className="self-end w-8 h-8 md:w-10 md:h-10 rounded-full border border-white flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors duration-300">
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
