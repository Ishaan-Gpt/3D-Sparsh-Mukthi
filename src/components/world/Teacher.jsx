import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLessonStore } from "../../store/useLessonStore";
import { normalizeToHeight } from "../../lib/threeUtils";

/**
 * The AI teacher (animated "undercover cop" model). Idle animation always
 * running; while TTS speaks, the head and body get gentle procedural motion
 * so he visibly addresses the class.
 */
export function Teacher({ height = 12.6, ...props }) {
  const group = useRef();
  const inner = useRef();
  const { scene, animations } = useGLTF("/models/cop/scene.gltf");
  const { actions } = useAnimations(animations, group);
  const speaking = useLessonStore((s) => s.speaking);
  const headBone = useRef(null);
  const baseHeadRot = useRef(null);

  const normalized = useRef(0); // frames waited; normalize after the pose settles

  useEffect(() => {
    const idle = actions["Breathing Idle"] || actions["idle"] || Object.values(actions)[0];
    idle?.reset().fadeIn(0.3).play();
    scene.traverse((o) => {
      if (!headBone.current && o.isBone && /head/i.test(o.name)) {
        headBone.current = o;
        baseHeadRot.current = o.rotation.clone();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, scene]);

  useFrame(({ clock }) => {
    // measure AFTER the animation has posed the rig (bind pose can differ wildly)
    if (normalized.current >= 0 && ++normalized.current > 4 && inner.current) {
      if (normalizeToHeight(inner.current, height)) normalized.current = -1;
    }
    const head = headBone.current;
    if (head && speaking) {
      const t = clock.elapsedTime;
      head.rotation.x += Math.sin(t * 2.2) * 0.03;
      head.rotation.y += Math.sin(t * 1.4) * 0.05;
    }
    // subtle whole-body emphasis while talking
    if (inner.current) {
      const t = clock.elapsedTime;
      inner.current.rotation.y = speaking ? Math.sin(t * 0.9) * 0.08 : 0;
    }
  });

  return (
    <group ref={group} {...props}>
      <group ref={inner}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/cop/scene.gltf");
