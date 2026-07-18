import { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { Classroom } from "./world/Classroom";
import { Teacher } from "./world/Teacher";
import { Students } from "./world/Students";
import { Whiteboard } from "./world/Whiteboard";
import { FPVCamera } from "./world/FPVCamera";

const isVRMode = typeof window !== "undefined" && window.location.search.includes("vr=true");

function StereoRenderer() {
  const { gl, scene, camera } = useThree();

  useFrame(() => {
    gl.autoClear = false;
    gl.clear();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    const eyeSep = 0.064; // Average pupillary distance
    const aspect = halfWidth / height;

    const originalPos = camera.position.clone();
    const originalRot = camera.rotation.clone();

    // 1. Render Left Eye Viewport
    gl.setViewport(0, 0, halfWidth, height);
    gl.setScissor(0, 0, halfWidth, height);
    gl.setScissorTest(true);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    camera.position.copy(originalPos).addScaledVector(new THREE.Vector3(-1, 0, 0).applyEuler(originalRot), eyeSep / 2);
    gl.render(scene, camera);

    // 2. Render Right Eye Viewport
    gl.setViewport(halfWidth, 0, halfWidth, height);
    gl.setScissor(halfWidth, 0, halfWidth, height);
    gl.setScissorTest(true);

    camera.position.copy(originalPos).addScaledVector(new THREE.Vector3(1, 0, 0).applyEuler(originalRot), eyeSep / 2);
    gl.render(scene, camera);

    // Restore Host camera reference
    camera.position.copy(originalPos);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    gl.setScissorTest(false);
  }, 1);

  return null;
}

// First-person classroom: you sit at a desk. Head-look via gestures or mouse
// drag; pinch (or wheel) zooms toward whatever you face (e.g. the board).
const DEBUG_ORBIT = typeof window !== "undefined" && window.location.search.includes("debugcam");

const Experience = () => {
  return (
    <Canvas className="canvas" camera={{ position: [0, 1.1, 4.6], fov: 50 }}>
      {!DEBUG_ORBIT && <FPVCamera />}
      {isVRMode && <StereoRenderer />}
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
