import { useEffect, useState, useRef } from "react";
import { Info, ArrowUpRight } from "lucide-react";

export default function Analytics() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  const [countVal1, setCountVal1] = useState(100.0);
  const [countVal2, setCountVal2] = useState(10.0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1, rootMargin: "-100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const duration = 1200;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = timestamp - startTimestamp;
      const t = Math.min(progress / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // Cubic Ease Out

      const val1 = 100 + (14250 - 100) * eased;
      const val2 = 10 + (925 - 10) * eased;

      setCountVal1(val1);
      setCountVal2(val2);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView]);

  return (
    <section
      ref={containerRef}
      id="curriculum"
      className="relative w-full bg-white py-24 px-6 md:px-12 overflow-hidden flex flex-col items-center border-t border-black/5"
    >
      {/* Header */}
      <div className="text-center mb-16 max-w-2xl">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          Analytics
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-charcoalText tracking-tight leading-tight">
          Smarter student focus{" "}
          <span className="font-serif-italic font-normal text-vermillion block sm:inline">
            insights at a glance
          </span>
        </h2>
        <p className="text-charcoalText/75 text-sm mt-4 font-heading">
          Keep learning records, focus logs, and active gesture counts in sync with local telemetry.
        </p>
      </div>

      {/* Cards Row */}
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* CARD 1 - LEFT (Wider Card, flex 1.4) */}
        <div className="flex-[1.4] rounded-[24px] overflow-hidden relative min-h-[480px] border border-black/10 group bg-white">
          
          {/* Hardware-Accelerated Image Container with Scaling */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="/hero_base.png"
              alt="Telemetry Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Bottom fade keeps text legible without washing out the image */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/30 to-transparent" />
          </div>

          {/* Glass Card Widget */}
          <div className="absolute top-8 left-6 right-6 z-10 bg-white/70 backdrop-blur-2xl border border-black/10 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold tracking-wider text-charcoalText/50 uppercase">
                STUDENT HISTORY
              </span>
              <span className="text-[10px] font-bold text-charcoalText underline cursor-pointer hover:text-vermillion transition-colors">
                MONTHLY
              </span>
            </div>

            {/* Big count-up value */}
            <div className="text-3xl md:text-4xl font-bold font-heading text-charcoalText tracking-tight tabular-nums mb-6">
              {countVal1.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs text-charcoalText/50 font-normal">MINUTES LEARNED</span>
            </div>

            {/* Dash divider */}
            <div className="w-full border-t border-dashed border-black/20 mb-6" />

            {/* Progress Rows */}
            <div className="flex flex-col gap-4">
              {/* Row 1 */}
              <div>
                <div className="flex justify-between text-xs text-charcoalText mb-1.5 font-heading">
                  <span className="opacity-80 font-medium">Attention Score</span>
                  <span className="font-bold text-charcoalText">98%</span>
                </div>
                <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-charcoalText transition-all duration-1000"
                    style={{ width: isInView ? "98%" : "0%" }}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <div className="flex justify-between text-xs text-charcoalText mb-1.5 font-heading">
                  <span className="opacity-80 font-medium">Doubts Solved</span>
                  <span className="font-bold text-charcoalText">4,250</span>
                </div>
                <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-charcoalText/75 transition-all duration-1000"
                    style={{ width: isInView ? "65%" : "0%" }}
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <div className="flex justify-between text-xs text-charcoalText mb-1.5 font-heading">
                  <span className="opacity-80 font-medium">Active Classroom Engagement</span>
                  <span className="font-bold text-charcoalText">88%</span>
                </div>
                <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-charcoalText/50 transition-all duration-1000"
                    style={{ width: isInView ? "88%" : "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom text block */}
          <div className="absolute bottom-8 left-8 right-8 z-10">
            <h3 className="font-serif-italic text-2xl md:text-3xl text-charcoalText mb-2 leading-none font-medium">
              See the full picture of your child's learning.
            </h3>
            <p className="text-xs md:text-sm text-charcoalText/75 leading-relaxed font-heading max-w-[420px] font-medium">
              Our telemetry monitors participation patterns to balance active study with rest, ensuring clear cognitive health logs.
            </p>
          </div>
        </div>

        {/* CARD 2 - RIGHT (Narrower Card, flex 1) */}
        <div className="flex-1 rounded-[24px] overflow-hidden relative min-h-[480px] border border-black/10 group bg-white">
          
          {/* Hardware-Accelerated Image Container with Scaling */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="/hero_reveal.png"
              alt="Classroom Dynamics Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Bottom fade keeps text legible without washing out the image */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/25 to-transparent" />
          </div>

          {/* DAILY tag */}
          <span className="absolute top-6 right-6 text-[10px] font-bold tracking-widest text-charcoalText/70 underline uppercase z-10">
            DAILY
          </span>

          {/* Mini active transaction card */}
          <div className="absolute top-8 left-6 z-10 w-[200px] bg-white rounded-2xl p-4 shadow-xl border border-black/5 transition-all hover:scale-105">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xl md:text-2xl font-bold font-heading text-charcoalText tabular-nums">
                {Math.round(countVal2)}
              </span>
              <Info size={14} className="text-black/35 cursor-help" />
            </div>
            <div className="text-[10px] text-black/55 font-bold font-heading uppercase mb-3">
              Gestures Tracked Today
            </div>
            <a
              href="http://localhost:5174/"
              className="w-full flex items-center justify-between bg-charcoalText hover:bg-black text-white font-heading text-xs font-semibold px-3 py-2 rounded-full transition-all"
            >
              Enter Class
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowUpRight size={10} className="text-white" />
              </span>
            </a>
          </div>

          {/* Child Portrait Image */}
          <img
            src="/student_portrait.png"
            alt="Student Portrait"
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[180px] h-[220px] object-cover rounded-2xl shadow-xl border border-white/10 z-10 transition-transform duration-500 group-hover:scale-105"
          />

          {/* Brand Pill overlay */}
          <div className="absolute bottom-28 right-6 z-20 flex items-center gap-2">
            <div className="bg-white/70 backdrop-blur-md border border-black/10 rounded-full px-4 py-2 flex items-center gap-1.5 shadow-sm">
              <img src="/logo.jpg" alt="Sparsh Mukthi" className="w-14 h-7 object-contain" />
            </div>
            <a
              href="http://localhost:5174/"
              className="w-8 h-8 rounded-full bg-charcoalText flex items-center justify-center hover:bg-black transition-all"
            >
              <ArrowUpRight size={14} className="text-white" />
            </a>
          </div>

          {/* Bottom text block */}
          <div className="absolute bottom-8 left-8 right-8 z-10">
            <h3 className="font-serif-italic text-2xl md:text-3xl text-charcoalText mb-2 leading-none font-medium">
              Balanced daily study.
            </h3>
            <p className="text-xs md:text-sm text-charcoalText/75 leading-relaxed font-heading font-medium">
              Dynamic tracking updates automatically as students listen, write on the blackboard, and converse with classmates.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
