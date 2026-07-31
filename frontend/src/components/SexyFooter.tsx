import { useEffect, useState, useRef } from "react";
import { ArrowUp, ArrowUpRight, Check } from "lucide-react";

export default function SexyFooter() {
  const launcherRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [time, setTime] = useState("");

  // Magnetic launcher dial
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

  // Live local clock
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  const linkColumns = [
    {
      title: "CURRICULUM",
      links: [
        { text: "Class 1 · Science & Nature", href: "#curriculum" },
        { text: "Class 2 · Primary Numbers", href: "#curriculum" },
        { text: "Class 3 · Solar System Orbits", href: "#curriculum" },
        { text: "Class 4 · Basic Equations", href: "#curriculum" },
      ],
    },
    {
      title: "SAFEGUARDS",
      links: [
        { text: "Local Camera Processing", href: "#parent-desk" },
        { text: "On-Device Speech to Text", href: "#parent-desk" },
        { text: "Enforced Eye-Rest Breaks", href: "#parent-desk" },
        { text: "Child-Safe AI Filters", href: "#parent-desk" },
      ],
    },
    {
      title: "TECHNOLOGY",
      links: [
        { text: "Three.js 3D Viewport", href: "#intelligence" },
        { text: "MediaPipe Vision Engine", href: "#intelligence" },
        { text: "Live AI Lesson Planner", href: "#intelligence" },
        { text: "Web Speech Voice I/O", href: "#intelligence" },
      ],
    },
  ];

  const hasOffset = position.x !== 0 || position.y !== 0;
  const transition = hasOffset ? "transform 0.3s ease-out" : "transform 0.6s ease-in-out";

  return (
    <footer className="relative w-full min-h-screen bg-white border-t border-black/5 flex flex-col justify-between px-6 sm:px-10 md:px-14 pt-20 pb-8 overflow-hidden select-none">

      {/* ── 1. Big CTA row: headline + magnetic launcher ── */}
      <div className="w-full max-w-[1240px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12 z-10 relative">
        <div className="text-left max-w-[640px]">
          <span className="text-[10px] font-bold tracking-[0.3em] text-vermillion uppercase block mb-5">
            The bell is about to ring
          </span>
          <h2 className="text-[clamp(2.6rem,6vw,5rem)] font-heading font-black text-charcoalText tracking-tight leading-[0.98] uppercase">
            Ready for your
            <br />
            <span className="font-serif-italic font-normal normal-case text-vermillion">
              first 3D class?
            </span>
          </h2>
          <p className="text-charcoalText/60 text-sm font-heading font-medium leading-relaxed max-w-[420px] mt-6">
            One click opens a living classroom — a teacher who knows your child&apos;s name,
            classmates who ask questions, and a whiteboard that never runs out of chalk.
          </p>
        </div>

        {/* Floating Magnetic Launcher Dial */}
        <div
          ref={launcherRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition,
          }}
          className="relative group cursor-pointer shrink-0 mx-auto lg:mx-0"
        >
          {/* Decorative rings */}
          <div className="absolute inset-0 rounded-full border border-vermillion/25 scale-110 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 rounded-full border border-dashed border-charcoalText/10 scale-[1.22] pointer-events-none group-hover:rotate-45 transition-transform duration-700" />

          <a
            href="http://localhost:5174/"
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-charcoalText text-white flex flex-col items-center justify-center p-8 text-center transition-all duration-300 shadow-2xl hover:scale-[1.04] hover:bg-black border border-white/10"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-vermillion mb-2">
              Launch Portal
            </span>
            <span className="text-xl font-heading font-extrabold uppercase leading-tight tracking-tight mb-4">
              Enter
              <br />
              Classroom
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-vermillion transition-colors duration-300">
              <ArrowUpRight size={14} className="text-white" />
            </div>
          </a>
        </div>
      </div>

      {/* ── 2. Live system telemetry strip ── */}
      <div className="w-full max-w-[1240px] mx-auto z-10 relative mt-16">
        <div className="w-full bg-white border border-black/10 rounded-3xl px-6 py-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-5">
          {[
            { label: "RENDER CORE", value: "Three.js Engine Active" },
            { label: "VISION TRACKER", value: "MediaPipe Gestures Ready" },
            { label: "AI ORCHESTRATION", value: "Lesson Planner Online" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <div className="text-left">
                <span className="text-[9px] font-bold text-charcoalText/40 uppercase block leading-none mb-1">
                  {item.label}
                </span>
                <span className="text-xs font-heading font-extrabold text-charcoalText">{item.value}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-black/10 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-left">
              <span className="text-[9px] font-bold text-charcoalText/40 uppercase block leading-none mb-1">
                LOCAL TIME · IST
              </span>
              <span className="text-sm font-heading font-black text-charcoalText tabular-nums">{time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Link columns + newsletter ── */}
      <div className="w-full max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-14 pt-16 pb-14 z-10 relative">
        {/* Brand & subscribe */}
        <div className="lg:col-span-2 flex flex-col items-start text-left">
          <div className="flex items-center gap-2 mb-6">
            <img src="/logo.jpg" alt="Sparsh Mukthi" className="w-32 h-14 object-contain" />
          </div>
          <p className="text-charcoalText/60 text-xs font-heading font-medium leading-relaxed max-w-[300px] mb-4">
            Bringing the physical school environment and high-quality private tuition
            directly into the web browser for Classes 1–4. Real AI, real voice, real attention.
          </p>
          <p className="text-xs font-heading font-bold text-charcoalText mb-8">
            A product of{" "}
            <a href="https://hikat.xyz" target="_blank" rel="noopener noreferrer" className="text-vermillion underline hover:opacity-80 transition-opacity">
              hikat
            </a>
            , made by{" "}
            <a href="https://hikity.xyz" target="_blank" rel="noopener noreferrer" className="text-vermillion underline hover:opacity-80 transition-opacity">
              hikity
            </a>
          </p>

          <div className="w-full max-w-[320px]">
            <span className="text-[10px] font-bold text-vermillion tracking-widest block mb-3 uppercase">
              Subscribe to developer logs
            </span>
            <form
              onSubmit={handleSubscribe}
              className="flex items-center border-b border-black/15 focus-within:border-vermillion transition-colors py-1.5 w-full"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email address"
                className="bg-transparent text-xs font-semibold text-charcoalText placeholder-charcoalText/35 outline-none flex-1 font-heading"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors text-white ${
                  subscribed ? "bg-green-500" : "bg-charcoalText hover:bg-vermillion"
                }`}
              >
                {subscribed ? <Check size={10} /> : <ArrowUpRight size={10} />}
              </button>
            </form>
            <span
              className={`block text-[10px] font-heading font-semibold text-green-600 mt-2 transition-opacity duration-300 ${
                subscribed ? "opacity-100" : "opacity-0"
              }`}
            >
              You&apos;re on the list — welcome to class!
            </span>
          </div>
        </div>

        {/* Navigation directories */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
          {linkColumns.map((col, idx) => (
            <div key={idx} className="flex flex-col items-start text-left">
              <span className="text-[10px] font-bold text-vermillion tracking-widest block mb-6 uppercase">
                {col.title}
              </span>
              <ul className="flex flex-col gap-4 w-full">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="group flex items-center gap-1.5 text-charcoalText/75 hover:text-charcoalText font-heading text-xs font-semibold tracking-wide transition-all duration-200"
                    >
                      <span className="w-0 group-hover:w-3 h-px bg-vermillion transition-all duration-300" />
                      <span className="group-hover:translate-x-0.5 transition-transform duration-300">
                        {link.text}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Giant outlined wordmark ── */}
      <div className="w-full overflow-hidden z-0 pointer-events-none -mb-2 sm:-mb-4">
        <img
          src="/logo.jpg"
          alt="Sparsh Mukthi"
          className="w-[min(48vw,440px)] mx-auto opacity-10 grayscale"
        />
      </div>

      {/* ── 5. Bottom metadata bar ── */}
      <div className="w-full max-w-[1240px] mx-auto z-10 relative">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-black/5 gap-4">
          <p className="text-[10px] text-charcoalText/60 font-heading font-bold uppercase tracking-wider flex flex-wrap items-center gap-1.5">
            <span>© {new Date().getFullYear()} Sparsh Mukthi 3D</span>
            <span>·</span>
            <span>
              A product of{" "}
              <a href="https://hikat.xyz" target="_blank" rel="noopener noreferrer" className="text-vermillion underline hover:opacity-80">
                hikat
              </a>
            </span>
            <span>·</span>
            <span>
              Made by{" "}
              <a href="https://hikity.xyz" target="_blank" rel="noopener noreferrer" className="text-vermillion underline hover:opacity-80">
                hikity
              </a>
            </span>
            <span>·</span>
            <span>Your camera never leaves your computer</span>
          </p>

          <button
            onClick={handleScrollTop}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-charcoalText hover:text-vermillion transition-colors group"
          >
            Back to top
            <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-vermillion group-hover:-translate-y-0.5 transition-all duration-300">
              <ArrowUp size={12} className="text-charcoalText group-hover:text-white transition-colors" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
