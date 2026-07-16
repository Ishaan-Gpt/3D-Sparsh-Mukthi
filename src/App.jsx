import "./App.css";
import Experience from "./components/Experience";
import { Dashboard } from "./components/dashboard/Dashboard";
import { LessonHUD } from "./components/hud/LessonHUD";
import { GesturePanel } from "./components/gesture/GesturePanel";
import { GestureCursor } from "./components/gesture/GestureCursor";
import { ExcalidrawBoard } from "./components/whiteboard/ExcalidrawBoard";
import { SolarSystem } from "./components/solar/SolarSystem";
import { SolarHUD } from "./components/solar/SolarHUD";
import { EyeBackground } from "./components/solar/EyeBackground";
import { useLessonStore } from "./store/useLessonStore";
import { useLessonEngine } from "./hooks/useLessonEngine";

const App = () => {
  const phase = useLessonStore((s) => s.phase);
  const appMode = useLessonStore((s) => s.appMode);
  const engine = useLessonEngine();

  if (phase === "dashboard" || phase === "loading" || phase === "error") {
    return <Dashboard />;
  }

  return (
    <>
      {appMode === "solar" ? (
        <>
          <EyeBackground />
          <SolarSystem />
          <SolarHUD />
        </>
      ) : (
        <>
          <Experience />
          <LessonHUD {...engine} />
          <ExcalidrawBoard />
        </>
      )}
      {/* single overlay layer: never intercepts clicks itself */}
      <div className="overlays">
        <GesturePanel />
        <GestureCursor />
      </div>
    </>
  );
};

export default App;
