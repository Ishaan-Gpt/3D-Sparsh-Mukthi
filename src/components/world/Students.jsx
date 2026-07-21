import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { LoopOnce } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useLessonStore } from "../../store/useLessonStore";
import { useSeatedPose } from "../../hooks/useSeatedPose";

const TINTS = [0xffd1dc, 0xc9e4ff, 0xd6ffd1, 0xfff3c2, 0xe6d1ff, 0xffdcc2];

// Real desk-row footprints, surveyed by raycasting classroom.glb's own Desk*
// meshes at the exact transform <Classroom> applies (position [0,-8,0],
// rotation [0,PI,0]): a front row spanning world z -3.5..4.5 with desks
// centred at x -13/0/13, and a back row spanning z 8.5..12 centred at the
// same x's. Floor is flat at world y -8. The old SEATS guessed z=5.5 for the
// back row, which falls in the gap between the two real rows — that's why
// students looked like they were floating in open air instead of at a desk.
const FLOOR_Y = -8;
export const SEATS = [
  [-13, FLOOR_Y, -2.5], // front row: left
  [0, FLOOR_Y, -2.5], // front row: centre
  [13, FLOOR_Y, -2.5], // front row: right
  [-13, FLOOR_Y, 9.5], // back row: left (centre is the player's own desk)
  [13, FLOOR_Y, 9.5], // back row: right
  [13, FLOOR_Y, 11.5], // 6th classmate: next slot back, same column
];

// Two of the six bench seats are always Keshav (Avaturn rig) instead of the
// peasant model, in every class — a fixed pair so the swap is deterministic.
const KESHAV_SEATS = new Set([1, 4]);

// Rest-pose forward axis differs per rig (measured from each file's own toe
// vs. ankle bone position at identity rotation): the peasant/rigify asset
// faces -Z, the Avaturn/Mixamo rig (keshav, emilian-avatar) faces +Z. The
// facing formula's "+PI" only cancels out correctly for a -Z-forward rig —
// applying it to a +Z-forward rig (as the old shared formula did) turns the
// character exactly 180°, which is why Keshav faced the player instead of
// the board.
function faceBoardAngle(x, z, nativeForwardZ) {
  const raw = Math.atan2(-0.4 * x, -16 - z);
  return nativeForwardZ < 0 ? raw + Math.PI : raw;
}

function PeasantStudent({ index, name }) {
  const { scene, animations } = useGLTF("/models/peasant/scene.gltf");
  const raisedHandStudent = useLessonStore((s) => s.raisedHandStudent);
  const isAsking = raisedHandStudent === index;
  const inner = useRef();
  const armBone = useRef(null);
  const armBase = useRef(null);
  const raiseAmount = useRef(0);

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    const tint = new THREE.Color(TINTS[index % TINTS.length]);
    c.traverse((o) => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.material = o.material.clone();
        o.material.color.lerp(tint, 0.25); // subtle per-student tint
      }
    });
    return c;
  }, [scene, index]);

  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);

  useEffect(() => {
    const idleClip = animations.find((a) => /idle/i.test(a.name)) ?? animations[0];
    if (idleClip) {
      const idle = mixer.clipAction(idleClip);
      idle.play();
      idle.time = Math.random() * idleClip.duration; // desync
    }
    // left upper-arm bone for procedural hand-raise
    clone.traverse((o) => {
      if (!armBone.current && o.isBone && /upper_?arm/i.test(o.name) && /l\b|left|\.l|_l/i.test(o.name)) {
        armBone.current = o;
        armBase.current = o.rotation.clone();
      }
    });
    return () => mixer.stopAllAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations, mixer, clone]);

  useFrame((_, delta) => {
    mixer.update(delta);
    // procedural arm raise (peasant has no raise-hand clip)
    raiseAmount.current = THREE.MathUtils.lerp(raiseAmount.current, isAsking ? 1 : 0, delta * 5);
    const arm = armBone.current;
    if (arm && armBase.current) {
      arm.rotation.z = armBase.current.z + raiseAmount.current * -2.2;
    }
  });

  useSeatedPose({
    innerRef: inner,
    clone,
    targetHeight: 8.8 + (index % 3) * 0.3,
    nativeForwardZ: -1,
    // three.js's GLTFLoader sanitizes node names (strips "."), so the file's
    // "thigh.L_025" becomes the live bone name "thighL_025" — match without
    // the dot.
    hipNames: { L: /^thigh\.?L/, R: /^thigh\.?R/ },
    kneeNames: { L: /^shin\.?L/, R: /^shin\.?R/ },
    thighFraction: 0.465,
  });

  const [x, y, z] = SEATS[index % SEATS.length];
  const faceBoard = faceBoardAngle(x, z, -1);
  return (
    <group position={[x, y, z]} rotation={[0, faceBoard, 0]} name={`student-${name}`}>
      <group ref={inner}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

// Keshav shares the Avaturn/Mixamo-style skeleton used by the teacher rigs
// (emilian-avatar.glb), so it borrows that file's clip set at runtime instead
// of needing its own baked-in animations — same trick as ishaan.glb.
const KESHAV_ANIM = {
  idle: "IdleV4.2(maya_head)",
  raise: "greet",
};

function KeshavStudent({ index, name }) {
  const { scene } = useGLTF("/models/keshav.glb");
  const { animations } = useGLTF("/models/emilian-avatar.glb");
  const raisedHandStudent = useLessonStore((s) => s.raisedHandStudent);
  const isAsking = raisedHandStudent === index;
  const group = useRef();
  const inner = useRef();
  const wasAsking = useRef(false);

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    const tint = new THREE.Color(TINTS[index % TINTS.length]);
    c.traverse((o) => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.material = o.material.clone();
        o.material.color.lerp(tint, 0.25); // subtle per-student tint
      }
    });
    return c;
  }, [scene, index]);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    actions[KESHAV_ANIM.idle]?.reset().fadeIn(0.3).play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(() => {
    if (isAsking && !wasAsking.current) {
      const idle = actions[KESHAV_ANIM.idle];
      const raise = actions[KESHAV_ANIM.raise];
      idle?.fadeOut(0.4);
      raise?.reset().fadeIn(0.4).play();
      if (raise) {
        raise.clampWhenFinished = true;
        raise.setLoop(LoopOnce, 1);
      }
      wasAsking.current = true;
    } else if (!isAsking && wasAsking.current) {
      actions[KESHAV_ANIM.raise]?.fadeOut(0.4);
      actions[KESHAV_ANIM.idle]?.reset().fadeIn(0.4).play();
      wasAsking.current = false;
    }
  });

  useSeatedPose({
    innerRef: inner,
    clone,
    targetHeight: 8.8 + (index % 3) * 0.3,
    nativeForwardZ: 1,
    hipNames: { L: /^LeftUpLeg$/, R: /^RightUpLeg$/ },
    kneeNames: { L: /^LeftLeg$/, R: /^RightLeg$/ },
    thighFraction: 0.485,
  });

  const [x, y, z] = SEATS[index % SEATS.length];
  const faceBoard = faceBoardAngle(x, z, 1);
  return (
    <group ref={group} position={[x, y, z]} rotation={[0, faceBoard, 0]} name={`student-${name}`}>
      <group ref={inner}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

function Student({ index, name }) {
  return KESHAV_SEATS.has(index % SEATS.length) ? (
    <KeshavStudent index={index} name={name} />
  ) : (
    <PeasantStudent index={index} name={name} />
  );
}

export function Students() {
  const config = useLessonStore((s) => s.config);
  const names = config?.studentNames ?? [];
  return (
    <group>
      {names.map((name, i) => (
        <Student key={name + i} index={i} name={name} />
      ))}
    </group>
  );
}

useGLTF.preload("/models/peasant/scene.gltf");
useGLTF.preload("/models/keshav.glb");
useGLTF.preload("/models/emilian-avatar.glb");
