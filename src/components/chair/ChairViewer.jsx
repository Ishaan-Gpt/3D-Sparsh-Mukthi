import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

function HyperrealisticFemaleModel() {
  const gltf = useGLTF("/models/hyperrealistic_female_teacher.glb");
  const modelRef = useRef();
  const { actions, names } = useAnimations(gltf.animations, modelRef);

  React.useEffect(() => {
    if (actions && names.length > 0) {
      const firstAnim = names[0];
      if (actions[firstAnim]) {
        actions[firstAnim].reset().fadeIn(0.2).play();
      }
    }
  }, [actions, names]);

  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group position={[0, -0.85, 0]}>
      <primitive ref={modelRef} object={gltf.scene} scale={1.0} />
    </group>
  );
}

export function ChairViewer() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#05070c", margin: 0, padding: 0, overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 1.2, 2.6], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 10, 5]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />

        <Suspense fallback={null}>
          <HyperrealisticFemaleModel />
        </Suspense>

        <OrbitControls makeDefault target={[0, 0.2, 0]} enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}

export default ChairViewer;
