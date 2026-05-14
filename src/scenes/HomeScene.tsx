import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, Stars, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { SceneLoader } from "../features/loader/SceneLoader";
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh } from "three";
import { DoubleSide, LoopOnce, RepeatWrapping, SRGBColorSpace } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useBattleStore } from "../game/battleStore";
import { characters, findCharacter, findStage, findWeapon, stages, weapons, weatherEnemies } from "../game/data";
import { useGeolocationWeather } from "../features/weather/useGeolocationWeather";
import type { CharacterId, DifficultyLevel, LoadoutTab, Stage } from "../game/types";
import { CHARACTER_MODEL_URL } from "../entities/CharacterModel";
import { fitObjectToHeight, tintCharacterMaterials } from "../entities/fitObject";
import { STAGE_PLACEMENTS, inferFootprint } from "../entities/stagePlacements";
import { AudioToggle } from "../features/audio/AudioToggle";
import { assetUrl } from "../shared/assets";
import { HomeBackdropLayer, HomeHudLayer, HomeMenuLayer } from "./home/HomeLayers";

function StoryIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 5h14a4 4 0 0 1 4 4v18l-5-3-5 3-5-3-5 3V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 11h12 M10 16h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="18" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="18" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="18" y="18" width="10" height="10" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function CharacterIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="11" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 28c2-6 7-9 11-9s9 3 11 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LoadoutIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 L16 9 M16 23 L16 29 M3 16 L9 16 M23 16 L29 16" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

function StageIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 22 L11 12 L17 18 L24 8 L29 22 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 26 L29 26" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="24" cy="9" r="1.6" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 4 L18 8 L22 8 L23 12 L27 14 L26 18 L28 22 L24 23 L22 27 L18 26 L16 28 L14 26 L10 27 L8 23 L4 22 L6 18 L4 14 L8 12 L10 8 L14 8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const HERO_TELEMETRY_LINES = [
  "天候情報を観測中…",
  "観測局 LINK OK",
  "気圧スーツ起動 / 出撃準備中",
  "天侵体スキャン / 待機",
];

const HeroTelemetry = forwardRef<HTMLDivElement>(function HeroTelemetry(_, ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % HERO_TELEMETRY_LINES.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div ref={ref} className="heroTelemetry" aria-hidden="true">
      <span className="heroTelemetryDot" />
      <span className="heroTelemetryLine" key={index}>{HERO_TELEMETRY_LINES[index]}</span>
    </div>
  );
});

// Fixed-position SVG overlay that draws a thin dashed leader line from a
// source HTML element toward the centre of the viewport, terminating in a
// glowing dot. Used by both the pilot speech bubble and the SF telemetry
// chip — each gestures toward the hero in the middle of the home stage.
function LeaderLine({
  sourceRef,
  anchor,
  accent,
  lengthFactor = 1,
  extendFraction = 0,
}: {
  sourceRef: { current: HTMLElement | null };
  /** Which point of the source rect to start the line from. */
  anchor: "top-right" | "top-center";
  accent: string;
  /** Scales the rendered line/terminus distance from start. 1 = full length
   *  (after pullback), 0.5 = half. Direction is unchanged. */
  lengthFactor?: number;
  /** 0..1. Closes the gap between the default terminus and the centre by
   *  this fraction of the gap. 0 = leave default pullback, 0.667 = close 2/3
   *  of the remaining distance. */
  extendFraction?: number;
}) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const node = sourceRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = anchor === "top-center" ? (rect.left + rect.right) / 2 : rect.right;
      const y = anchor === "top-center" ? rect.top : rect.top + 4;
      setStart({ x, y });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (sourceRef.current) ro.observe(sourceRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sourceRef, anchor]);

  if (!start) return null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const centerX = vw / 2;
  const centerY = vh / 2;
  const dx = centerX - start.x;
  const dy = centerY - start.y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  // Pull terminator back from the centre so it doesn't sit on the hero.
  // Lighter pull-back than before — line gets to extend a bit further.
  const basePullback = Math.min(170, Math.max(80, distance * 0.16));
  const pullback = basePullback * (1 - extendFraction);
  const t = ((distance - pullback) / distance) * lengthFactor;
  const endX = start.x + dx * t;
  const endY = start.y + dy * t;

  return (
    <svg
      className="pilotLogLeader"
      aria-hidden="true"
      preserveAspectRatio="none"
      viewBox={`0 0 ${vw} ${vh}`}
    >
      <line
        x1={start.x}
        y1={start.y}
        x2={endX}
        y2={endY}
        stroke={accent}
        strokeOpacity="0.55"
        strokeWidth="1"
        strokeDasharray="5 5"
      />
      <circle
        cx={endX}
        cy={endY}
        r="3.5"
        fill={accent}
        fillOpacity="0.85"
      />
    </svg>
  );
}

function GpsToggle() {
  // GPS-driven weather pull is paused for now — the chip stays visible as a
  // disabled placeholder so the planned feature has a home in the layout
  // when it comes back.
  return (
    <button
      type="button"
      className="gpsToggle is-disabled"
      aria-disabled="true"
      aria-pressed="false"
      title="現在は無効化されています"
      tabIndex={-1}
      onClick={(event) => event.preventDefault()}
    >
      <span className="gpsDot" />
      <small>GPS</small>
      <em>準備中</em>
    </button>
  );
}

function HeroMech({ accent, characterId }: { accent: string; characterId: CharacterId }) {
  const gltf = useGLTF(CHARACTER_MODEL_URL[characterId]);
  const { fitted, animations } = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene) as Group;
    fitObjectToHeight(cloned, 2.2);
    tintCharacterMaterials(cloned, accent, 0.08);
    return { fitted: cloned, animations: gltf.animations as AnimationClip[] };
  }, [gltf, accent]);
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Group>(null);
  const accentRingRef = useRef<Mesh>(null);
  const { actions, names } = useAnimations(animations, innerRef);
  const [actionTick, setActionTick] = useState(0);

  useEffect(() => {
    if (!actions || names.length === 0) {
      return;
    }
    const idleName = names.find((n) => n.toLowerCase().includes("idle")) ?? names[0];
    if (!idleName) {
      return;
    }
    const action = actions[idleName];
    if (action) {
      action.reset().fadeIn(0.3).play();
      return () => {
        action.fadeOut(0.3);
      };
    }
  }, [actions, names]);

  useEffect(() => {
    if (!actions || names.length === 0) {
      return;
    }
    const idleName = names.find((n) => n.toLowerCase().includes("idle")) ?? names[0];
    const livelyNames = names.filter((n) => /walk|run|punch|attack|jump/i.test(n));
    if (!idleName || livelyNames.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      const nextName = livelyNames[Math.floor(Math.random() * livelyNames.length)];
      const next = actions[nextName];
      const idle = actions[idleName];
      if (!next || !idle) {
        return;
      }
      idle.fadeOut(0.18);
      next.reset();
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = false;
      next.fadeIn(0.12).play();
      setActionTick((value) => value + 1);
      window.setTimeout(() => {
        next.fadeOut(0.18);
        idle.reset().fadeIn(0.18).play();
      }, 760);
    }, 5200);
    return () => window.clearInterval(id);
  }, [actions, names]);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    node.position.y = Math.sin(t * 0.6) * 0.04;
    node.rotation.y = Math.sin(t * 0.3) * 0.12 + Math.sin(actionTick * 1.7) * 0.05;
    if (accentRingRef.current) {
      const mat = accentRingRef.current.material as { emissiveIntensity?: number };
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.8 + (Math.sin(t * 1.6) + 1) * 0.6;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={innerRef}>
        <primitive object={fitted} />
      </group>
      <mesh ref={accentRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[0.7, 0.86, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[1.0, 1.06, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <HeroSparkles accent={accent} />
    </group>
  );
}

function HeroSparkles({ accent }: { accent: string }) {
  const groupRef = useRef<Group>(null);
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        baseAngle: (i / 18) * Math.PI * 2,
        radius: 0.85 + Math.random() * 0.25,
        height: 0.3 + Math.random() * 1.7,
        speed: 0.4 + Math.random() * 0.4,
        scale: 0.04 + Math.random() * 0.06,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) return;
    const t = clock.getElapsedTime();
    node.children.forEach((child, i) => {
      const data = sparkles[i];
      const angle = data.baseAngle + t * data.speed;
      child.position.x = Math.cos(angle) * data.radius;
      child.position.z = Math.sin(angle) * data.radius;
      child.position.y = data.height + Math.sin(t * 1.4 + i) * 0.18;
      const mat = (child as { material?: { emissiveIntensity?: number; opacity?: number } }).material;
      if (mat?.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 1 + Math.sin(t * 3 + i) * 0.6;
      }
    });
  });
  return (
    <group ref={groupRef}>
      {sparkles.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.baseAngle) * s.radius, s.height, Math.sin(s.baseAngle) * s.radius]}>
          <sphereGeometry args={[s.scale, 6, 6]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

const SATELLITE_DISH_URL = assetUrl("/models/space-kit/satelliteDish_large.glb");

function SatelliteDish({ position = [6, 0, -3] as [number, number, number], scale = 1.6 }: {
  position?: [number, number, number];
  scale?: number;
} = {}) {
  const dishRef = useRef<Group>(null);
  const { scene } = useGLTF(SATELLITE_DISH_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useFrame(({ clock }) => {
    const node = dishRef.current;
    if (!node) {
      return;
    }
    node.rotation.y = Math.sin(clock.getElapsedTime() * 0.18) * 0.6 + 0.3;
  });

  return (
    <group ref={dishRef} position={position} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(SATELLITE_DISH_URL);

const TOWER_BASE_URL = assetUrl("/models/tower-defense-kit/tower-round-base.glb");
const TOWER_BODY_URL = assetUrl("/models/tower-defense-kit/tower-round-build-c.glb");
const TOWER_TOP_URL = assetUrl("/models/tower-defense-kit/tower-round-top-a.glb");

function WarningTower({ position }: { position: [number, number, number] }) {
  const lampRef = useRef<Mesh>(null);
  const baseGltf = useGLTF(TOWER_BASE_URL);
  const bodyGltf = useGLTF(TOWER_BODY_URL);
  const topGltf = useGLTF(TOWER_TOP_URL);
  const baseScene = useMemo(() => baseGltf.scene.clone(true), [baseGltf]);
  const bodyScene = useMemo(() => bodyGltf.scene.clone(true), [bodyGltf]);
  const topScene = useMemo(() => topGltf.scene.clone(true), [topGltf]);

  useFrame(({ clock }) => {
    if (!lampRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const material = lampRef.current.material as { emissiveIntensity?: number };
    material.emissiveIntensity = 0.6 + (Math.sin(t * 3) + 1) * 1.4;
  });

  return (
    <group position={position} scale={1.1}>
      <primitive object={baseScene} />
      <primitive object={bodyScene} position={[0, 0.55, 0]} />
      <primitive object={topScene} position={[0, 1.35, 0]} />
      <mesh ref={lampRef} position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#ff315b" emissive="#ff315b" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(TOWER_BASE_URL);
useGLTF.preload(TOWER_BODY_URL);
useGLTF.preload(TOWER_TOP_URL);

function FloorGrid({ stage, ringColor }: { stage: Stage; ringColor: string }) {
  const placement = STAGE_PLACEMENTS[stage.id];
  const floor = placement.floor;
  const textureKey = floor.texture ?? "lab";
  const repeat = floor.textureRepeat ?? 6;
  const [colorMap, normalMap, roughMap, aoMap] = useTexture([
    assetUrl(`/textures/field/${textureKey}/color.jpg`),
    assetUrl(`/textures/field/${textureKey}/normal.jpg`),
    assetUrl(`/textures/field/${textureKey}/roughness.jpg`),
    assetUrl(`/textures/field/${textureKey}/ao.jpg`),
  ]);
  useEffect(() => {
    [colorMap, normalMap, roughMap, aoMap].forEach((map) => {
      map.wrapS = map.wrapT = RepeatWrapping;
      map.repeat.set(repeat, repeat);
      map.needsUpdate = true;
    });
    colorMap.colorSpace = SRGBColorSpace;
  }, [colorMap, normalMap, roughMap, aoMap, repeat]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial
          color="#ffffff"
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={roughMap}
          aoMap={aoMap}
          metalness={floor.metalness}
          roughness={floor.roughness}
        />
      </mesh>
      {[2.6, 5.6, 9.4].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.03, 0]}
        >
          <ringGeometry args={[radius, radius + 0.18, 96]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.55 - index * 0.12}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function RainStreaks({ count = 60, color = "#7adcff", opacity = 0.42 }: { count?: number; color?: string; opacity?: number }) {
  const groupRef = useRef<Group>(null);
  const streaks = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 32,
        y: Math.random() * 10 + 1,
        z: (Math.random() - 0.5) * 18 - 4,
        speed: 5 + Math.random() * 5,
      })),
    [count],
  );

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= streaks[i].speed * delta;
      if (child.position.y < 0) {
        child.position.y = 11;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {streaks.map((streak, index) => (
        <mesh key={index} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.02, 0.55, 0.02]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function HomeSnowDrift() {
  const groupRef = useRef<Group>(null);
  const flakes = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        x: (Math.random() - 0.5) * 32,
        y: Math.random() * 11,
        z: (Math.random() - 0.5) * 18 - 4,
        speed: 0.5 + Math.random() * 0.7,
        sway: Math.random() * Math.PI * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= flakes[i].speed * delta;
      child.position.x += Math.sin(t * 1.0 + flakes[i].sway) * delta * 0.4;
      if (child.position.y < 0) {
        child.position.y = 11;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {flakes.map((flake, index) => (
        <mesh key={index} position={[flake.x, flake.y, flake.z]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#dff8ff" emissive="#dff8ff" emissiveIntensity={0.45} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ThunderFlicker() {
  const lightRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const node = lightRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    const cycle = (t % 4.5) / 4.5;
    const flash = cycle < 0.04 ? Math.sin(cycle / 0.04 * Math.PI) : 0;
    const material = node.material as { emissiveIntensity?: number; opacity?: number };
    if (material.emissiveIntensity !== undefined) {
      material.emissiveIntensity = 0.3 + flash * 4.6;
    }
    if (material.opacity !== undefined) {
      material.opacity = 0.3 + flash * 0.55;
    }
  });

  return (
    <mesh ref={lightRef} position={[0, 6, -8]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 6]} />
      <meshStandardMaterial color="#fff7a8" emissive="#fff7a8" emissiveIntensity={0.3} transparent opacity={0.3} toneMapped={false} side={2} />
    </mesh>
  );
}

const BACKDROP_URLS = [
  assetUrl("/models/space-kit/hangar_smallA.glb"),
  assetUrl("/models/space-kit/hangar_smallB.glb"),
  assetUrl("/models/space-kit/hangar_roundA.glb"),
  assetUrl("/models/space-kit/hangar_roundB.glb"),
  assetUrl("/models/space-kit/structure.glb"),
  assetUrl("/models/space-kit/structure_detailed.glb"),
];

// Outer backdrop ring (z = -10 / -10.5). Every neighbour pair clears
// hangar+hangar footprint sums (5.28 + 5.28 = 10.56 for smallA/B, sum
// 3.20 for structure pair) with comfortable margin. Outer pair pushed
// to ±14 so they don't crowd the inner tower line.
const BACKDROP_PLACEMENTS: Array<{ x: number; z: number; rotY: number; scale: number; idx: number }> = [
  { x: -14.0, z: -10.0, rotY: 0.4, scale: 2.2, idx: 0 },  // hangar_smallA
  { x: -4.5, z: -10.5, rotY: -0.3, scale: 2.0, idx: 4 },  // structure
  { x: 4.5, z: -10.5, rotY: -0.5, scale: 2.0, idx: 5 },   // structure_detailed
  { x: 14.0, z: -10.0, rotY: 0.2, scale: 2.2, idx: 1 },   // hangar_smallB
];

// Mid layer: 4 vertical accent towers in a row at z = -5.5. Spacings
// chosen against the keyword-inferred tower footprint (1.76) and the
// satellite dish (2.56) so all neighbour pairs stay clear without
// relying on Box3 measurements being smaller than keyword inference.
const TOWER_PLACEMENTS: Array<[number, number, number]> = [
  [-7.0, 0, -5.5],
  [-3.0, 0, -5.5],
  [3.0, 0, -5.5],
  [7.0, 0, -5.5],
];

// Front anchor: dish sits forward and to the right (z=-1, x=5). Far
// enough from all 4 towers to clear the dish radius (2.56) + tower
// (1.76), and far enough from hero (radius 1) to not crowd the
// silhouette.
const SATELLITE_DISH_POSITION: [number, number, number] = [5.0, 0, -1.0];
const SATELLITE_DISH_SCALE = 1.6;

// Inline disc list used by HomeColliderDebug. Hero is the central
// keep-out; the rest mirror the placement constants above. Footprint
// values are derived at render time from inferFootprint to keep this in
// sync with whatever is in the cache.
function homeDebugDiscs(): Array<{ x: number; z: number; r: number; kind: "hero" | "tower" | "dish" | "hangar" }> {
  const out: Array<{ x: number; z: number; r: number; kind: "hero" | "tower" | "dish" | "hangar" }> = [
    { x: 0, z: 0, r: 1.0, kind: "hero" },
    {
      x: SATELLITE_DISH_POSITION[0],
      z: SATELLITE_DISH_POSITION[2],
      r: inferFootprint(SATELLITE_DISH_URL.replace(/^.*\/models\//, "/models/"), SATELLITE_DISH_SCALE),
      kind: "dish",
    },
  ];
  for (const [x, , z] of TOWER_PLACEMENTS) {
    out.push({ x, z, r: inferFootprint("/models/tower-defense-kit/tower-round-base.glb", 1.1), kind: "tower" });
  }
  for (const p of BACKDROP_PLACEMENTS) {
    out.push({
      x: p.x,
      z: p.z,
      r: inferFootprint(BACKDROP_URLS[p.idx % BACKDROP_URLS.length].replace(/^.*\/models\//, "/models/"), p.scale),
      kind: "hangar",
    });
  }
  return out;
}

function HomeColliderDebug() {
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "placement";
  }, []);
  if (!enabled) return null;
  const discs = homeDebugDiscs();
  const colorFor: Record<string, string> = {
    hero: "#ff3b6b",
    tower: "#3bd6ff",
    dish: "#ffd83b",
    hangar: "#ff63d1",
  };
  return (
    <>
      {discs.map((d, i) => (
        <group key={i} position={[d.x, 0.05, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[Math.max(d.r - 0.05, 0.02), d.r, 48]} />
            <meshBasicMaterial color={colorFor[d.kind]} transparent opacity={0.95} side={DoubleSide} toneMapped={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[0, Math.max(d.r - 0.05, 0.02), 48]} />
            <meshBasicMaterial color={colorFor[d.kind]} transparent opacity={0.18} side={DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function BackdropStructures() {
  return (
    <>
      {BACKDROP_PLACEMENTS.map((p, i) => (
        <BackdropItem key={i} url={BACKDROP_URLS[p.idx % BACKDROP_URLS.length]} x={p.x} z={p.z} rotY={p.rotY} scale={p.scale} />
      ))}
    </>
  );
}

function BackdropItem({ url, x, z, rotY, scale }: { url: string; x: number; z: number; rotY: number; scale: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

BACKDROP_URLS.forEach((url) => useGLTF.preload(url));

function RotatingScenery({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    node.rotation.y = t * 0.085;
    node.position.y = Math.sin(t * 0.4) * 0.05;
  });
  return <group ref={groupRef}>{children}</group>;
}

function HomeOrbit({ children, speed = 0.06 }: { children: React.ReactNode; speed?: number }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    node.rotation.y = state.clock.getElapsedTime() * speed;
  });
  return <group ref={groupRef}>{children}</group>;
}

function HomeStage({
  accent,
  stage,
  ringColor,
  weatherCode,
  characterId,
}: {
  accent: string;
  stage: Stage;
  ringColor: string;
  weatherCode: number | null;
  characterId: CharacterId;
}) {
  const isRain = weatherCode !== null && ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82));
  const isSnow = weatherCode !== null && ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86));
  const isThunder = weatherCode !== null && weatherCode >= 95;
  const isFog = weatherCode === 45 || weatherCode === 48;
  const isCloudy = weatherCode !== null && weatherCode >= 1 && weatherCode <= 3;
  const isClear = weatherCode === 0;

  const fogColor = isThunder ? "#0a0c14" : isSnow ? "#a7c8d8" : isFog ? "#525c66" : "#06121d";
  const fogNear = isFog ? 4 : 8;
  const fogFar = isFog ? 18 : 30;

  return (
    <>
      <color attach="background" args={[isClear ? "#1d3a52" : "#040c14"]} />
      <Sky
        sunPosition={[2, isClear ? 0.7 : 0.4, 1.6]}
        turbidity={isClear ? 4 : isThunder ? 16 : 9}
        rayleigh={isClear ? 1.6 : 3.2}
        mieCoefficient={0.04}
      />
      <Stars radius={90} depth={36} count={isCloudy || isFog || isThunder ? 360 : 900} factor={3} fade />
      <ambientLight intensity={isClear ? 0.6 : 0.35} color="#9ad5ff" />
      <directionalLight position={[3, 6, 2]} intensity={isClear ? 2.2 : 1.6} color={isClear ? "#fff7d8" : "#bdeeff"} />
      <pointLight position={[6.6, 3.2, -3.2]} intensity={1.6} color={ringColor} distance={10} />
      <pointLight position={[-4, 2.4, 1]} intensity={1.2} color="#ff315b" distance={8} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <HomeOrbit speed={0.06}>
        <FloorGrid stage={stage} ringColor={ringColor} />
        <SatelliteDish position={SATELLITE_DISH_POSITION} scale={SATELLITE_DISH_SCALE} />
        {TOWER_PLACEMENTS.map((position) => (
          <WarningTower key={`${position[0]}_${position[2]}`} position={position} />
        ))}
        <BackdropStructures />
        <HomeColliderDebug />
        <RotatingScenery>
          {[3, 5, 8].map((radius) => (
            <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <ringGeometry args={[radius, radius + 0.04, 96]} />
              <meshBasicMaterial color={ringColor} transparent opacity={0.18} toneMapped={false} />
            </mesh>
          ))}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const r = 6.8;
            return (
              <mesh
                key={`tick-${i}`}
                position={[Math.cos(angle) * r, -0.02, Math.sin(angle) * r]}
                rotation={[-Math.PI / 2, 0, -angle]}
              >
                <planeGeometry args={[0.6, 0.08]} />
                <meshBasicMaterial color={ringColor} transparent opacity={0.55} toneMapped={false} />
              </mesh>
            );
          })}
        </RotatingScenery>
        <HeroMech accent={accent} characterId={characterId} />
      </HomeOrbit>

      {isClear ? null : isSnow ? (
        <HomeSnowDrift />
      ) : isThunder ? (
        <RainStreaks count={120} color="#a8c8d8" opacity={0.55} />
      ) : isRain ? (
        <RainStreaks count={120} color="#7adcff" opacity={0.6} />
      ) : (
        <RainStreaks count={40} color="#7adcff" opacity={0.28} />
      )}

      {isThunder ? <ThunderFlicker /> : null}
    </>
  );
}

export function HomeScene({
  onStart,
  onOpenEnemyGrid,
  onOpenLoadout,
  onOpenSettings,
  onOpenCharacterGrid,
  onOpenStory,
}: {
  onStart: () => void;
  onOpenEnemyGrid: () => void;
  onOpenLoadout: (tab?: LoadoutTab) => void;
  onOpenSettings: () => void;
  onOpenCharacterGrid: () => void;
  onOpenStory: () => void;
}) {
  useGeolocationWeather();
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const selectStage = useBattleStore((state) => state.selectStage);
  const selectEnemy = useBattleStore((state) => state.selectEnemy);
  const selectWeapon = useBattleStore((state) => state.selectWeapon);
  const selectCharacter = useBattleStore((state) => state.selectCharacter);
  const selectedDifficulty = useBattleStore((state) => state.selectedDifficulty);
  const setDifficulty = useBattleStore((state) => state.setDifficulty);
  const currentWeatherCode = useBattleStore((state) => state.currentWeatherCode);
  const locationEnabled = useBattleStore((state) => state.locationEnabled);
  const missionPreviewRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLQuoteElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const [menuTopPx, setMenuTopPx] = useState<number | null>(null);

  const selectedEnemy = weatherEnemies.find((enemy) => enemy.id === selectedEnemyId) ?? weatherEnemies[0];
  const weapon = findWeapon(selectedWeaponId);
  const character = findCharacter(selectedCharacterId);
  const stage = findStage(selectedStageId);
  const playableEnemies = weatherEnemies.filter((enemy) => enemy.playableInMvp);

  function cycleStage(direction: 1 | -1) {
    const currentIndex = stages.findIndex((s) => s.id === stage.id);
    const nextIndex = (currentIndex + direction + stages.length) % stages.length;
    selectStage(stages[nextIndex].id);
  }

  function cycleEnemy(direction: 1 | -1) {
    const currentIndex = playableEnemies.findIndex((e) => e.id === selectedEnemy.id);
    const nextIndex = (currentIndex + direction + playableEnemies.length) % playableEnemies.length;
    selectEnemy(playableEnemies[nextIndex].id);
  }

  function cycleWeapon(direction: 1 | -1) {
    const currentIndex = weapons.findIndex((w) => w.id === weapon.id);
    const nextIndex = (currentIndex + direction + weapons.length) % weapons.length;
    selectWeapon(weapons[nextIndex].id);
  }

  function cycleCharacter(direction: 1 | -1) {
    const currentIndex = characters.findIndex((c) => c.id === character.id);
    const nextIndex = (currentIndex + direction + characters.length) % characters.length;
    selectCharacter(characters[nextIndex].id);
  }

  function cycleDifficulty(direction: 1 | -1) {
    const next = Math.max(1, Math.min(5, selectedDifficulty + direction)) as DifficultyLevel;
    setDifficulty(next);
  }

  const difficultyName = selectedDifficulty <= 1
    ? "やさしい"
    : selectedDifficulty === 2
    ? "ふつう"
    : selectedDifficulty === 3
    ? "手強い"
    : selectedDifficulty === 4
    ? "苛烈"
    : "極限";

  useLayoutEffect(() => {
    const el = missionPreviewRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setMenuTopPx(el.getBoundingClientRect().top);
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "enter" || event.key === "Enter") {
        event.preventDefault();
        onStart();
      } else if (key === "t") {
        event.preventDefault();
        onOpenStory();
      } else if (key === "g") {
        event.preventDefault();
        onOpenEnemyGrid();
      } else if (key === "c") {
        event.preventDefault();
        onOpenCharacterGrid();
      } else if (key === "l") {
        event.preventDefault();
        onOpenLoadout("weapon");
      } else if (key === "f") {
        event.preventDefault();
        onOpenLoadout("stage");
      } else if (key === "s") {
        event.preventDefault();
        onOpenSettings();
      } else if (event.key === "ArrowLeft") {
        cycleEnemy(-1);
      } else if (event.key === "ArrowRight") {
        cycleEnemy(1);
      } else if (event.key === "[") {
        cycleStage(-1);
      } else if (event.key === "]") {
        cycleStage(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStart, onOpenEnemyGrid, onOpenLoadout, onOpenSettings, onOpenCharacterGrid, onOpenStory]);

  return (
    <main className="homeShell sceneEnter">
      <SceneLoader />
      <HomeBackdropLayer>
        <Canvas
          camera={{ position: [-1.8, 4.6, 7.0], fov: 50 }}
          onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
          dpr={[1, 1.25]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <HomeStage
            accent={character.accentColor}
            stage={stage}
            ringColor={stage.ringColor}
            weatherCode={locationEnabled ? currentWeatherCode : null}
            characterId={selectedCharacterId}
          />
        </Canvas>

        <div className="screenFrame" aria-hidden="true" />
      </HomeBackdropLayer>

      <HomeHudLayer>
        <header className="homeHeader">
          <div className="homeHeaderLeft">
            <GpsToggle />
          </div>
          <div className="homeHeaderActions">
            <AudioToggle />
          </div>
        </header>

        <section className="titleBlock">
          {/* Combined title art (main + subtitle + tagline). The PNG already
              contains all three strings so we don't need separate text
              layers — the alt attr keeps it readable for screen readers. */}
          <img
            className="titleLogoImg"
            src={assetUrl("/images/title-logo.png")}
            alt="ウェザー・バスターズ — CLEAR THE SKY — 荒れた天候を撃ち抜き、空を晴らせ"
          />
        </section>

        <HeroTelemetry ref={telemetryRef} />
        <LeaderLine sourceRef={telemetryRef} anchor="top-center" accent={character.accentColor} lengthFactor={0.5} />
      </HomeHudLayer>

      <HomeMenuLayer>
        <nav
          className="mainMenu"
          aria-label="メインメニュー"
          style={menuTopPx !== null ? { top: `${menuTopPx}px` } : undefined}
        >
          <button className="menuItem" type="button" onClick={onOpenStory}>
            <span className="menuIcon"><StoryIcon /></span>
            <span className="menuLabel">世界レポート</span>
            <span className="menuKey">T</span>
          </button>
          <button className="menuItem" type="button" onClick={onOpenEnemyGrid}>
            <span className="menuIcon"><GridIcon /></span>
            <span className="menuLabel">天候性侵害体図鑑</span>
            <span className="menuKey">G</span>
          </button>
          <button className="menuItem" type="button" onClick={onOpenCharacterGrid}>
            <span className="menuIcon"><CharacterIcon /></span>
            <span className="menuLabel">バスター図鑑</span>
            <span className="menuKey">C</span>
          </button>
          <button className="menuItem" type="button" onClick={() => onOpenLoadout("weapon")}>
            <span className="menuIcon"><LoadoutIcon /></span>
            <span className="menuLabel">ウェポン図鑑</span>
            <span className="menuKey">L</span>
          </button>
          <button className="menuItem" type="button" onClick={() => onOpenLoadout("stage")}>
            <span className="menuIcon"><StageIcon /></span>
            <span className="menuLabel">ステージ図鑑</span>
            <span className="menuKey">F</span>
          </button>
          <button className="menuItem" type="button" onClick={onOpenSettings}>
            <span className="menuIcon"><GearIcon /></span>
            <span className="menuLabel">設定</span>
            <span className="menuKey">S</span>
          </button>

          <blockquote
            ref={bubbleRef}
            className="pilotLog pilotLog--bubble"
            style={{ ["--bubble-accent" as string]: character.accentColor }}
          >
            <span className="pilotLogCallSign" style={{ color: character.accentColor }}>
              {character.callSign} / {character.codename}
            </span>
            <em>「{character.flavor}」</em>
          </blockquote>
        </nav>

        <LeaderLine sourceRef={bubbleRef} anchor="top-right" accent={character.accentColor} extendFraction={2 / 3} />

        <aside ref={missionPreviewRef} className="missionPreview">
        <div className="missionPreviewHeader">
          <span>出撃ブリーフィング</span>
        </div>
        <div className="missionPreviewBody">
        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前のバスター" onClick={() => cycleCharacter(-1)}>◀</button>
          <button type="button" className="cyclerLabel cyclerDetailButton" onClick={() => onOpenLoadout("character")}>
            <small>バスター</small>
            <strong>{character.codename}</strong>
            <em>{character.callSign}</em>
          </button>
          <button type="button" className="cyclerArrow" aria-label="次のバスター" onClick={() => cycleCharacter(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前のウェポン" onClick={() => cycleWeapon(-1)}>◀</button>
          <button type="button" className="cyclerLabel cyclerDetailButton" onClick={() => onOpenLoadout("weapon")}>
            <small>ウェポン</small>
            <strong>{weapon.name}</strong>
            <em className="weaponDamageRow">
              <span>攻撃力 {weapon.damage}</span>
              {weapon.specialtyAgainst.includes(selectedEnemy.id) ? (
                <b className="weaponSpecialtyBadge">×{weapon.specialtyMultiplier.toFixed(2)} 弱点特効</b>
              ) : null}
            </em>
          </button>
          <button type="button" className="cyclerArrow" aria-label="次のウェポン" onClick={() => cycleWeapon(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前のステージ" onClick={() => cycleStage(-1)}>◀</button>
          <div className="cyclerLabel">
            <small>ステージ</small>
            <strong className="stageNameRow">
              <span>{stage.name}</span>
              <button type="button" className="stageDetailLink" onClick={() => onOpenLoadout("stage")}>詳細</button>
            </strong>
          </div>
          <button type="button" className="cyclerArrow" aria-label="次のステージ" onClick={() => cycleStage(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の敵" onClick={() => cycleEnemy(-1)}>◀</button>
          <div className="cyclerLabel cyclerEnemy">
            <small>天候性侵害体</small>
            <strong>
              <span className="enemyMiniIcon" style={{ color: selectedEnemy.accentColor }}>{selectedEnemy.icon}</span>
              {selectedEnemy.name}
            </strong>
            <em>{selectedEnemy.trait}</em>
          </div>
          <button type="button" className="cyclerArrow" aria-label="次の敵" onClick={() => cycleEnemy(1)}>▶</button>
        </div>

        <span className="threatLabel">脅威レベル</span>
        <div className="threatLine" role="img" aria-label={`脅威レベル ${selectedEnemy.threat}`}>
          {Array.from({ length: 9 }, (_, index) => (
            <b key={index} className={index < selectedEnemy.threat ? "filled" : ""}>
              {index < selectedEnemy.threat ? "▲" : ""}
            </b>
          ))}
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="難易度を下げる" onClick={() => cycleDifficulty(-1)} disabled={selectedDifficulty <= 1}>◀</button>
          <div className="cyclerLabel">
            <small>難易度</small>
            <strong>{difficultyName}</strong>
            <em>レベル {selectedDifficulty}</em>
          </div>
          <button type="button" className="cyclerArrow" aria-label="難易度を上げる" onClick={() => cycleDifficulty(1)} disabled={selectedDifficulty >= 5}>▶</button>
        </div>

        <div
          className={`difficultyLine difficulty--${selectedDifficulty}`}
          role="img"
          aria-label={`難易度 ${selectedDifficulty} / 5`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <b key={index} className={index < selectedDifficulty ? "filled" : ""}>
              {index < selectedDifficulty ? "■" : ""}
            </b>
          ))}
        </div>

        <button type="button" className="primaryMenuButton missionStartButton" onClick={onStart}>
          <span className="missionStartLabel">ゲーム開始</span>
          <span className="missionStartHint">Enter</span>
        </button>
        </div>
        </aside>
      </HomeMenuLayer>

    </main>
  );
}
