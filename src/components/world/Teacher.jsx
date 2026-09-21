import { useEffect, useRef } from "react";
import { LoopOnce } from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLessonStore } from "../../store/useLessonStore";
import { normalizeToHeight } from "../../lib/threeUtils";

const DEFAULT_MODEL_URL = "/models/emilian-avatar.glb";

// Each rig has its own clip names; models sharing the Emilian/Avaturn skeleton
// reuse its named clips, other rigs (e.g. the "cop" model locked to Vikram)
// declare their own idle + talk-gesture set here.
const ANIM_CONFIG = {
  "/models/cop/scene.gltf": {
    idle: "Breathing Idle",
    talk: ["Talking On A Cell Phone"],
  },
  // ishaan.glb originally shipped with only one baked-in Mixamo clip (a
  // backflip - unusable as an idle/talk loop). Its skeleton uses the same
  // bone names as the Emilian rig, so it was re-exported with Emilian's
  // full 8-clip animation set retargeted onto it; it now needs no override
  // and just uses DEFAULT_ANIM_CONFIG below.
};
const DEFAULT_ANIM_CONFIG = {
  idle: "IdleV4.2(maya_head)",
  talk: ["greet", "think", "look_around", "thanks"],
};

/**
 * The AI teacher (rigged Avaturn humanoid). Model is chosen by the selected
 * teacher persona (config.teacher.modelUrl); all persona rigs share the same
 * skeleton and animation clip names. Idle animation always running; while
 * TTS speaks, it cross-fades into a rotating set of gesture clips plus
 * gentle procedural head/body motion so it visibly addresses the class.
 */
export function Teacher({ height = 12.6, ...props }) {
  const group = useRef();
  const inner = useRef();
  const modelUrl = useLessonStore((s) => s.config?.teacher?.modelUrl) || DEFAULT_MODEL_URL;
  const anim = ANIM_CONFIG[modelUrl] || DEFAULT_ANIM_CONFIG;
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, group);
  const speaking = useLessonStore((s) => s.speaking);
  const headBone = useRef(null);
  const baseHeadRot = useRef(null);
  const currentGesture = useRef(null);
  const gestureTimer = useRef(0);
  const wasSpeaking = useRef(false);

  const normalized = useRef(0); // frames waited; normalize after the pose settles

  useEffect(() => {
    const idle = actions[anim.idle] || Object.values(actions)[0];
    idle?.reset().fadeIn(0.3).play();
    scene.traverse((o) => {
      if (!headBone.current && o.isBone && /head/i.test(o.name)) {
        headBone.current = o;
        baseHeadRot.current = o.rotation.clone();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, scene]);

  useFrame(({ clock }, delta) => {
    if (speaking) {
      gestureTimer.current -= delta;
      if (gestureTimer.current <= 0) {
        const idle = actions[anim.idle];
        const next = anim.talk[Math.floor(Math.random() * anim.talk.length)];
        const nextAction = actions[next];
        if (nextAction && next !== currentGesture.current) {
          idle?.fadeOut(0.4);
          currentGesture.current && actions[currentGesture.current]?.fadeOut(0.4);
          nextAction.reset().fadeIn(0.4).play();
          nextAction.clampWhenFinished = true;
          nextAction.setLoop(LoopOnce, 1);
          currentGesture.current = next;
        }
        gestureTimer.current = 2 + Math.random() * 2;
      }
      wasSpeaking.current = true;
    } else if (wasSpeaking.current) {
      currentGesture.current && actions[currentGesture.current]?.fadeOut(0.4);
      actions[anim.idle]?.reset().fadeIn(0.4).play();
      currentGesture.current = null;
      wasSpeaking.current = false;
    }
  });

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

useGLTF.preload("/models/emilian-avatar.glb");
useGLTF.preload("/models/cop/scene.gltf");
useGLTF.preload("/models/ishaan.glb");
