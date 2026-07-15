import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { useLessonStore } from "../../store/useLessonStore";
import { normalizeToHeight } from "../../lib/threeUtils";

const TINTS = [0xffd1dc, 0xc9e4ff, 0xd6ffd1, 0xfff3c2, 0xe6d1ff, 0xffdcc2];

// Two rows of desks facing the teacher/board. The x=-4.5..-8.5 gap keeps the
// user's FPV sight-line to the teacher clear.
export const SEATS = [
  [-8.5, -7.95, -4],
  [4, -7.95, -4],
  [7.5, -7.95, -4],
  [-8.5, -7.95, 3],
  [4, -7.95, 3],
  [7.5, -7.95, 3],
];

function Student({ index, name }) {
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

  const normalized = useRef(0);
  useFrame((_, delta) => {
    mixer.update(delta);
    // measure AFTER the idle pose applies (bind pose lies down!)
    if (normalized.current >= 0 && ++normalized.current > 4 && inner.current) {
      if (normalizeToHeight(inner.current, 9.5 + (index % 3) * 0.4)) normalized.current = -1;
    }
    // procedural arm raise (peasant has no raise-hand clip)
    raiseAmount.current = THREE.MathUtils.lerp(raiseAmount.current, isAsking ? 1 : 0, delta * 5);
    const arm = armBone.current;
    if (arm && armBase.current) {
      arm.rotation.z = armBase.current.z + raiseAmount.current * -2.2;
    } else if (inner.current) {
      inner.current.position.y = raiseAmount.current * 0.6; // fallback: hop
    }
  });

  const [x, y, z] = SEATS[index % SEATS.length];
  const faceTeacher = Math.atan2(-12 - x, -14 - z) + Math.PI; // model rest pose faces -Z
  return (
    <group position={[x, y, z]} rotation={[0, faceTeacher, 0]} name={`student-${name}`}>
      <group ref={inner}>
        <primitive object={clone} />
      </group>
    </group>
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
