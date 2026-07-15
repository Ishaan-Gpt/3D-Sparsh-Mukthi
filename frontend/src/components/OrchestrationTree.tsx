import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";

interface NodePoints {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function OrchestrationTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  const nodeRefs = {
    root: useRef<HTMLDivElement>(null),
    curriculum: useRef<HTMLDivElement>(null),
    voice: useRef<HTMLDivElement>(null),
    currDetail: useRef<HTMLDivElement>(null),
    voiceDetail: useRef<HTMLDivElement>(null),
    gesture: useRef<HTMLDivElement>(null),
    gestDetail: useRef<HTMLDivElement>(null),
  };

  const [coords, setCoords] = useState<Record<string, NodePoints>>({});

  const measure = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newCoords: Record<string, NodePoints> = {};
    Object.entries(nodeRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        newCoords[key] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    });
    setCoords(newCoords);
  };

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setTimeout(measure, 150);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getSCurve = (fromKey: string, toKey: string) => {
    const from = coords[fromKey];
    const to = coords[toKey];
    if (!from || !to) return "";

    const x1 = from.x;
    const y1 = from.y + from.height;
    const x2 = to.x;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;

    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  const connections = [
    { from: "root", to: "curriculum", delay: 0.25 },
    { from: "root", to: "voice", delay: 0.4 },
    { from: "curriculum", to: "currDetail", delay: 0.6 },
    { from: "voice", to: "voiceDetail", delay: 0.75 },
    { from: "root", to: "gesture", delay: 0.9 },
    { from: "gesture", to: "gestDetail", delay: 1.1 },
  ];

  return (
    <section id="ai-intelligence" className="relative w-full bg-white py-24 px-6 overflow-hidden flex flex-col items-center border-t border-black/5">
      {/* Header */}
      <div className="text-center mb-16 max-w-2xl">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          AI INTELLIGENCE
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-charcoalText tracking-tight leading-tight">
          Your personal{" "}
          <span className="font-serif-italic font-normal text-vermillion block sm:inline">
            AI classroom tutor
          </span>
        </h2>
        <p className="text-charcoalText/70 text-sm mt-4 font-heading">
          Experience the power of local artificial intelligence orchestrating complete spoken lessons.
        </p>
      </div>

      {/* Nodes Tree Wrapper */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[800px] flex flex-col items-center gap-12 z-20"
      >
        {/* SVG Connectors Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: "visible" }}
        >
          {isInView &&
            connections.map((conn, idx) => {
              const d = getSCurve(conn.from, conn.to);
              const pathId = `tree-path-${idx}`;
              const toPoint = coords[conn.to];

              return (
                <g key={idx}>
                  {/* S-Curve Path */}
                  <motion.path
                    id={pathId}
                    d={d}
                    fill="none"
                    stroke="rgba(15,23,42,0.12)"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: conn.delay }}
                  />

                  {/* Destination Endpoint Dot */}
                  {toPoint && (
                    <motion.circle
                      cx={toPoint.x}
                      cy={toPoint.y}
                      r="2.5"
                      fill="#0F172A"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: conn.delay + 0.6 }}
                    />
                  )}

                  {/* Traveling Glow Dot (Charcoal color in Light theme) */}
                  <motion.circle
                    r="3.5"
                    fill="#0F172A"
                    style={{ filter: "drop-shadow(0 0 3px rgba(15,23,42,0.4))" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 2.2,
                      delay: conn.delay + 0.7,
                      repeat: Infinity,
                      repeatDelay: 1.0,
                      ease: "easeInOut",
                      times: [0, 0.1, 0.9, 1],
                    }}
                  >
                    <animateMotion dur="2.2s" repeatCount="indefinite">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </motion.circle>
                </g>
              );
            })}
        </svg>

        {/* ROW 1: ROOT */}
        <div className="z-20">
          <motion.div
            ref={nodeRefs.root}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-full border border-black/10 bg-white/60 backdrop-blur-md px-6 py-2.5 font-serif-italic text-lg text-charcoalText font-semibold shadow-md hover:border-vermillion transition-all cursor-pointer"
          >
            Lesson Controller Engine
          </motion.div>
        </div>

        {/* ROW 2: CORES */}
        <div className="w-full flex justify-between gap-16 md:gap-32 z-20">
          {/* Core Left */}
          <motion.div
            ref={nodeRefs.curriculum}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="rounded-full border border-black/10 bg-white/60 backdrop-blur-md px-6 py-2.5 font-serif-italic text-lg text-charcoalText font-semibold shadow-md hover:border-vermillion transition-all cursor-pointer"
          >
            Curriculum Planner
          </motion.div>

          {/* Core Right */}
          <motion.div
            ref={nodeRefs.voice}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="rounded-full border border-black/10 bg-white/60 backdrop-blur-md px-6 py-2.5 font-serif-italic text-lg text-charcoalText font-semibold shadow-md hover:border-vermillion transition-all cursor-pointer"
          >
            Speech Controller
          </motion.div>
        </div>

        {/* ROW 3: DETAILS */}
        <div className="w-full flex justify-between gap-8 md:gap-16 z-20">
          {/* Detail Left */}
          <motion.div
            ref={nodeRefs.currDetail}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.45 }}
            className="rounded-2xl bg-white border border-black/10 text-charcoalText p-4 shadow-lg text-xs font-heading font-medium tracking-wide max-w-[180px] leading-relaxed"
          >
            Generates lesson paths, classroom dialogues, and customized doubt solving boards.
          </motion.div>

          {/* Detail Right */}
          <motion.div
            ref={nodeRefs.voiceDetail}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
            className="rounded-2xl bg-white border border-black/10 text-charcoalText p-4 shadow-lg text-xs font-heading font-medium tracking-wide max-w-[180px] leading-relaxed"
          >
            Paces blackboard updates, speech synthesizers, and teacher animations dynamically.
          </motion.div>
        </div>

        {/* ROW 4: GESTURES */}
        <div className="z-20">
          <motion.div
            ref={nodeRefs.gesture}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.75 }}
            className="rounded-full border border-black/10 bg-white/60 backdrop-blur-md px-6 py-2.5 font-serif-italic text-lg text-charcoalText font-semibold shadow-md hover:border-vermillion transition-all cursor-pointer"
          >
            Interaction System
          </motion.div>
        </div>

        {/* ROW 5: GESTURE DETAIL */}
        <div className="z-20">
          <motion.div
            ref={nodeRefs.gestDetail}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.9 }}
            className="rounded-2xl bg-white border border-black/10 text-charcoalText p-4 shadow-lg text-xs font-heading font-medium tracking-wide max-w-[220px] leading-relaxed text-center"
          >
            MediaPipe local computer vision classifies raised hands instantly in the browser.
          </motion.div>
        </div>
      </div>
    </section>
  );
}
