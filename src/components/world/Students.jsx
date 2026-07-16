import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { useLessonStore } from "../../store/useLessonStore";
import { normalizeToHeight } from "../../lib/threeUtils";

const TINTS = [0xffd1dc, 0xc9e4ff, 0xd6ffd1, 0xfff3c2, 0xe6d1ff, 0xffdcc2];

// Real bench positions surveyed from the classroom model (2 rows × 3 columns).
// Models are sunk so legs disappear behind the bench = seated look.
// The user occupies the 2nd-row centre bench (see FPVCamera).
export const SEATS = [
  [-11, -7.95, -3.5],
  [0, -7.95, -3.5],
  [11, -7.95, -3.5],
  [-11, -7.95, 5.5],
  [11, -7.95, 5.5],
  [13, -7.95, 0.5],
];
const SEAT_SINK = 1.6; // just enough that the bench hides the legs

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
      if (normalizeToHeight(inner.current, 8.8 + (index % 3) * 0.3)) normalized.current = -1;
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
  // face the board (-Z); model rest pose faces -Z after the +PI correction
  const faceBoard = Math.atan2(-0.4 * x, -16 - z) + Math.PI;
  return (
    <group position={[x, y - SEAT_SINK, z]} rotation={[0, faceBoard, 0]} name={`student-${name}`}>
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
