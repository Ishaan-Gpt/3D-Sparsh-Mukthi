import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hero from "./components/Hero";
import MarqueeSection from "./components/MarqueeSection";
import AIIntelligence from "./components/AIIntelligence";
import Analytics from "./components/Analytics";
import SecuritySection from "./components/SecuritySection";
import StoryCardShowcase from "./components/StoryCardShowcase";
import SexyFooter from "./components/SexyFooter";
import LoadingScreen from "./components/LoadingScreen";
import ClassroomJourney from "./components/ClassroomJourney";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <div className="bg-white text-charcoalText overflow-x-hidden selection:bg-vermillion/20 selection:text-charcoalText">
        {/* Section 1: Hero (Spotlight Reveal Visual Mask) */}
        <Hero />

        {/* Section 2: Subject Marquee (Horizontal scroll parallax) */}
        <MarqueeSection />

        {/* Section 3: AI Intelligence Engine (Three cards showcase) */}
        <AIIntelligence />

        {/* Section 4: Metrics Telemetry Analytics (Count-ups) */}
        <Analytics />

        {/* Section 5: Security & Local Edge Webcam */}
        <SecuritySection />

        {/* Section 6: Visual Simulation 3D Card (Tilt carousel - replacing pricing plans) */}
        <StoryCardShowcase />

        {/* Section 7: Classroom journey flow sections */}
        <ClassroomJourney />

        {/* Section 8: Fullscreen 100vh Footer */}
        <SexyFooter />
      </div>
    </>
  );
}
