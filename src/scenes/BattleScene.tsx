import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh, PerspectiveCamera, PointLight } from "three";
import { Color, Vector3 } from "three";
import { BulletTrails } from "../entities/BulletTrails";
import { EnemyFigure } from "../entities/EnemyFigure";
import { LightningWarnings } from "../entities/LightningWarnings";
import { StageTerrain } from "../entities/StageTerrain";
import { BattleHud } from "../features/hud/BattleHud";
import { PlayerController } from "../features/player/PlayerController";
import { difficultyModifiers, findCharacter, stages, weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { Stage, WeatherEnemy, WeatherEnemyId } from "../game/types";

function PlayerWeapon() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const flashLightRef = useRef<PointLight>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const cameraMode = useBattleStore((state) => state.cameraMode);

  useEffect(() => {
    if (lastShotAt === 0) {
      return;
    }
    setFlashVisible(true);
    const id = window.setTimeout(() => setFlashVisible(false), 80);
    return () => window.clearTimeout(id);
  }, [lastShotAt]);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    node.translateX(0.34);
    node.translateY(-0.3);
    node.translateZ(-0.5);
  });

  if (cameraMode === "tps") {
    return null;
  }

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.14, 0.5]} />
        <meshStandardMaterial color="#152330" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.06, -0.18]}>
        <boxGeometry args={[0.12, 0.08, 0.16]} />
        <meshStandardMaterial color="#0e1a25" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.07, -0.05]}>
        <boxGeometry args={[0.1, 0.06, 0.2]} />
        <meshStandardMaterial color="#1f2f3d" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.34]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 16]} />
        <meshStandardMaterial color="#0c151c" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.06, 0.04, -0.05]}>
        <boxGeometry args={[0.02, 0.02, 0.18]} />
        <meshStandardMaterial color="#27d9ff" emissive="#27d9ff" emissiveIntensity={1.3} />
      </mesh>
      {flashVisible ? (
        <>
          <mesh ref={flashRef} position={[0, 0, -0.55]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#fff7a0" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <pointLight ref={flashLightRef} position={[0, 0, -0.5]} intensity={6} color="#fff7a0" distance={4} />
        </>
      ) : null}
    </group>
  );
}

function PlayerBackAvatar() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const cameraMode = useBattleStore((state) => state.cameraMode);
  const character = findCharacter(selectedCharacterId);

  useFrame(() => {
    const node = groupRef.current;
    if (!node || cameraMode !== "tps") {
      return;
    }
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    node.translateY(-1.05);
    node.translateZ(-1.75);
  });

  if (cameraMode !== "tps") {
    return null;
  }

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.38, 0.34, 0.34]} />
        <meshStandardMaterial color="#1c2a35" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.82, 0.72, 0.58]} />
        <meshStandardMaterial color="#344d5c" metalness={0.55} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.24, 0.34]}>
        <boxGeometry args={[0.6, 0.48, 0.14]} />
        <meshStandardMaterial color="#122532" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[-0.22, 0.14, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.24, 14]} />
        <meshStandardMaterial color={character.accentColor} emissive={character.accentColor} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <mesh position={[0.22, 0.14, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.24, 14]} />
        <meshStandardMaterial color={character.accentColor} emissive={character.accentColor} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <mesh position={[-0.58, 0.2, 0.02]}>
        <boxGeometry args={[0.2, 0.62, 0.22]} />
        <meshStandardMaterial color="#1f3441" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[0.58, 0.2, 0.02]}>
        <boxGeometry args={[0.2, 0.62, 0.22]} />
        <meshStandardMaterial color="#1f3441" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[-0.24, -0.48, 0.02]}>
        <boxGeometry args={[0.26, 0.72, 0.3]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.24, -0.48, 0.02]}>
        <boxGeometry args={[0.26, 0.72, 0.3]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
    </group>
  );
}

function FovController() {
  const { camera } = useThree();
  const fov = useBattleStore((state) => state.fov);
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
  }, [camera, fov]);
  return null;
}

function LightningBolt({
  origin,
  target,
  color,
}: {
  origin: [number, number, number];
  target: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const segments = useMemo(() => {
    const dx = target[0] - origin[0];
    const dy = target[1] - origin[1];
    const dz = target[2] - origin[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { length, dx, dy, dz };
  }, [origin, target]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.6 + Math.abs(Math.sin(t * 18)) * 0.7;
    if (meshRef.current) {
      const material = meshRef.current.material as { emissiveIntensity?: number };
      material.emissiveIntensity = 1.2 + flicker * 1.8;
      meshRef.current.scale.x = 0.85 + Math.sin(t * 22) * 0.18;
      meshRef.current.scale.z = 0.85 + Math.cos(t * 19) * 0.18;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + flicker * 4.5;
    }
  });

  const midX = (origin[0] + target[0]) / 2;
  const midY = (origin[1] + target[1]) / 2;
  const midZ = (origin[2] + target[2]) / 2;
  const angle = Math.atan2(segments.dx, segments.dy);

  return (
    <group>
      <mesh ref={meshRef} position={[midX, midY, midZ]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[0.1, segments.length, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[midX, midY, midZ]} color={color} distance={6} />
    </group>
  );
}

function ThunderstormStrikes() {
  const groupRef = useRef<Group>(null);
  const startedAtRef = useRef(performance.now());

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    const visibleFor = 3.4;
    const fadeFor = 1.8;
    const total = visibleFor + fadeFor;
    if (elapsed > total) {
      node.visible = false;
      return;
    }
    node.visible = true;
    const opacity = elapsed < visibleFor ? 1 : 1 - (elapsed - visibleFor) / fadeFor;
    node.traverse((child) => {
      const mat = (child as { material?: { opacity?: number; transparent?: boolean; emissiveIntensity?: number } }).material;
      if (mat && mat.opacity !== undefined) {
        mat.transparent = true;
        mat.opacity = opacity;
      }
      if (mat && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = mat.emissiveIntensity * opacity + 0.001;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <LightningBolt origin={[0.2, 4.6, -5.2]} target={[-0.4, 0.1, -4.2]} color="#fff7a8" />
      <LightningBolt origin={[-1.4, 5.1, -5.0]} target={[-2.6, 0.1, -4.0]} color="#ffd84d" />
      <LightningBolt origin={[1.6, 5.4, -5.4]} target={[2.4, 0.1, -3.8]} color="#ffe16a" />
      <LightningBolt origin={[-0.7, 4.1, -5.1]} target={[-1.3, 1.4, -4.4]} color="#ffe88a" />
      <LightningBolt origin={[0.9, 4.2, -5.1]} target={[1.5, 1.5, -4.4]} color="#ffe88a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -4]}>
        <ringGeometry args={[1.4, 2.8, 64]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.6} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RainStreaks({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const streaks = useMemo(() => {
    return Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: Math.random() * 8 + 1,
      z: (Math.random() - 0.5) * 18 - 4,
      speed: 6 + Math.random() * 4,
    }));
  }, []);

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= streaks[i].speed * delta;
      if (child.position.y < 0) {
        child.position.y = 9;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {streaks.map((streak, index) => (
        <mesh key={index} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.02, 0.45, 0.02]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function SnowDrift({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const flakes = useMemo(() => {
    return Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 26,
      y: Math.random() * 9,
      z: (Math.random() - 0.5) * 18 - 4,
      speed: 0.6 + Math.random() * 0.8,
      sway: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= flakes[i].speed * delta;
      child.position.x += Math.sin(t * 1.1 + flakes[i].sway) * delta * 0.4;
      if (child.position.y < 0) {
        child.position.y = 9;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {flakes.map((flake, index) => (
        <mesh key={index} position={[flake.x, flake.y, flake.z]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

type AiPhase = "approach" | "circle" | "telegraph" | "retreat" | "idle";

const STANDOFF_DISTANCE = 7.5;
const MIN_DISTANCE = 5.5;

function EnemyMotion({
  enemy,
  enemyRef,
  enemyPositionRef,
  baseZ,
  arenaX,
}: {
  enemy: WeatherEnemy;
  enemyRef: React.RefObject<Group | null>;
  enemyPositionRef: React.RefObject<Vector3>;
  baseZ: number;
  arenaX: number;
}) {
  const { camera } = useThree();
  const status = useBattleStore((state) => state.status);
  const phaseRef = useRef<{ mode: AiPhase; t: number; orbitDir: 1 | -1; angle: number }>({
    mode: "approach",
    t: 0,
    orbitDir: 1,
    angle: 0,
  });

  useFrame((state, delta) => {
    const node = enemyRef.current;
    if (!node) {
      return;
    }
    const baseY = 2.6;
    const idleY = baseY + Math.sin(state.clock.getElapsedTime() * 1.1) * 0.18;
    if (status !== "battle") {
      node.position.set(0, idleY, baseZ);
      node.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.25;
      enemyPositionRef.current.copy(node.position);
      return;
    }

    const aggression = difficultyModifiers[enemy.difficulty].movementAggression;
    const phase = phaseRef.current;
    phase.t += delta;
    const playerX = camera.position.x;
    const playerZ = camera.position.z;

    const phaseDurations: Record<AiPhase, number> = {
      approach: 1.6 - aggression * 0.4,
      circle: 2.6 + aggression * 0.6,
      telegraph: 0.55,
      retreat: 1.1 - aggression * 0.2,
      idle: 1.2 + Math.random() * 0.8,
    };

    if (phase.t > phaseDurations[phase.mode]) {
      phase.t = 0;
      const sluggishChance = enemy.id === "cloudy" ? 0.32 : enemy.id === "rainySeason" ? 0.26 : 0.18;
      const willIdle = phase.mode !== "idle" && Math.random() < sluggishChance;
      if (willIdle) {
        phase.mode = "idle";
      } else {
        const next: Record<AiPhase, AiPhase> = {
          approach: "circle",
          circle: Math.random() < 0.5 ? "telegraph" : "retreat",
          telegraph: Math.random() < 0.4 ? "retreat" : "circle",
          retreat: "approach",
          idle: "approach",
        };
        phase.mode = next[phase.mode];
      }
      if (phase.mode === "circle") {
        phase.orbitDir = Math.random() < 0.5 ? 1 : -1;
      }
    }

    const orbitRadius = enemy.id === "tornado" || enemy.id === "blizzard" ? 6.6 + aggression * 1.2
      : enemy.id === "typhoon" ? 7.4 + aggression * 1.4
      : enemy.id === "cloudy" ? 6.2
      : 7.2 + aggression * 0.9;

    let targetX = 0;
    let targetZ = baseZ;

    if (phase.mode === "approach") {
      const k = Math.min(1, phase.t / phaseDurations.approach);
      const dxFromPlayer = node.position.x - playerX;
      const dzFromPlayer = node.position.z - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      const desiredX = playerX + (dxFromPlayer / dist) * STANDOFF_DISTANCE;
      const desiredZ = playerZ + (dzFromPlayer / dist) * STANDOFF_DISTANCE;
      targetX = desiredX * k;
      targetZ = desiredZ * k + baseZ * (1 - k);
    } else if (phase.mode === "circle") {
      phase.angle += delta * (0.7 + aggression * 0.6) * phase.orbitDir;
      targetX = playerX + Math.cos(phase.angle) * orbitRadius;
      targetZ = playerZ + Math.sin(phase.angle) * orbitRadius;
    } else if (phase.mode === "telegraph") {
      const dx = playerX - node.position.x;
      const dz = playerZ - node.position.z;
      const dist = Math.max(Math.sqrt(dx * dx + dz * dz), 0.001);
      const lean = 0.5;
      targetX = node.position.x + (dx / dist) * lean;
      targetZ = node.position.z + (dz / dist) * lean;
    } else if (phase.mode === "idle") {
      targetX = node.position.x + Math.sin(state.clock.getElapsedTime() * 0.8) * 0.18;
      targetZ = node.position.z + Math.cos(state.clock.getElapsedTime() * 0.65) * 0.14;
    } else {
      const k = Math.min(1, phase.t / phaseDurations.retreat);
      const dxFromPlayer = node.position.x - playerX;
      const dzFromPlayer = node.position.z - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      targetX = playerX + (dxFromPlayer / dist) * (orbitRadius + 2.4) * k + node.position.x * (1 - k);
      targetZ = playerZ + (dzFromPlayer / dist) * (orbitRadius + 2.4) * k + baseZ * (1 - k);
    }

    targetX += Math.sin(state.clock.getElapsedTime() * 1.3 + enemy.difficulty) * 0.3;
    targetZ += Math.cos(state.clock.getElapsedTime() * 1.1 + enemy.difficulty * 0.7) * 0.25;

    const dxClamp = targetX - playerX;
    const dzClamp = targetZ - playerZ;
    const distClamp = Math.sqrt(dxClamp * dxClamp + dzClamp * dzClamp);
    if (distClamp < MIN_DISTANCE && distClamp > 0.001) {
      targetX = playerX + (dxClamp / distClamp) * MIN_DISTANCE;
      targetZ = playerZ + (dzClamp / distClamp) * MIN_DISTANCE;
    }

    targetX = Math.max(-arenaX + 1, Math.min(arenaX - 1, targetX));
    targetZ = Math.max(baseZ * 1.8, Math.min(baseZ * 0.1 + 5, targetZ));

    const lerpRate = phase.mode === "idle" ? 0.4 : (0.9 + aggression * 0.7);
    const factor = 1 - Math.exp(-lerpRate * delta);
    node.position.x += (targetX - node.position.x) * factor;
    node.position.z += (targetZ - node.position.z) * factor;

    const t = state.clock.getElapsedTime();
    const verticalAmpBase = enemy.id === "tornado" || enemy.id === "typhoon"
      ? 1.2 + aggression * 0.5
      : enemy.id === "thunderstorm" ? 0.9
      : 0.6 + aggression * 0.3;
    const verticalAmp = phase.mode === "idle" ? verticalAmpBase * 0.35 : verticalAmpBase;
    const verticalFreq = phase.mode === "idle" ? 0.7 : (1.2 + aggression * 0.4);
    const verticalBase = baseY + (phase.mode === "telegraph" ? -0.6 : 0);
    node.position.y = verticalBase + Math.sin(t * verticalFreq) * verticalAmp + Math.sin(t * verticalFreq * 1.9) * 0.18;

    const dxFace = playerX - node.position.x;
    const dzFace = playerZ - node.position.z;
    const facing = Math.atan2(dxFace, dzFace);
    if (enemy.id === "tornado" || enemy.id === "typhoon") {
      node.rotation.y = t * (1.6 + aggression * 0.6);
    } else if (phase.mode === "telegraph") {
      node.rotation.y = facing;
    } else {
      const lerpY = 1 - Math.exp(-3 * delta);
      const current = node.rotation.y;
      let diff = facing - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      node.rotation.y = current + diff * lerpY;
    }

    enemyPositionRef.current.copy(node.position);
  });
  return null;
}

function ExperimentField({
  enemyId,
  stage,
  isClear,
  enemyRef,
  enemyPositionRef,
}: {
  enemyId: WeatherEnemyId;
  stage: Stage;
  isClear: boolean;
  enemyRef: React.RefObject<Group | null>;
  enemyPositionRef: React.RefObject<Vector3>;
}) {
  const enemy = weatherEnemies.find((candidate) => candidate.id === enemyId) ?? weatherEnemies[0];
  const ambientColor = useMemo(() => new Color(stage.ambientColor).multiplyScalar(0.7), [stage.ambientColor]);
  const fogFar = stage.id === "lab" ? 28 : stage.id === "ruins" ? 44 : 52;
  const baseZ = stage.id === "lab" ? -5.2 : stage.id === "ruins" ? -8 : -10;

  return (
    <>
      <color attach="background" args={[isClear ? "#7dc7ed" : stage.fogColor]} />
      {isClear ? (
        <Sky sunPosition={[2, 1, 3]} turbidity={3} rayleigh={0.9} />
      ) : (
        <Sky
          sunPosition={[2, 0.4, 1.6]}
          turbidity={stage.skyTurbidity}
          rayleigh={stage.skyRayleigh}
          mieCoefficient={0.04}
        />
      )}
      <Stars radius={80} depth={35} count={1000} factor={4} saturation={0} fade />
      <ambientLight intensity={isClear ? 1.25 : 0.42} color={ambientColor} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={isClear ? 3.2 : 1.6}
        color={isClear ? "#ffffff" : stage.ringColor}
      />
      <pointLight position={[0, 1.4, -3]} intensity={3} color={enemy.coreColor} />
      <fog attach="fog" args={[isClear ? "#c8ecff" : stage.fogColor, 8, fogFar]} />

      <StageTerrain stage={stage} isClear={isClear} />

      <group ref={enemyRef} position={[0, 2.6, baseZ]} scale={1.55}>
        <EnemyFigure enemy={enemy} clear={isClear} />
      </group>
      <EnemyMotion
        enemy={enemy}
        enemyRef={enemyRef}
        enemyPositionRef={enemyPositionRef}
        baseZ={baseZ}
        arenaX={stage.arena.x}
      />

      {!isClear && enemy.id === "thunderstorm" ? <ThunderstormStrikes /> : null}
      {!isClear && (enemy.id === "heavyRain" || enemy.id === "rainySeason" || enemy.id === "typhoon")
        ? <RainStreaks color={enemy.accentColor} />
        : null}
      {!isClear && enemy.id === "blizzard"
        ? <SnowDrift color="#dff8ff" />
        : null}

      <LightningWarnings />
      <BulletTrails />
      <PlayerWeapon />
      <PlayerBackAvatar />
    </>
  );
}

export function BattleScene({
  onBack,
  onOpenEnemyGrid,
  onShowResult,
}: {
  onBack: () => void;
  onOpenEnemyGrid: () => void;
  onShowResult: () => void;
}) {
  const enemyGroupRef = useRef<Group>(null);
  const enemyPositionRef = useRef(new Vector3(0, 2.3, -5.2));
  const status = useBattleStore((state) => state.status);
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const initialFov = useBattleStore.getState().fov;
  const stage = useMemo(() => stages.find((s) => s.id === selectedStageId) ?? stages[0], [selectedStageId]);
  const isClear = status === "clear";

  return (
    <main className="gameShell sceneEnter">
      <Canvas camera={{ position: [0, 2.15, 7.1], fov: initialFov }}>
        <FovController />
        <ExperimentField
          enemyId={selectedEnemyId}
          stage={stage}
          isClear={isClear}
          enemyRef={enemyGroupRef}
          enemyPositionRef={enemyPositionRef}
        />
        <PlayerController enemyRef={enemyGroupRef} enemyPositionRef={enemyPositionRef} />
      </Canvas>

      <BattleHud onBack={onBack} onOpenEnemyGrid={onOpenEnemyGrid} onShowResult={onShowResult} />
    </main>
  );
}
