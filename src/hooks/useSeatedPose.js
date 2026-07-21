import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { normalizeToHeight } from "../lib/threeUtils";

const UP = new THREE.Vector3(0, 1, 0);
const SEAT_HIP_ANGLE = THREE.MathUtils.degToRad(100); // thigh: down -> forward/horizontal
const SEAT_KNEE_ANGLE = -SEAT_HIP_ANGLE; // shin: cancels the hip swing so it hangs vertical again

/**
 * Rotates `bone` by `angleRad` around a WORLD-space axis, converting the
 * delta into the bone's own local space via its parent's current world
 * orientation. Doing this in world space (instead of guessing the bone's
 * local axes) is what makes the same bend logic work identically across
 * rigs with wildly different baked bone-roll conventions (rigify metarig
 * vs Mixamo/Avaturn) without any per-rig sign-flipping.
 */
function twistBoneWorldAxis(bone, axisWorld, angleRad) {
  const parentWorldQuat = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentWorldQuat);
  const deltaWorld = new THREE.Quaternion().setFromAxisAngle(axisWorld, angleRad);
  const localDelta = parentWorldQuat.clone().invert().multiply(deltaWorld).multiply(parentWorldQuat);
  bone.quaternion.premultiply(localDelta);
  bone.updateMatrixWorld(true);
}

function findBones(root, names) {
  const found = {};
  root.traverse((o) => {
    if (!o.isBone) return;
    for (const key of Object.keys(names)) {
      if (found[key]) continue;
      if (names[key].test(o.name)) found[key] = o;
    }
  });
  return found;
}

/**
 * Poses a standing humanoid clone into a real bent-knee seated position and
 * keeps the feet on the actual classroom floor. Replaces the old trick of
 * sinking a standing model down so a desk hides its legs — that only worked
 * when a seat's XZ happened to line up with real desk geometry (it often
 * didn't), and always left legs poking through the floor once it didn't.
 *
 * Mechanics: after the idle clip settles the standing pose and
 * normalizeToHeight has planted the feet at local y=0, we measure the real
 * (scaled) hip height, drop the whole model down by the thigh's share of
 * that height (`thighFraction`), then every frame re-bend hip+knee so the
 * thigh swings to horizontal and the shin swings back to vertical — net
 * effect: feet stay put on the floor, hips settle near real bench-seat
 * height, forward-facing regardless of the rig's own rest-pose convention.
 */
export function useSeatedPose({ innerRef, clone, targetHeight, nativeForwardZ, hipNames, kneeNames, thighFraction = 0.47 }) {
  const bones = useRef(null);
  const normalized = useRef(0);
  const seated = useRef(false);

  useEffect(() => {
    bones.current = findBones(clone, {
      hipL: hipNames.L,
      hipR: hipNames.R,
      kneeL: kneeNames.L,
      kneeR: kneeNames.R,
    });
    normalized.current = 0;
    seated.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone]);

  useFrame(() => {
    const inner = innerRef.current;
    if (!inner) return;

    if (normalized.current >= 0 && ++normalized.current > 4) {
      if (normalizeToHeight(inner, targetHeight)) {
        normalized.current = -1;
        const b = bones.current;
        if (b?.hipL) {
          const hipWorld = new THREE.Vector3();
          b.hipL.getWorldPosition(hipWorld);
          const innerWorld = new THREE.Vector3();
          inner.getWorldPosition(innerWorld);
          const hipHeight = hipWorld.y - innerWorld.y;
          inner.position.y -= hipHeight * thighFraction;
        }
        seated.current = true;
      }
    }

    const b = bones.current;
    if (seated.current && b?.hipL && b?.hipR && b?.kneeL && b?.kneeR) {
      const forwardWorld = new THREE.Vector3(0, 0, nativeForwardZ).applyQuaternion(clone.getWorldQuaternion(new THREE.Quaternion()));
      const rightWorld = new THREE.Vector3().crossVectors(forwardWorld, UP).normalize();
      twistBoneWorldAxis(b.hipL, rightWorld, SEAT_HIP_ANGLE);
      twistBoneWorldAxis(b.kneeL, rightWorld, SEAT_KNEE_ANGLE);
      twistBoneWorldAxis(b.hipR, rightWorld, SEAT_HIP_ANGLE);
      twistBoneWorldAxis(b.kneeR, rightWorld, SEAT_KNEE_ANGLE);
    }
  });
}
