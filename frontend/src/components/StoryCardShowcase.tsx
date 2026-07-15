import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, ArrowUpRight } from "lucide-react";

export default function StoryCardShowcase() {
  const [slide, setSlide] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const springX = useSpring(0, { stiffness: 120, damping: 18, mass: 0.4 });
  const springY = useSpring(0, { stiffness: 120, damping: 18, mass: 0.4 });

  const rotateY = useTransform(springX, [-1, 1], [-18, 18]);
  const rotateX = useTransform(springY, [-1, 1], [12, -12]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const sx = (e.clientX - centerX) / centerX;
      const sy = (e.clientY - centerY) / centerY;

      springX.set(sx);
      springY.set(sy);
    };

    window.addEventListener("mousemove", handleMouseMove);

    const timeout = setTimeout(() => {
      setSlide(1);
    }, 3000);

    const interval = setInterval(() => {
      setSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [springX, springY]);

  const slideContent = [
    {
      bg: "/story_teacher.png",
      textHead: "Guiding",
      textSub: "their curiosity",
      desc: "Our interactive teacher avatar leads topic structures, notes formulas on the whiteboard, and explains doubts in child-friendly terminology.",
    },
    {
      bg: "/story_classmates.png",
      textHead: "Growing",
      textSub: "together daily",
      desc: "Virtual classmate avatars sit alongside your child, asking their own questions to simulate social peer dynamics and encourage participation.",
    },
  ];

  const current = slideContent[slide];

  return (
    <section className="relative w-full bg-white py-24 px-6 overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-16 border-t border-black/5">
      
      {/* Left Column: Context Details */}
      <div className="flex-1 max-w-lg text-left">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          Visual Simulation
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-charcoalText tracking-tight leading-tight mb-6">
          Designed to look like <span className="font-serif-italic font-normal text-vermillion block sm:inline">a physical school</span>
        </h2>
        <p className="text-charcoalText/75 text-sm font-heading font-medium leading-relaxed mb-8">
          The 3D canvas rendering engine creates a simulated environment with animated characters that react dynamically to inputs. Hover near the card on the right to tilt the workspace perspective.
        </p>

        {/* Dynamic Detail Text Block */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="border-l-2 border-vermillion pl-6"
          >
            <h4 className="text-base font-heading font-extrabold text-charcoalText mb-2">
              {current.textHead} {current.textSub}
            </h4>
            <p className="text-xs text-charcoalText/60 leading-relaxed font-heading font-medium">
              {current.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Column: 3D Tilting Card */}
      <div className="relative flex justify-center items-center" style={{ perspective: 1200 }}>
        <motion.div
          ref={cardRef}
          style={{
            rotateY,
            rotateX,
            transformStyle: "preserve-3d",
            boxShadow:
              "0 40px 100px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(0,0,0,0.02)",
          }}
          className="relative w-[310px] h-[455px] rounded-[28px] bg-white overflow-hidden border border-black/5"
        >
          {/* Background Layer */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url('${current.bg}')`,
              backgroundPosition: "center 20%",
            }}
          />

          {/* Soft Glass Tint */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-soft-light z-10"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.4) 40%, rgba(15,23,42,0.1) 100%)",
            }}
          />

          {/* Dual Slide Progress Timelines */}
          <div className="absolute top-6 left-6 right-6 flex gap-2 z-20">
            <div className="story-bar-1 h-[3px] flex-1 bg-black/10 rounded-full overflow-hidden">
              <div className="story-bar-fill h-full bg-charcoalText rounded-full" />
            </div>
            <div className="story-bar-2 h-[3px] flex-1 bg-black/10 rounded-full overflow-hidden">
              <div className="story-bar-fill h-full bg-charcoalText rounded-full" />
            </div>
          </div>

          {/* Bottom Gradient Fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[50%] z-10 pointer-events-none"
            style={{
              background: "linear-gradient(0deg, #FFFFFF 20%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* Sliding Headline */}
          <div className="absolute left-6 right-6 bottom-24 z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.h3
                key={slide}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-charcoalText text-[32px] leading-[36px] font-heading font-bold tracking-tight"
              >
                {current.textHead}{" "}
                <span className="font-serif-italic font-normal text-vermillion">
                  {current.textSub}
                </span>
              </motion.h3>
            </AnimatePresence>
          </div>

          {/* Bottom Interactive Options */}
          <div className="absolute left-6 right-6 bottom-6 flex items-center justify-between z-20">
            <a
              href="http://localhost:5174/"
              className="bg-charcoalText text-white hover:bg-black font-heading text-xs font-semibold px-4 py-2.5 rounded-full shadow-md flex items-center gap-1.5 transition-all"
            >
              Demo Class <ArrowUpRight size={12} />
            </a>

            <div className="flex gap-2">
              {[Heart, MessageCircle].map((Icon, idx) => (
                <button
                  key={idx}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 hover:bg-black/10 border border-black/10 transition-all text-charcoalText active:scale-90"
                >
                  <Icon size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 rounded-[28px] pointer-events-none z-20 border border-white/50" />
        </motion.div>
      </div>

    </section>
  );
}
