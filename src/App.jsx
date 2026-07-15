import "./App.css";
import Experience from "./components/Experience";
import { Dashboard } from "./components/dashboard/Dashboard";
import { LessonHUD } from "./components/hud/LessonHUD";
import { GesturePanel } from "./components/gesture/GesturePanel";
import { SolarSystem } from "./components/solar/SolarSystem";
import { SolarHUD } from "./components/solar/SolarHUD";
import { useLessonStore } from "./store/useLessonStore";
import { useLessonEngine } from "./hooks/useLessonEngine";

const App = () => {
  const phase = useLessonStore((s) => s.phase);
  const appMode = useLessonStore((s) => s.appMode);
  const { resumeFromBreak } = useLessonEngine();

  if (phase === "dashboard" || phase === "loading" || phase === "error") {
    return <Dashboard />;
  }

  return (
    <>
      {appMode === "solar" ? (
        <>
          <SolarSystem />
          <SolarHUD />
        </>
      ) : (
        <>
          <Experience />
          <LessonHUD resumeFromBreak={resumeFromBreak} />
        </>
      )}
      <GesturePanel />
    </>
  );
};

export default App;
