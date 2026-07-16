import { useEffect, useRef } from "react";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Imperative autoplay triggers for mobile/iOS bounds
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.play().catch((err) => {
        console.warn("Video autoplay blocked: ", err);
      });
    }
  }, []);

  return (
    <section className="relative w-full min-h-screen bg-white text-charcoalText flex flex-col justify-between pt-24 px-6 md:px-12 pb-12 overflow-hidden z-40" style={{ height: "100dvh" }}>
      
      {/* 1. Full-Screen Loop Video Background (z-0) */}
      <video
        ref={videoRef}
        src="/sp_hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
      />



      {/* 2. Fixed Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5 bg-white/20 backdrop-blur-md border-b border-black/5">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 fill-charcoalText" viewBox="0 0 256 256">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-charcoalText text-xl font-serif-italic font-bold">SM3D</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-black/10 rounded-full px-2 py-1.5 items-center gap-1">
          {["About", "Curriculum", "Intelligence", "Security"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-charcoalText/80 hover:bg-black/5 hover:text-charcoalText transition-all px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right CTA */}
        <a
          href="http://localhost:5174/"
          className="bg-charcoalText text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-vermillion hover:shadow-lg hover:shadow-vermillion/25 uppercase tracking-wider"
        >
          Enter Class
        </a>
      </nav>

      {/* 3. Foreground Content Overlay (z-20) */}
      <div className="relative z-20 flex-1 flex flex-col justify-center items-start max-w-7xl mx-auto w-full pt-8 md:pt-12 text-left">
        
        {/* Eyebrow and Script label */}
        <div className="flex items-center gap-3 text-charcoalText/40 select-none">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase font-sans">AI Virtual Classroom · Classes 1–4</span>
          <span className="text-[11px] font-serif-italic font-medium">01</span>
        </div>

        {/* Main Title Heading (No Cropping) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black text-charcoalText tracking-tight leading-[1.05] uppercase my-6">
          NEW 3D SCHOOL<br />
          UNIVERSE
        </h1>

        {/* Buttons row */}
        <div className="flex items-center gap-4 mt-2">
          <a
            href="http://localhost:5174/"
            className="bg-charcoalText text-white hover:bg-black font-heading text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.03] active:scale-95 duration-200"
          >
            Get Started
          </a>
          <a
            href="#about"
            className="text-charcoalText/60 hover:text-charcoalText font-heading text-xs font-bold uppercase tracking-wider px-6 py-3.5 transition-colors duration-200"
          >
            Contact Us
          </a>
        </div>

        {/* Metric Telemetry */}
        <div className="mt-12 md:mt-16">
          <div className="text-5xl md:text-6xl font-heading font-black text-[#0F172A] tracking-tighter">
            98.4%
          </div>
          <div className="text-[10px] font-semibold text-charcoalText/40 uppercase tracking-widest mt-1">
            Student Attention Engagement
          </div>
        </div>

      </div>

      {/* 4. Hero Section Footer (Avatars + Description - z-20) */}
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-16 pt-8 border-t border-black/5 z-20 relative">
        
        {/* Avatars Block */}
        <div className="flex items-center gap-4 text-left">
          <div className="flex -space-x-2.5">
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="/student_portrait.png" alt="Student" />
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="/story_classmates.png" alt="Classmate" />
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="/story_teacher.png" alt="Teacher" />
            <div className="inline-block h-8 w-8 rounded-full bg-vermillion ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold">20+</div>
          </div>
          <div>
            <span className="text-[9px] font-bold text-charcoalText/40 uppercase tracking-widest block leading-none mb-0.5">Trusted by Parents</span>
            <span className="text-xs font-heading font-extrabold text-charcoalText">National Standard</span>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-xs text-charcoalText/60 leading-relaxed max-w-[420px] text-left">
          A living 3D classroom in your browser — a real AI teacher who plans structured lessons, classmates who ask questions, a whiteboard that solves your child&apos;s own doubts step-by-step, and gesture controls powered entirely on-device.
        </p>

      </div>

    </section>
  );
}