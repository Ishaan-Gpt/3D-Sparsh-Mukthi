import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface NodePoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midY: number;
}

export default function AIIntelligence() {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Section visibility observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1, rootMargin: "-100px" }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- CARD 1: Q&A QIDX TIMER ---
  const [qIdx, setQIdx] = useState(0);
  const questions = [
    {
      q: "Can I afford to invest $500 this month?",
      a: "Based on your current income and expenses, you’ll have around $620 in available balance after bills. Investing $500 is within reach - but consider saving at least $200 as an emergency buffer.",
    },
    {
      q: "When will I reach my savings goal?",
      a: "At your current savings rate of $850/month, you’ll reach your $10,000 goal in approximately 8 months. Cutting discretionary spending by 15% could shave off 3 weeks.",
    },
    {
      q: "How much did I spend on food last month?",
      a: "You spent $643 on food in March - $421 on groceries and $222 on dining out. That’s 18% above your monthly food budget of $545.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setQIdx((prev) => (prev + 1) % questions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [questions.length]);

  const currentQA = questions[qIdx];

  // --- CARD 3: NODES COORD MEASUREMENT ---
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const nodesRefs = {
    root: useRef<HTMLDivElement>(null),
    transport: useRef<HTMLDivElement>(null),
    entertainment: useRef<HTMLDivElement>(null),
    transportDetail: useRef<HTMLDivElement>(null),
    entertainmentDetail: useRef<HTMLDivElement>(null),
    bills: useRef<HTMLDivElement>(null),
    billsDetail: useRef<HTMLDivElement>(null),
  };

  const [lineCoords, setLineCoords] = useState<Record<string, NodePoints>>({});

  const measureTree = () => {
    if (!treeContainerRef.current) return;
    const containerRect = treeContainerRef.current.getBoundingClientRect();

    const getCenterBot = (elRef: React.RefObject<HTMLDivElement | null>) => {
      if (!elRef.current) return { x: 0, y: 0 };
      const r = elRef.current.getBoundingClientRect();
      return {
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top + r.height,
      };
    };

    const getCenterTop = (elRef: React.RefObject<HTMLDivElement | null>) => {
      if (!elRef.current) return { x: 0, y: 0 };
      const r = elRef.current.getBoundingClientRect();
      return {
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top,
      };
    };

    const connections = [
      { key: "root-transport", from: nodesRefs.root, to: nodesRefs.transport },
      { key: "root-entertainment", from: nodesRefs.root, to: nodesRefs.entertainment },
      { key: "transport-detail", from: nodesRefs.transport, to: nodesRefs.transportDetail },
      { key: "entertainment-detail", from: nodesRefs.entertainment, to: nodesRefs.entertainmentDetail },
      { key: "root-bills", from: nodesRefs.root, to: nodesRefs.bills },
      { key: "bills-detail", from: nodesRefs.bills, to: nodesRefs.billsDetail },
    ];

    const coordsMap: Record<string, NodePoints> = {};
    connections.forEach((conn) => {
      const fromPt = getCenterBot(conn.from);
      const toPt = getCenterTop(conn.to);
      coordsMap[conn.key] = {
        x1: fromPt.x,
        y1: fromPt.y,
        x2: toPt.x,
        y2: toPt.y,
        midY: (fromPt.y + toPt.y) / 2,
      };
    });

    setLineCoords(coordsMap);
  };

  useLayoutEffect(() => {
    measureTree();
    window.addEventListener("resize", measureTree);
    return () => window.removeEventListener("resize", measureTree);
  }, []);

  useEffect(() => {
    if (isInView) {
      setTimeout(measureTree, 150);
    }
  }, [isInView]);

  return (
    <section
      ref={containerRef}
      id="intelligence"
      className="relative w-full bg-white py-24 px-6 md:px-12 overflow-hidden flex flex-col items-center border-t border-black/5"
    >
      {/* Eyebrow badge */}
      <div className="text-center mb-16 max-w-2xl">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          AI INTELLIGENCE
        </span>

        {/* H2 title */}
        <motion.h2
          initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
          animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-heading font-extrabold text-charcoalText tracking-tight leading-tight"
        >
          Your personal{" "}
          <span className="font-serif-italic font-normal text-vermillion block sm:inline">
            AI advisor
          </span>
        </motion.h2>

        {/* Subhead text */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-charcoalText/75 text-sm mt-4 font-heading font-medium leading-relaxed"
        >
          Experience the power of artificial intelligence working for your financial well-being.
        </motion.p>
      </div>

      {/* Cards Row Grid */}
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row gap-6 items-stretch mx-auto z-20">
        
        {/* CARD 1: NATURAL LANGUAGE QUERIES */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="flex-1 min-h-[560px] rounded-[24px] overflow-hidden relative border border-black/10 shadow-lg group bg-white"
        >
          {/* Hardware-Accelerated Image Container with Scaling */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="/theme_space.png"
              alt="Space Theme Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Fine Light Gradient Backdrop Mask */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white/95" />
          </div>

          {/* Glass UI Card */}
          <div className="absolute top-8 left-6 right-6 z-10 bg-white/60 backdrop-blur-3xl border border-black/10 rounded-[20px] p-5 shadow-xl text-charcoalText">
            
            {/* Header Row */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-charcoalText rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 256 256">
                  <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
                </svg>
              </div>
              <span className="font-heading font-bold text-sm">Sparsh Mukthi 3D</span>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-dashed border-black/10 mb-4" />

            {/* Rotating Q&A Container */}
            <div className="relative h-[160px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={qIdx}
                  initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex flex-col justify-start"
                >
                  <p className="text-sm font-heading font-bold mb-3 leading-relaxed">
                    {currentQA.q}
                  </p>
                  <div className="flex gap-2 items-start bg-black/5 p-3 rounded-xl border border-black/5">
                    <div className="w-5 h-5 rounded-md bg-charcoalText/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 fill-charcoalText" viewBox="0 0 256 256">
                        <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-heading font-semibold leading-relaxed text-charcoalText/75">
                      {currentQA.a}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Row Actions */}
            <div className="flex justify-between items-center mt-4">
              <a
                href="http://localhost:5174/"
                className="flex items-center gap-2 bg-charcoalText hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full transition-all"
              >
                View demo
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowUpRight size={10} className="text-white" />
                </span>
              </a>
              <span className="text-[11px] text-charcoalText font-bold underline cursor-pointer hover:text-vermillion uppercase tracking-wider">
                ASK YOURS
              </span>
            </div>

          </div>

          {/* Aligned Title Block at the bottom */}
          <div className="absolute bottom-7 left-6 right-6 z-10 text-charcoalText">
            <h3 className="font-serif-italic text-2xl mb-2 font-medium">
              Natural Language Queries
            </h3>
            <p className="text-xs text-charcoalText/75 font-heading font-medium leading-relaxed">
              Ask questions about your finances in plain English and get instant, accurate answers.
            </p>
          </div>
        </motion.div>

        {/* CARD 2: PREDICTIVE ANALYSIS */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 }}
          className="flex-1 min-h-[560px] rounded-[24px] overflow-hidden relative border border-black/10 shadow-lg group bg-white"
        >
          {/* Hardware-Accelerated Image Container with Scaling */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="/theme_ocean.png"
              alt="Ocean Theme Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Fine Light Gradient Backdrop Mask */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white/95" />
          </div>

          {/* White rounded board */}
          <div className="absolute top-8 left-6 right-6 z-10 bg-white border border-black/5 rounded-[20px] p-6 shadow-xl text-center flex flex-col items-center">
            
            <span className="text-[11px] font-bold text-charcoalText/50 uppercase tracking-widest mb-1">
              Expenses expected to rise
            </span>
            <span className="font-serif-italic text-[52px] leading-none text-charcoalText font-normal mb-4">
              3%
            </span>

            {/* SVG Chart Container */}
            <div className="relative w-[240px] h-[120px] overflow-visible">
              <svg className="w-full h-full" viewBox="60 -25 220 145" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="areaFillLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.01" />
                  </linearGradient>
                  
                  {/* Left to right sweep clipPath */}
                  <clipPath id="revealWipe">
                    <motion.rect
                      x="60"
                      y="-25"
                      height="145"
                      initial={{ width: 0 }}
                      animate={isInView ? { width: 220 } : {}}
                      transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
                    />
                  </clipPath>
                </defs>

                {/* Filled Area */}
                <g clipPath="url(#revealWipe)">
                  <path
                    d="M 60 75 L 150 20 L 280 28 L 280 120 L 60 120 Z"
                    fill="url(#areaFillLight)"
                  />
                  {/* Draw path line */}
                  <path
                    d="M 60 75 L 150 20 L 280 28"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>

                {/* Dashed vertical limits */}
                <line x1="60" y1="75" x2="60" y2="120" stroke="#0F172A" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="280" y1="28" x2="280" y2="120" stroke="#0F172A" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

                {/* Vertical connector line from peak to dot */}
                <motion.line
                  x1="150"
                  y1="-15"
                  x2="150"
                  y2="20"
                  stroke="#FF6B00"
                  strokeWidth="1.2"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 1.4 }}
                />

                {/* Peak Indicator Dot */}
                <motion.circle
                  cx="150"
                  cy="-15"
                  r="4.5"
                  fill="#FF6B00"
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : {}}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 1.7 }}
                  style={{ transformOrigin: "150px -15px" }}
                />
              </svg>
            </div>

            {/* Tip pill */}
            <div className="border border-black/10 bg-black/5 rounded-full px-4 py-2 mt-4 text-[10px] text-charcoalText/60 font-semibold max-w-[240px] leading-tight">
              Tip: Reduce subscriptions to maintain savings target.
            </div>
          </div>

          {/* Aligned Title Block */}
          <div className="absolute bottom-7 left-6 right-6 z-10 text-charcoalText">
            <h3 className="font-serif-italic text-2xl mb-2 font-medium">
              Predictive Analysis
            </h3>
            <p className="text-xs text-charcoalText/75 font-heading font-medium leading-relaxed">
              AI algorithms analyze patterns to forecast future expenses and income trends.
            </p>
          </div>
        </motion.div>

        {/* CARD 3: SMART CATEGORIZATION */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          className="flex-1 min-h-[560px] rounded-[24px] overflow-hidden relative border border-black/10 shadow-lg group bg-white"
        >
          {/* Hardware-Accelerated Image Container with Scaling */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="/theme_dinosaur.png"
              alt="Dinosaur Theme Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Fine Light Gradient Backdrop Mask */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white/95" />
          </div>

          {/* Node Tree Box */}
          <div
            ref={treeContainerRef}
            className="absolute top-8 left-4 right-4 bottom-28 z-10 flex flex-col items-center gap-4 overflow-hidden"
          >
            {/* SVG Connector overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: "visible" }}>
              {isInView &&
                Object.entries(lineCoords).map(([key, c], idx) => {
                  const pathId = `glow-path-${idx}`;
                  const delay = 0.3 + idx * 0.15;
                  return (
                    <g key={key}>
                      <motion.path
                        id={pathId}
                        d={`M ${c.x1} ${c.y1} C ${c.x1} ${c.midY}, ${c.x2} ${c.midY}, ${c.x2} ${c.y2}`}
                        fill="none"
                        stroke="rgba(15,23,42,0.15)"
                        strokeWidth="1.2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay }}
                      />
                      
                      {/* Destination target dot */}
                      <circle cx={c.x2} cy={c.y2} r="2.2" fill="#0F172A" />

                      {/* Traveling Glow Dot */}
                      <motion.circle
                        r="3.0"
                        fill="#0F172A"
                        style={{ filter: "drop-shadow(0 0 3px rgba(15,23,42,0.4))" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0] }}
                        transition={{
                          duration: 2.2,
                          delay: delay + 0.6,
                          repeat: Infinity,
                          repeatDelay: 1.2,
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

            {/* Tree Nodes List */}
            {/* Row 1: Root */}
            <div ref={nodesRefs.root} className="z-20 border border-black/10 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full font-serif-italic text-sm text-charcoalText font-bold shadow-md cursor-pointer hover:border-vermillion transition-all">
              Categorization
            </div>

            {/* Row 2: Sub-Groups */}
            <div className="w-full flex justify-between px-6 z-20">
              <div ref={nodesRefs.transport} className="border border-black/10 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full font-serif-italic text-xs text-charcoalText font-bold shadow-md cursor-pointer hover:border-vermillion transition-all">
                Transportation
              </div>
              <div ref={nodesRefs.entertainment} className="border border-black/10 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full font-serif-italic text-xs text-charcoalText font-bold shadow-md cursor-pointer hover:border-vermillion transition-all">
                Entertainment
              </div>
            </div>

            {/* Row 3: Description Cards */}
            <div className="w-full flex justify-between px-2 z-20">
              <div ref={nodesRefs.transportDetail} className="bg-white border border-black/5 p-3 rounded-xl shadow-lg text-[10px] text-charcoalText/75 font-heading font-medium tracking-wide max-w-[110px] leading-relaxed">
                Fuel, rides, car maintenance
              </div>
              <div ref={nodesRefs.entertainmentDetail} className="bg-white border border-black/5 p-3 rounded-xl shadow-lg text-[10px] text-charcoalText/75 font-heading font-medium tracking-wide max-w-[110px] leading-relaxed">
                Streaming services, events
              </div>
            </div>

            {/* Row 4: Bills */}
            <div ref={nodesRefs.bills} className="z-20 border border-black/10 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full font-serif-italic text-xs text-charcoalText font-bold shadow-md cursor-pointer hover:border-vermillion transition-all">
              Bills and Utilities
            </div>

            {/* Row 5: Bills Detail */}
            <div ref={nodesRefs.billsDetail} className="z-20 bg-white border border-black/5 p-3 rounded-xl shadow-lg text-[10px] text-charcoalText/75 font-heading font-medium tracking-wide max-w-[140px] leading-relaxed text-center">
              Electricity, water, gas, phone
            </div>

          </div>

          {/* Aligned Title Block */}
          <div className="absolute bottom-7 left-6 right-6 z-10 text-charcoalText">
            <h3 className="font-serif-italic text-2xl mb-2 font-medium">
              Smart Categorization
            </h3>
            <p className="text-xs text-charcoalText/75 font-heading font-medium leading-relaxed">
              Automatically categorize transactions with machine learning that improves over time.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
