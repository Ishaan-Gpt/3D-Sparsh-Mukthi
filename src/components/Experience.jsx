import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Classroom } from "./world/Classroom";
import { Teacher } from "./world/Teacher";
import { Students } from "./world/Students";
import { Whiteboard } from "./world/Whiteboard";
import { FPVCamera } from "./world/FPVCamera";

// First-person classroom: you sit at a desk. Head-look via gestures or mouse
// drag; pinch (or wheel) zooms toward whatever you face (e.g. the board).
const DEBUG_ORBIT = typeof window !== "undefined" && window.location.search.includes("debugcam");

const Experience = () => {
  return (
    <Canvas className="canvas" camera={{ position: [0, 1.1, 4.6], fov: 50 }}>
      {!DEBUG_ORBIT && <FPVCamera />}
      {DEBUG_ORBIT && <DebugTopCam />}
      <Suspense fallback={null}>
        <Environment preset="sunset" />
        <ambientLight intensity={0.8} color={"#ffe8f0"} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} />

        <Classroom position={[0, -8, 0]} rotation={[0, Math.PI, 0]} />
        <Teacher position={[-12, -7.95, -14]} rotation={[0, 1, 0]} />
        <Students />
        <Whiteboard />
      </Suspense>
    </Canvas>
  );
};

// dev-only: top-down survey camera (?debugcam)
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
function DebugTopCam() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 4.5, 14);
    camera.fov = 85;
    camera.lookAt(0, -8, -8);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default Experience;
