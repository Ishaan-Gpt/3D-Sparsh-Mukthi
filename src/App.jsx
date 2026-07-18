import "./App.css";
import { useEffect, useState, useRef } from "react";
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
import { WebRTCBridge } from "./webrtcBridge_local"; // We'll save a copy in src/ for easy resolving

// Define a global reference for the remote gyro coordinates
export const remoteGyro = { yaw: 0, pitch: 0 };

const App = () => {
  const phase = useLessonStore((s) => s.phase);
  const appMode = useLessonStore((s) => s.appMode);
  const engine = useLessonEngine();

  const [isClient, setIsClient] = useState(false);
  const videoRef = useRef(null);
  const bridgeRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientMode = params.get("role") === "client";
    setIsClient(clientMode);

    if (clientMode) {
      // --- PHONE (CLIENT) MODE ---
      // Request device orientation permissions (required on iOS)
      const requestPermissions = () => {
        if (typeof DeviceOrientationEvent !== "undefined" && 
            typeof DeviceOrientationEvent.requestPermission === "function") {
          DeviceOrientationEvent.requestPermission().catch(console.error);
        }
      };
      window.addEventListener("pointerdown", requestPermissions);

      // Listen to gyroscope changes
      let lastSent = 0;
      const handleOrientation = (e) => {
        if (!bridgeRef.current || e.alpha === null) return;
        const now = Date.now();
        if (now - lastSent < 30) return; // limit to ~30 FPS
        lastSent = now;

        const alphaRad = (e.alpha * Math.PI) / 180;
        const betaRad = (e.beta * Math.PI) / 180;
        const gammaRad = (e.gamma * Math.PI) / 180;

        let yaw = 0;
        let pitch = 0;

        // Support landscape orientation (VR headset fit)
        const isLandscape = window.orientation === 90 || window.orientation === -90 || window.screen.orientation?.type.includes("landscape");
        if (isLandscape) {
          yaw = window.orientation === -90 ? -betaRad : betaRad;
          pitch = window.orientation === -90 ? -gammaRad : gammaRad;
        } else {
          yaw = alphaRad;
          pitch = betaRad - Math.PI / 2;
        }

        // Send yaw and pitch to host
        bridgeRef.current.send({ yaw, pitch });
      };
      window.addEventListener("deviceorientation", handleOrientation);

      // Establish connection to show laptop stream
      bridgeRef.current = new WebRTCBridge("client", (stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      });

      return () => {
        window.removeEventListener("pointerdown", requestPermissions);
        window.removeEventListener("deviceorientation", handleOrientation);
        if (bridgeRef.current) bridgeRef.current.destroy();
      };
    } else {
      // --- LAPTOP (HOST) MODE ---
      // Listen to phone gyroscope inputs
      bridgeRef.current = new WebRTCBridge("host", null, (data) => {
        if (data && typeof data.yaw === "number") {
          remoteGyro.yaw = data.yaw;
          remoteGyro.pitch = data.pitch;
        }
      });

      return () => {
        if (bridgeRef.current) bridgeRef.current.destroy();
      };
    }
  }, []);

  if (isClient) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden z-[99999]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="absolute top-4 left-4 text-white/50 text-xs font-mono pointer-events-none">
          Projected VR Screen Link Active
        </div>
      </div>
    );
  }

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
