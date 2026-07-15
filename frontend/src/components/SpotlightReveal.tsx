import { useEffect, useRef } from "react";

export default function SpotlightReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  const mouseRef = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);

  const SPOTLIGHT_R = 260;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y };

      if (smoothRef.current.x === -999) {
        smoothRef.current = { x, y };
      }
    };

    container.addEventListener("mousemove", handleMouseMove);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const loop = () => {
      if (ctx && canvas && revealRef.current) {
        smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.1;
        smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill black mask base layer
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "destination-out";

        // Radial spotlight cutout
        const grad = ctx.createRadialGradient(
          smoothRef.current.x,
          smoothRef.current.y,
          0,
          smoothRef.current.x,
          smoothRef.current.y,
          SPOTLIGHT_R
        );
        grad.addColorStop(0, "rgba(0, 0, 0, 1)");
        grad.addColorStop(0.4, "rgba(0, 0, 0, 1)");
        grad.addColorStop(0.6, "rgba(0, 0, 0, 0.75)");
        grad.addColorStop(0.75, "rgba(0, 0, 0, 0.4)");
        grad.addColorStop(0.88, "rgba(0, 0, 0, 0.12)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smoothRef.current.x, smoothRef.current.y, SPOTLIGHT_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = "source-over";

        try {
          const dataUrl = canvas.toDataURL();
          revealRef.current.style.webkitMaskImage = `url(${dataUrl})`;
          revealRef.current.style.maskImage = `url(${dataUrl})`;
          revealRef.current.style.maskSize = "100% 100%";
          revealRef.current.style.webkitMaskSize = "100% 100%";
        } catch (e) {
          console.warn("Canvas mask compositing error:", e);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", updateSize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="relative w-full bg-white py-24 px-6 overflow-hidden flex flex-col items-center border-t border-black/5">
      {/* Title */}
      <div className="text-center mb-16 max-w-2xl">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          INTERACTIVE SPOTLIGHT
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-charcoalText tracking-tight leading-tight">
          Unveil the virtual{" "}
          <span className="font-serif-italic font-normal text-vermillion block sm:inline">
            classroom details
          </span>
        </h2>
        <p className="text-charcoalText/60 text-sm mt-4 font-heading font-medium leading-relaxed">
          Hover or drag your cursor inside the viewport below to reveal the active, glowing school workspace underneath.
        </p>
      </div>

      {/* Spotlight Window */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[1000px] h-[480px] rounded-[32px] overflow-hidden border border-black/10 bg-black cursor-crosshair shadow-2xl"
      >
        {/* Mask Canvas (Hidden) */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ display: "none" }} />

        {/* Base Layer: Dark Empty Classroom */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none select-none transition-transform duration-500 hover:scale-[1.02]"
          style={{ backgroundImage: "url('/hero_base.png')" }}
        />

        {/* Reveal Layer: Glowing Active Classroom */}
        <div
          ref={revealRef}
          className="absolute inset-0 bg-cover bg-center pointer-events-none select-none z-10"
          style={{ backgroundImage: "url('/hero_reveal.png')" }}
        />

        {/* Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_100%)]" />

        {/* Top Glare Frame */}
        <div className="absolute inset-0 pointer-events-none z-30 border border-white/20 rounded-[32px]" />
      </div>
    </section>
  );
}
