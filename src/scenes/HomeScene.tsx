import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh } from "three";
import { LoopOnce } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useBattleStore } from "../game/battleStore";
import { characters, findCharacter, findStage, findWeapon, stages, weapons, weatherEnemies } from "../game/data";
import { useGeolocationWeather, weatherCodeLabel } from "../features/weather/useGeolocationWeather";
import type { CharacterId, DifficultyLevel, LoadoutTab } from "../game/types";
import { CHARACTER_MODEL_URL } from "../entities/CharacterModel";
import { fitObjectToHeight, tintCharacterMaterials } from "../entities/fitObject";
import { AudioToggle } from "../features/audio/AudioToggle";

function StartIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="6,4 28,16 6,28" fill="currentColor" opacity="0.92" />
      <polygon points="6,4 28,16 6,28" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
    </svg>
  );
}

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

function GpsToggle() {
  const enabled = useBattleStore((state) => state.locationEnabled);
  const setEnabled = useBattleStore((state) => state.setLocationEnabled);
  const code = useBattleStore((state) => state.currentWeatherCode);
  const enemyId = useBattleStore((state) => state.currentWeatherEnemyId);
  const label = enabled ? (code === null ? "計測中" : weatherCodeLabel(code)) : "OFF";

  return (
    <button
      type="button"
      className={`gpsToggle ${enabled ? "on" : ""}`}
      aria-pressed={enabled}
      onClick={() => setEnabled(!enabled)}
    >
      <span className="gpsDot" />
      <small>GPS</small>
      <em>{label}</em>
      {enabled && enemyId ? <b className="gpsEnemyHint">出撃候補</b> : null}
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

const SATELLITE_DISH_URL = "/models/space-kit/satelliteDish_large.glb";

function SatelliteDish() {
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
    <group ref={dishRef} position={[6.6, 0, -3.2]} scale={1.6}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(SATELLITE_DISH_URL);

const TOWER_BASE_URL = "/models/tower-defense-kit/tower-round-base.glb";
const TOWER_BODY_URL = "/models/tower-defense-kit/tower-round-build-c.glb";
const TOWER_TOP_URL = "/models/tower-defense-kit/tower-round-top-a.glb";

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

function FloorGrid({ ringColor }: { ringColor: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#0a141c" metalness={0.32} roughness={0.5} />
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
  "/models/space-kit/hangar_smallA.glb",
  "/models/space-kit/hangar_smallB.glb",
  "/models/space-kit/hangar_roundA.glb",
  "/models/space-kit/hangar_roundB.glb",
  "/models/space-kit/structure.glb",
  "/models/space-kit/structure_detailed.glb",
];

// 中央付近のハンガーは「コンテナのような塊」に見えるので除外。両端のみに配置
const BACKDROP_PLACEMENTS: Array<{ x: number; z: number; rotY: number; scale: number; idx: number }> = [
  { x: -10.5, z: -6.0, rotY: 0.4, scale: 2.2, idx: 0 },
  { x: -7.6, z: -7.4, rotY: -0.3, scale: 2.0, idx: 4 },
  { x: 7.6, z: -7.4, rotY: -0.5, scale: 2.0, idx: 5 },
  { x: 10.5, z: -6.0, rotY: 0.2, scale: 2.2, idx: 1 },
];

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
  ringColor,
  weatherCode,
  characterId,
}: {
  accent: string;
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
        <FloorGrid ringColor={ringColor} />
        <SatelliteDish />
        <WarningTower position={[-7, 0, -3.5]} />
        <WarningTower position={[-3.6, 0, -5.6]} />
        <WarningTower position={[3.4, 0, -6.2]} />
        <WarningTower position={[6.6, 0, -3.4]} />
        <BackdropStructures />
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
  const [isMissionCollapsed, setMissionCollapsed] = useState(false);

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
    ? "EASY"
    : selectedDifficulty === 2
    ? "NORMAL"
    : selectedDifficulty === 3
    ? "TOUGH"
    : selectedDifficulty === 4
    ? "HARD"
    : "EXTREME";

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
      <Canvas
        camera={{ position: [-1.8, 2.2, 6.5], fov: 54 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <HomeStage
          accent={character.accentColor}
          ringColor={stage.ringColor}
          weatherCode={locationEnabled ? currentWeatherCode : null}
          characterId={selectedCharacterId}
        />
      </Canvas>

      <div className="screenFrame" aria-hidden="true" />
      <header className="homeHeader">
        <div className="homeHeaderLeft">
          <GpsToggle />
        </div>
        <div className="homeHeaderActions">
          <AudioToggle />
        </div>
      </header>

      <section className="titleBlock">
        <h1>ウェザーバスター</h1>
        <strong>CLEAR THE SKY</strong>
        <span>荒れた天候を撃ち抜き、空を晴らせ</span>
      </section>

      <nav className="mainMenu" aria-label="メインメニュー">
        <button className="primaryMenuButton menuItem" type="button" onClick={onStart}>
          <span className="menuIcon"><StartIcon /></span>
          <span className="menuLabel">ゲーム開始</span>
          <span className="menuKey">Enter</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenStory}>
          <span className="menuIcon"><StoryIcon /></span>
          <span className="menuLabel">ストーリー</span>
          <span className="menuKey">T</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenEnemyGrid}>
          <span className="menuIcon"><GridIcon /></span>
          <span className="menuLabel">気象モンスター図鑑</span>
          <span className="menuKey">G</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenCharacterGrid}>
          <span className="menuIcon"><CharacterIcon /></span>
          <span className="menuLabel">キャラ図鑑</span>
          <span className="menuKey">C</span>
        </button>
        <button className="menuItem" type="button" onClick={() => onOpenLoadout("weapon")}>
          <span className="menuIcon"><LoadoutIcon /></span>
          <span className="menuLabel">装備図鑑</span>
          <span className="menuKey">L</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenSettings}>
          <span className="menuIcon"><GearIcon /></span>
          <span className="menuLabel">設定</span>
          <span className="menuKey">S</span>
        </button>
      </nav>

      <aside className={`missionPreview ${isMissionCollapsed ? "collapsed" : ""}`}>
        <div className="missionPreviewHeader">
          <span>MISSION PREVIEW</span>
          <button
            type="button"
            className="missionCollapseButton"
            aria-label={isMissionCollapsed ? "ミッションプレビューを開く" : "ミッションプレビューを折りたたむ"}
            aria-expanded={!isMissionCollapsed}
            onClick={() => setMissionCollapsed((value) => !value)}
          >
            {isMissionCollapsed ? "▴" : "▾"}
          </button>
        </div>
        <div className="missionPreviewBody">
        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前のパイロット" onClick={() => cycleCharacter(-1)}>◀</button>
          <button type="button" className="cyclerLabel cyclerDetailButton" onClick={() => onOpenLoadout("character")}>
            <small>PILOT</small>
            <strong>{character.codename}</strong>
            <em>{character.callSign}</em>
          </button>
          <button type="button" className="cyclerArrow" aria-label="次のパイロット" onClick={() => cycleCharacter(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の武器" onClick={() => cycleWeapon(-1)}>◀</button>
          <button type="button" className="cyclerLabel cyclerDetailButton" onClick={() => onOpenLoadout("weapon")}>
            <small>WEAPON</small>
            <strong>{weapon.name}</strong>
            <em>DMG {weapon.damage}</em>
            {weapon.specialtyAgainst.includes(selectedEnemy.id) ? (
              <b className="weaponSpecialtyBadge">×{weapon.specialtyMultiplier.toFixed(2)} 弱点特効</b>
            ) : null}
          </button>
          <button type="button" className="cyclerArrow" aria-label="次の武器" onClick={() => cycleWeapon(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の戦域" onClick={() => cycleStage(-1)}>◀</button>
          <div className="cyclerLabel">
            <small>戦域</small>
            <strong>{stage.name}</strong>
            <button type="button" className="stageDetailLink" onClick={() => onOpenLoadout("stage")}>DETAIL</button>
          </div>
          <button type="button" className="cyclerArrow" aria-label="次の戦域" onClick={() => cycleStage(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の敵" onClick={() => cycleEnemy(-1)}>◀</button>
          <div className="cyclerLabel cyclerEnemy">
            <small>敵</small>
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
            <em>LEVEL {selectedDifficulty}</em>
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
          <em className="difficultyTag">{difficultyName}</em>
        </div>

        <button type="button" className="primaryMenuButton missionStartButton" onClick={onStart}>ゲーム開始</button>
        </div>
      </aside>

      <blockquote className="pilotLog">
        <span className="pilotLogCallSign" style={{ color: character.accentColor }}>{character.callSign} / {character.codename}</span>
        <em>{character.flavor}</em>
      </blockquote>

      <SeedCounter />
    </main>
  );
}

function SeedCounter() {
  const seedCount = useBattleStore((state) => state.seedCount);
  const seedHistory = useBattleStore((state) => state.seedHistory);
  const recent = seedHistory.slice(0, 4);
  return (
    <aside className="seedCounter" aria-label="晴天の種子">
      <span className="seedLabel">晴天の種子</span>
      <strong className="seedValue">{seedCount}</strong>
      <small className="seedSub">{seedHistory.length} 件の戦闘記録</small>
      {recent.length > 0 ? (
        <ul className="seedRecent" aria-label="最近の戦闘記録">
          {recent.map((entry, idx) => {
            const enemy = weatherEnemies.find((e) => e.id === entry.enemyId);
            const enemyName = enemy?.name ?? entry.enemyId;
            return (
              <li key={`${entry.at}-${idx}`}>
                <span className={`seedRank seedRank--${entry.rank.toLowerCase()}`}>{entry.rank}</span>
                <span className="seedEnemy">{enemyName}</span>
                <em>LV {entry.difficulty}</em>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
