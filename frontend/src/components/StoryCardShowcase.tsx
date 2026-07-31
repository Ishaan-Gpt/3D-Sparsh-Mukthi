import { Play } from "lucide-react";

export default function StoryCardShowcase() {
  return (
    <section className="relative w-full bg-white py-24 px-6 overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-16 border-t border-black/5">
      <div className="flex-1 max-w-lg text-left">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          See it in action
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-charcoalText tracking-tight leading-tight mb-6">
          Step inside <span className="font-serif-italic font-normal text-vermillion block sm:inline">the classroom</span>
        </h2>
        <p className="text-charcoalText/75 text-sm font-heading font-medium leading-relaxed mb-8">
          Watch a real walkthrough of the Sparsh Mukthi 3D virtual classroom experience — designed to make every lesson feel engaging and familiar.
        </p>

        <div className="border-l-2 border-vermillion pl-6">
          <h4 className="text-base font-heading font-extrabold text-charcoalText mb-2">
            Interactive learning, brought to life
          </h4>
          <p className="text-xs text-charcoalText/60 leading-relaxed font-heading font-medium">
            Explore the classroom, teacher, and lesson environment in the demo video.
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-[760px]" style={{ perspective: 1200 }}>
        <div className="relative aspect-video overflow-hidden rounded-[28px] bg-charcoalText border border-black/10 shadow-[0_40px_100px_rgba(15,23,42,0.18),0_8px_24px_rgba(15,23,42,0.08)]">
          <video
            src="/demo-class.mp4"
            controls
            playsInline
            preload="metadata"
            aria-label="Sparsh Mukthi classroom demo video"
            className="w-full h-full object-cover"
          >
            Your browser does not support the demo video.
          </video>
          <div className="absolute top-5 left-5 pointer-events-none flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoalText shadow-sm">
            <Play size={11} fill="currentColor" /> Demo video
          </div>
        </div>
      </div>
    </section>
  );
}
