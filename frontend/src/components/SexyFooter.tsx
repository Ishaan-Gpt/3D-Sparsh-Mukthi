import { useEffect, useState, useRef } from "react";
import { ArrowUp, ArrowUpRight, Rss } from "lucide-react";

export default function SexyFooter() {
  const launcherRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!launcherRef.current) return;
      const rect = launcherRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const padding = 160;
      const strength = 3;

      if (distance < padding) {
        setPosition({ x: dx / strength, y: dy / strength });
      } else {
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const linkColumns = [
    {
      title: "CURRICULUM",
      links: [
        { text: "Class 1: Science & Nature", href: "#" },
        { text: "Class 2: Primary Numbers", href: "#" },
        { text: "Class 3: Solar System Orbits", href: "#" },
        { text: "Class 4: Basic Equations", href: "#" },
      ],
    },
    {
      title: "SAFEGUARDS",
      links: [
        { text: "Local Camera Processing", href: "#" },
        { text: "Client Speech Texting", href: "#" },
        { text: "Parent Control Logs", href: "#" },
        { text: "Child Safety Filters", href: "#" },
      ],
    },
    {
      title: "TECHNOLOGY",
      links: [
        { text: "Three.js 3D Viewport", href: "#" },
        { text: "MediaPipe Vision Engine", href: "#" },
        { text: "React Orchestrator Shell", href: "#" },
        { text: "Vite Development Server", href: "#" },
      ],
    },
  ];

  const hasOffset = position.x !== 0 || position.y !== 0;
  const transition = hasOffset ? "transform 0.3s ease-out" : "transform 0.6s ease-in-out";

  return (
    <footer className="relative w-full min-h-screen bg-[#FAF9F6] border-t border-black/5 flex flex-col justify-between p-8 sm:p-12 md:p-16 overflow-hidden select-none">
      
      {/* 1. Scrolling Infinite Outline Marquee (Top) */}
      <div className="absolute top-12 left-0 right-0 w-full overflow-hidden pointer-events-none z-0">
        <div className="flex w-[200%] animate-marquee whitespace-nowrap">
          {Array(4).fill("SPARSH MUKTHI 3D ENGINE • LOCAL AI TEACHERS • CLASSES 1-4 • ").map((text, idx) => (
            <span
              key={idx}
              className="text-[9vw] font-black uppercase text-transparent tracking-tighter pr-8"
              style={{ WebkitTextStroke: "1px rgba(15, 23, 42, 0.04)" }}
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Top Info Row: Newsletter & Column Lists */}
      <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16 pt-24 pb-12 z-10 relative">
        
        {/* Left Side: Brand & Email subscribe */}
        <div className="lg:col-span-2 flex flex-col items-start text-left">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-6 h-6 fill-charcoalText" viewBox="0 0 256 256">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
            </svg>
            <span className="text-charcoalText text-lg font-serif-italic font-bold">SM3D</span>
          </div>
          <p className="text-charcoalText/60 text-xs font-heading font-medium leading-relaxed max-w-[280px] mb-8">
            Bringing physical school environments and high-quality private tuition directly into the web browser for Classes 1–4.
          </p>

          {/* Underline Newsletter Subscribe Form */}
          <div className="w-full max-w-[320px]">
            <span className="text-[10px] font-bold text-vermillion tracking-widest block mb-3 uppercase">
              Subscribe to developer logs
            </span>
            <form onSubmit={(e) => { e.preventDefault(); alert(`Subscribed: ${email}`); setEmail(""); }} className="flex items-center border-b border-black/15 focus-within:border-vermillion transition-colors py-1.5 w-full">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email address"
                className="bg-transparent text-xs font-semibold text-charcoalText placeholder-charcoalText/35 outline-none flex-1 font-heading"
              />
              <button type="submit" className="w-6 h-6 rounded-full bg-charcoalText hover:bg-vermillion flex items-center justify-center transition-colors text-white">
                <Rss size={10} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Navigation Directories */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-8 w-full">
          {linkColumns.map((col, idx) => (
            <div key={idx} className="flex flex-col items-start text-left">
              <span className="text-[10px] font-bold text-vermillion tracking-widest block mb-6 uppercase">
                {col.title}
              </span>
              <ul className="flex flex-col gap-4">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="text-charcoalText/75 hover:text-vermillion font-heading text-xs font-semibold tracking-wide transition-colors duration-200"
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>

      {/* 3. Middle Section: System Dashboard & Launcher */}
      <div className="flex-1 flex flex-col items-center justify-center py-16 z-10 relative">
        
        {/* Cockpit Dashboard Telemetry Panel */}
        <div className="w-full max-w-[940px] bg-white/70 backdrop-blur-xl border border-black/10 rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-6 mb-12">
          
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <div className="text-left">
              <span className="text-[9px] font-bold text-charcoalText/40 uppercase block">RENDER CORE</span>
              <span className="text-xs font-heading font-extrabold text-charcoalText">Three.js Engine Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <div className="text-left">
              <span className="text-[9px] font-bold text-charcoalText/40 uppercase block">VISION TRACKER</span>
              <span className="text-xs font-heading font-extrabold text-charcoalText">MediaPipe Gestures Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <div className="text-left">
              <span className="text-[9px] font-bold text-charcoalText/40 uppercase block">AI ORCHESTRATION</span>
              <span className="text-xs font-heading font-extrabold text-charcoalText">Local Dialogues Synced</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-black/10 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-left">
              <span className="text-[9px] font-bold text-charcoalText/40 uppercase block">TELEMETRY LATENCY</span>
              <span className="text-sm font-heading font-black text-charcoalText tabular-nums">14ms</span>
            </div>
          </div>

        </div>

        {/* Floating Launcher Dial */}
        <div
          ref={launcherRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition,
          }}
          className="relative group cursor-pointer"
        >
          {/* Looping decorative rings */}
          <div className="absolute inset-0 rounded-full border border-vermillion/20 scale-110 pointer-events-none group-hover:scale-125 transition-transform duration-500 animate-pulse" />
          
          <a
            href="http://localhost:5174/"
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-charcoalText hover:bg-black text-white flex flex-col items-center justify-center p-8 text-center transition-all duration-300 shadow-2xl hover:scale-[1.03] border border-white/10"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-vermillion mb-2">
              Launch Portal
            </span>
            <span className="text-xl font-heading font-extrabold uppercase leading-tight tracking-tight mb-4">
              Enter Simulator
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-vermillion transition-colors">
              <ArrowUpRight size={14} className="text-white" />
            </div>
          </a>
        </div>
      </div>

      {/* 4. Bottom Metadata & Back-To-Top */}
      <div className="w-full max-w-[1200px] mx-auto z-10 flex flex-col gap-6 relative">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-black/5 gap-4">
          <p className="text-[10px] text-charcoalText/40 font-heading font-bold uppercase tracking-wider">
            © 2026 Sparsh Mukthi 3D. All rights reserved. Powered by client AI.
          </p>

          <button
            onClick={handleScrollTop}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-charcoalText hover:text-vermillion transition-colors group"
          >
            Back to top
            <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-vermillion/10 transition-colors">
              <ArrowUp size={12} className="text-charcoalText" />
            </span>
          </button>
        </div>
      </div>

    </footer>
  );
}
