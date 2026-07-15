import { ShieldCheck, EyeOff, Lock } from "lucide-react";

export default function SecuritySection() {
  const points = [
    {
      icon: EyeOff,
      title: "100% Local Webcam Processing",
      desc: "MediaPipe hand landmarker computes hand-raises fully client-side. No raw video feed ever leaves your computer.",
    },
    {
      icon: Lock,
      title: "Zero Voice Recording Data",
      desc: "Speech recognition converts spoken doubts to text locally. No audio files are recorded or stored on any server.",
    },
    {
      icon: ShieldCheck,
      title: "AI Dialogue Content Guards",
      desc: "All lesson dialogues and answers pass through severe parent filters, strictly formatting content for Classes 1–4.",
    },
  ];

  return (
    <section id="parent-desk" className="relative w-full bg-white py-24 px-6 md:px-12 overflow-hidden flex flex-col items-center border-t border-black/5">
      {/* Container */}
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Side: Lens Graphic */}
        <div className="flex-1 flex justify-center relative group">
          {/* Animated Background Pulse */}
          <div className="absolute inset-0 bg-vermillion/5 rounded-full blur-[100px] pointer-events-none scale-75 animate-pulse" />
          
          <div className="relative w-full max-w-[420px] flex items-center justify-center p-8 select-none">
            <img
              src="/sp_vr_headset.png"
              alt="SP VR Headset Graphic"
              className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105 select-none"
            />
          </div>
        </div>

        {/* Right Side: Copy & Info Cards */}
        <div className="flex-1 flex flex-col items-start text-left">
          <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
            Safety & Privacy
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-charcoalText tracking-tight leading-tight mb-8">
            Completely private,{" "}
            <span className="font-serif-italic font-normal text-vermillion block sm:inline">
              secured at the edge
            </span>
          </h2>

          <div className="flex flex-col gap-6 w-full">
            {points.map((pt, idx) => {
              const Icon = pt.icon;
              return (
                <div
                  key={idx}
                  className="flex gap-5 bg-white border border-black/10 p-5 rounded-2xl transition-all duration-300 hover:bg-black/5 shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-charcoalText/5 border border-charcoalText/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-charcoalText" />
                  </div>
                  <div>
                    <h3 className="text-charcoalText text-base font-heading font-bold mb-1">
                      {pt.title}
                    </h3>
                    <p className="text-charcoalText/70 text-xs sm:text-sm leading-relaxed font-heading font-medium">
                      {pt.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
