import * as THREE from "three";

/**
 * Scale + offset a model wrapper so the model stands `targetHeight` tall with
 * feet at local y=0, regardless of the source file's units.
 */
export function normalizeToHeight(object, targetHeight) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y <= 1e-6) return false;
  object.scale.multiplyScalar(targetHeight / size.y);
  object.updateWorldMatrix(true, true);
  // feet on the parent group's origin (y only — parent yaw doesn't affect y)
  const box2 = new THREE.Box3().setFromObject(object);
  const parentPos = new THREE.Vector3();
  (object.parent ?? object).getWorldPosition(parentPos);
  object.position.y += parentPos.y - box2.min.y;
  return true;
}

/** yaw/pitch (YXZ order) for a camera to face along normalized direction f */
export function dirToYawPitch(f) {
  return { yaw: Math.atan2(-f.x, -f.z), pitch: Math.asin(THREE.MathUtils.clamp(f.y, -1, 1)) };
}
