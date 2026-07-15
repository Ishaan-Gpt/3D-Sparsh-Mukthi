import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 2000; // 2 seconds load time
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const nextProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        clearInterval(timer);
        setTimeout(onComplete, 350); // let 100% settle
      }
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center text-charcoalText select-none overflow-hidden"
    >
      
      {/* 3x Enlarged Headset Graphic (no background blending) */}
      <motion.div
        animate={{
          y: [0, -15, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] md:w-[600px] md:h-[600px] flex items-center justify-center pointer-events-none z-10 mb-2"
      >
        <img
          src="/sp_vr_headset.png"
          alt="Sparsh Mukthi VR Headset"
          className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.06)]"
        />
      </motion.div>

      {/* Brand Title */}
      <div className="z-10 text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-heading font-black tracking-[0.15em] uppercase text-charcoalText">
          SPARSH MUKTHI
        </h2>
        <span className="text-[10px] font-serif-italic text-vermillion tracking-wider uppercase">
          3D virtual classroom
        </span>
      </div>

      {/* Progress Counter & Bar Container */}
      <div className="w-48 sm:w-56 flex flex-col items-center gap-2 z-10">
        <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden relative">
          <motion.div
            style={{ width: `${progress}%` }}
            className="h-full bg-vermillion rounded-full"
            transition={{ ease: "easeOut" }}
          />
        </div>
        <div className="text-[10px] font-bold tracking-widest text-charcoalText/40 font-sans">
          LOADING {progress}%
        </div>
      </div>

    </motion.div>
  );
}
