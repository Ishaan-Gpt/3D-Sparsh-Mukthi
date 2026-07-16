import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BODIES } from "../../data/solarData";
import { planetTexture, ringTexture, glowTexture } from "./textures";
import { gestureState, gestureEvents } from "../../lib/gestureState";
import { useLessonStore } from "../../store/useLessonStore";
import { GuidedTour } from "./GuidedTour";

// Live positions of every body, updated each frame; read by camera/tour/labels.
export const bodyPositions = Object.fromEntries(BODIES.map((b) => [b.id, new THREE.Vector3()]));

function Starfield() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 7000;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(250 + Math.random() * 250);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.9} color="#dfe8ff" sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Sun() {
  const halo = useRef();
  const particles = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 1600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(6.2 + Math.random() * 2.6);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (halo.current) {
      halo.current.rotation.y = clock.elapsedTime * 0.03;
      halo.current.rotation.z = clock.elapsedTime * 0.017;
    }
  });

  return (
    <group name="body-sun">
      <mesh name="hit-sun">
        <sphereGeometry args={[6, 48, 48]} />
        <meshBasicMaterial map={planetTexture(BODIES[0])} color="#ffdf9e" />
      </mesh>
      <points ref={halo} geometry={particles}>
        <pointsMaterial
          size={0.55}
          color="#ffb347"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <sprite scale={[26, 26, 1]}>
        <spriteMaterial
          map={glowTexture("#ffcf6f")}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight intensity={2.2} distance={300} decay={0.4} color="#fff2d5" />
    </group>
  );
}

function OrbitRing({ distance }) {
  const geo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [distance]);
  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#4d5c86" transparent opacity={0.4} />
    </line>
  );
}

function Planet({ body, paused }) {
  const orbit = useRef();
  const spin = useRef();
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!paused) angle.current += body.orbitSpeed * delta;
    const x = Math.cos(angle.current) * body.distance;
    const z = Math.sin(angle.current) * body.distance;
    orbit.current.position.set(x, 0, z);
    bodyPositions[body.id].set(x, 0, z);
    if (spin.current) spin.current.rotation.y += body.spinSpeed * delta;
  });

  return (
    <>
      <OrbitRing distance={body.distance} />
      <group ref={orbit} name={`body-${body.id}`}>
        <mesh ref={spin} name={`hit-${body.id}`}>
          <sphereGeometry args={[body.radius, 40, 40]} />
          <meshStandardMaterial map={planetTexture(body)} roughness={0.9} metalness={0} />
        </mesh>
        {body.hasRings && (
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <ringGeometry args={[body.radius * 1.4, body.radius * 2.3, 64]} />
            <meshBasicMaterial map={ringTexture()} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
        {body.hasMoon && <Moon planetRadius={body.radius} paused={paused} />}
        <sprite scale={[body.radius * 4, body.radius * 4, 1]}>
          <spriteMaterial
            map={glowTexture(body.color)}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      </group>
    </>
  );
}

function Moon({ planetRadius, paused }) {
  const ref = useRef();
  const a = useRef(0);
  useFrame((_, delta) => {
    if (!paused) a.current += delta * 0.8;
    ref.current.position.set(
      Math.cos(a.current) * planetRadius * 2.2,
      planetRadius * 0.4,
      Math.sin(a.current) * planetRadius * 2.2
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[planetRadius * 0.27, 20, 20]} />
      <meshStandardMaterial color="#c9c9c9" roughness={1} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Camera rig: gesture/mouse orbit + pinch/wheel zoom, focus on selection.
// In tour mode, GuidedTour drives cameraGoal instead.
// ---------------------------------------------------------------------------
export const cameraGoal = {
  target: new THREE.Vector3(0, 0, 0),
  radius: 90,
  bias: 1, // user zoom multiplier (buttons / wheel / pinch) — works in every mode
  driven: false, // true while the tour drives target+radius (orbit stays free)
};

function SolarCameraRig() {
  const { camera } = useThree();
  const sph = useRef({ theta: 0.8, phi: 1.15, radius: 90 });
  const mouse = useRef({ dragging: false, lastX: 0, lastY: 0, wheel: 0 });
  const target = useRef(new THREE.Vector3());
  const selectedBody = useLessonStore((s) => s.selectedBody);
  const solarMode = useLessonStore((s) => s.solarMode);

  useEffect(() => {
    const down = (e) => {
      mouse.current.dragging = true;
      mouse.current.lastX = e.clientX;
      mouse.current.lastY = e.clientY;
    };
    const move = (e) => {
      if (!mouse.current.dragging) return;
      // orbiting is ALWAYS allowed — even during the guided tour
      sph.current.theta -= (e.clientX - mouse.current.lastX) * 0.005;
      sph.current.phi = THREE.MathUtils.clamp(
        sph.current.phi - (e.clientY - mouse.current.lastY) * 0.004,
        0.25,
        Math.PI - 0.35
      );
      mouse.current.lastX = e.clientX;
      mouse.current.lastY = e.clientY;
    };
    const up = () => (mouse.current.dragging = false);
    const wheel = (e) => {
      cameraGoal.bias = THREE.MathUtils.clamp(cameraGoal.bias * (1 + e.deltaY * 0.001), 0.3, 4);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("wheel", wheel);
    };
  }, []);

  // selection focus
  useEffect(() => {
    if (solarMode !== "interact") return;
    if (selectedBody) {
      const b = BODIES.find((x) => x.id === selectedBody);
      cameraGoal.radius = Math.max(4, b.radius * 5.5);
    } else {
      cameraGoal.radius = 90;
    }
  }, [selectedBody, solarMode]);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta * 3);

    // gesture orbit: open palm steers around the system (all modes)
    if (gestureState.enabled && gestureState.present && gestureState.palmOpen && !gestureState.pinching) {
      const tTheta = (gestureState.lookX - 0.5) * Math.PI * 2.2;
      const tPhi = THREE.MathUtils.clamp(0.5 + gestureState.lookY * 1.8, 0.25, Math.PI - 0.35);
      sph.current.theta += (tTheta - sph.current.theta) * k * 0.7;
      sph.current.phi += (tPhi - sph.current.phi) * k * 0.7;
    }
    // hold-pinch dollies the zoom bias in; release keeps it (wheel/buttons adjust too)
    if (gestureState.enabled && gestureState.pinching) {
      const zoomK = THREE.MathUtils.clamp((0.42 - gestureState.pinch) / 0.3, 0, 1);
      cameraGoal.bias = THREE.MathUtils.clamp(cameraGoal.bias * (1 - zoomK * 0.02), 0.3, 4);
    }

    if (!cameraGoal.driven) {
      cameraGoal.target.copy(
        useLessonStore.getState().selectedBody
          ? bodyPositions[useLessonStore.getState().selectedBody]
          : new THREE.Vector3(0, 0, 0)
      );
    }

    const wantR = THREE.MathUtils.clamp(cameraGoal.radius * cameraGoal.bias, 3, 220);
    sph.current.radius += (wantR - sph.current.radius) * k;
    target.current.lerp(cameraGoal.target, k);

    const { theta, phi, radius } = sph.current;
    camera.position.set(
      target.current.x + radius * Math.sin(phi) * Math.cos(theta),
      target.current.y + radius * Math.cos(phi),
      target.current.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(target.current);
  });

  return null;
}

// Pinch-select: raycast from the palm-cursor; mouse click works natively.
function GestureSelect() {
  const { camera, scene } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const onSelect = (e) => {
      const st = useLessonStore.getState();
      if (st.solarMode !== "interact") return;
      const ndc = new THREE.Vector2(e.detail.x * 2 - 1, -(e.detail.y * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.name?.startsWith("hit-"));
      if (hit) st.setSelectedBody(hit.object.name.slice(4));
    };
    gestureEvents.addEventListener("pinch-select", onSelect);
    return () => gestureEvents.removeEventListener("pinch-select", onSelect);
  }, [camera, scene]);
  return null;
}

export function SolarSystem() {
  const solarMode = useLessonStore((s) => s.solarMode);
  const setSelectedBody = useLessonStore((s) => s.setSelectedBody);
  const paused = solarMode === "tour"; // freeze orbits so the tour can park at planets

  return (
    <Canvas className="canvas" camera={{ position: [50, 40, 70], fov: 55, far: 1200 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#04060f"]} />
      <ambientLight intensity={0.25} />
      <Starfield />
      <Sun />
      {BODIES.filter((b) => b.id !== "sun").map((b) => (
        <Planet
          key={b.id}
          body={b}
          paused={paused}
        />
      ))}
      {/* invisible click targets are the meshes themselves via r3f events */}
      <ClickCatcher onPick={(id) => solarMode === "interact" && setSelectedBody(id)} />
      <SolarCameraRig />
      <GestureSelect />
      {solarMode === "tour" && <GuidedTour />}
    </Canvas>
  );
}

// One pointer handler for all bodies (r3f event on the scene group).
function ClickCatcher({ onPick }) {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const click = (e) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.name?.startsWith("hit-"));
      if (hit) onPick(hit.object.name.slice(4));
    };
    gl.domElement.addEventListener("click", click);
    return () => gl.domElement.removeEventListener("click", click);
  }, [scene, camera, gl, onPick]);
  return null;
}
