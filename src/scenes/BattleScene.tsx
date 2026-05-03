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
  return (
    <group>
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

function EnemyMotion({
  enemy,
  enemyRef,
  enemyPositionRef,
  baseZ,
}: {
  enemy: WeatherEnemy;
  enemyRef: React.RefObject<Group | null>;
  enemyPositionRef: React.RefObject<Vector3>;
  baseZ: number;
}) {
  const status = useBattleStore((state) => state.status);
  useFrame(({ clock }) => {
    const node = enemyRef.current;
    if (!node) {
      return;
    }
    const baseY = 2.3;
    if (status !== "battle") {
      node.position.set(0, baseY, baseZ);
      enemyPositionRef.current.copy(node.position);
      return;
    }
    const aggression = difficultyModifiers[enemy.difficulty].movementAggression;
    const t = clock.getElapsedTime();
    const ax = enemy.id === "tornado" ? 4.4 : enemy.id === "typhoon" ? 5.6 : enemy.id === "blizzard" ? 5 : enemy.id === "cloudy" ? 1.4 : 3.2;
    const az = enemy.id === "tornado" ? 1.6 : enemy.id === "typhoon" ? 2.8 : 1.2;
    const speed = 0.55 + aggression * 0.55;
    const x = Math.sin(t * speed) * ax + Math.sin(t * speed * 1.7) * 0.6;
    const z = baseZ + Math.cos(t * speed * 0.78) * az;
    const y = baseY + Math.sin(t * (1.1 + aggression * 0.4)) * 0.4;
    node.position.set(x, y, z);
    if (enemy.id === "tornado" || enemy.id === "typhoon") {
      node.rotation.y = t * (1.4 + aggression * 0.6);
    } else {
      node.rotation.y = Math.sin(t * 0.4) * 0.3;
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

      <group ref={enemyRef} position={[0, 2.3, baseZ]} scale={1.55}>
        <EnemyFigure enemy={enemy} clear={isClear} />
      </group>
      <EnemyMotion enemy={enemy} enemyRef={enemyRef} enemyPositionRef={enemyPositionRef} baseZ={baseZ} />

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
