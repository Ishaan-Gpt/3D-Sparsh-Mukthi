import { useGLTF } from "@react-three/drei";

export function Classroom(props) {
  const { scene } = useGLTF("/models/classroom.glb");
  return <primitive object={scene} {...props} />;
}

useGLTF.preload("/models/classroom.glb");
