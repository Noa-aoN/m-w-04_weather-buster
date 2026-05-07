import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group, PerspectiveCamera } from "three";
import { Color, Euler, Vector3 } from "three";
import { BulletTrails } from "../entities/BulletTrails";
import { EnemyFigure } from "../entities/EnemyFigure";
import { EnemyMotion, ENEMY_SCALE } from "../entities/EnemyAi";
import { BossShatterBurst } from "../entities/BossShatterBurst";
import { LightningWarnings } from "../entities/LightningWarnings";
import { MinionField } from "../entities/MinionField";
import { MinionSpawnBurst } from "../entities/MinionSpawnBurst";
import { FovController, PlayerBackAvatar, PlayerShield, PlayerWeapon } from "../entities/PlayerView";
import { StageTerrain } from "../entities/StageTerrain";
import { RainStreaks, SnowDrift, ThunderstormStrikes } from "../entities/WeatherFx";
import { BattleHud } from "../features/hud/BattleHud";
import { PlayerController } from "../features/player/PlayerController";
import { stages, weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { Stage, WeatherEnemyId } from "../game/types";

// On clear, ease the camera pitch upward toward the sky over ~1.8s and ramp
// FOV slightly wider for an "opening up" feel. The existing screen-overlay
// ClearSkyBurst keeps doing its flash + shockwave + rays in CSS.
function ClearSkyCameraPan() {
  const { camera } = useThree();
  const status = useBattleStore((state) => state.status);
  const startedAt = useRef<number | null>(null);
  const initialEuler = useRef<Euler | null>(null);
  const initialFov = useRef<number | null>(null);

  useEffect(() => {
    if (status === "clear") {
      startedAt.current = performance.now();
      initialEuler.current = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
      const persp = camera as PerspectiveCamera;
      initialFov.current = persp.isPerspectiveCamera ? persp.fov : null;
    } else {
      startedAt.current = null;
      initialEuler.current = null;
      initialFov.current = null;
    }
  }, [status, camera]);

  useFrame(() => {
    if (startedAt.current === null || !initialEuler.current) {
      return;
    }
    const t = (performance.now() - startedAt.current) / 3600;
    const k = Math.min(1, Math.max(0, t));
    const eased = 1 - Math.pow(1 - k, 3);
    const initial = initialEuler.current;
    const targetPitch = Math.PI * 0.32; // ~58° upward
    const newPitch = initial.x + (targetPitch - initial.x) * eased;
    const tmp = new Euler(newPitch, initial.y, initial.z, "YXZ");
    camera.quaternion.setFromEuler(tmp);
    if (initialFov.current !== null) {
      const persp = camera as PerspectiveCamera;
      if (persp.isPerspectiveCamera) {
        persp.fov = initialFov.current + eased * 6;
        persp.updateProjectionMatrix();
      }
    }
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
  const selectedDifficulty = useBattleStore((state) => state.selectedDifficulty);
  const ambientColor = useMemo(() => new Color(stage.ambientColor).multiplyScalar(0.7), [stage.ambientColor]);
  const fogFar = stage.id === "lab" ? 28 : stage.id === "ruins" ? 44 : 52;
  // Initial spawn pushed further back so the boss intro reads as a distant
  // threat that closes in, not something already in your face.
  const baseZ = stage.id === "lab" ? -12 : stage.id === "ruins" ? -16 : -20;

  return (
    <>
      <color attach="background" args={[isClear ? "#cdebff" : stage.fogColor]} />
      {isClear ? (
        <Sky sunPosition={[2, 1.6, 3]} turbidity={1.4} rayleigh={0.55} mieCoefficient={0.008} />
      ) : (
        <Sky
          sunPosition={[2, 0.4, 1.6]}
          turbidity={stage.skyTurbidity}
          rayleigh={stage.skyRayleigh}
          mieCoefficient={0.04}
        />
      )}
      <Stars radius={80} depth={35} count={1000} factor={4} saturation={0} fade />
      <ambientLight intensity={isClear ? 2.4 : 0.65} color={isClear ? "#ffffff" : ambientColor} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={isClear ? 5.6 : 1.85}
        color={isClear ? "#fffae0" : stage.ringColor}
      />
      <hemisphereLight args={[isClear ? "#fffbe8" : "#bdeeff", isClear ? "#cce8ff" : "#1c2a36", isClear ? 1.1 : 0.55]} />
      <pointLight position={[0, 1.4, -3]} intensity={isClear ? 0.6 : 3.2} color={isClear ? "#fffbe8" : enemy.coreColor} />
      <fog attach="fog" args={[isClear ? "#eaf6ff" : stage.fogColor, isClear ? 18 : 8, isClear ? fogFar + 28 : fogFar]} />

      {/* Suspense isolation: while a stage GLTF / texture / character FBX is
          loading, only this subtree renders null. The Canvas-level default
          Suspense would otherwise unmount the entire tree (including
          PointerLockControls), which is what caused "switch to Hal/Saka →
          guns can't fire" and "countdown → instant pause". */}
      <Suspense fallback={null}>
        <StageTerrain stage={stage} isClear={isClear} />
      </Suspense>

      {/* Suspense isolation around EnemyFigure: rex GLBs are 9-19MB after
          optimization (much larger before). Without this boundary the
          Canvas-default Suspense unmounts the whole scene → pitch-black
          battle screen during the few seconds the GLB loads. */}
      <group ref={enemyRef} position={[0, 2.6, baseZ]} scale={ENEMY_SCALE}>
        <Suspense fallback={null}>
          <EnemyFigure enemy={enemy} clear={isClear} />
        </Suspense>
      </group>
      <EnemyMotion
        enemy={enemy}
        enemyRef={enemyRef}
        enemyPositionRef={enemyPositionRef}
        baseZ={baseZ}
        arenaX={stage.arena.x}
        difficulty={selectedDifficulty}
      />

      {!isClear && enemy.id === "thunderstorm" ? <ThunderstormStrikes /> : null}
      {!isClear && (enemy.id === "heavyRain" || enemy.id === "rainySeason" || enemy.id === "typhoon")
        ? <RainStreaks color={enemy.accentColor} />
        : null}
      {!isClear && enemy.id === "blizzard"
        ? <SnowDrift color="#dff8ff" />
        : null}

      <LightningWarnings />
      <MinionField enemyPositionRef={enemyPositionRef} />
      <MinionSpawnBurst enemyPositionRef={enemyPositionRef} />
      <BossShatterBurst enemyPositionRef={enemyPositionRef} />
      <BulletTrails />
      <PlayerShield />
      <Suspense fallback={null}>
        <PlayerWeapon />
      </Suspense>
      <Suspense fallback={null}>
        <PlayerBackAvatar />
      </Suspense>
    </>
  );
}

export function BattleScene({
  onBack,
  onShowResult,
}: {
  onBack: () => void;
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
      <Canvas
        camera={{ position: [0, 2.15, 7.1], fov: initialFov }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <FovController />
        <ClearSkyCameraPan />
        <ExperimentField
          enemyId={selectedEnemyId}
          stage={stage}
          isClear={isClear}
          enemyRef={enemyGroupRef}
          enemyPositionRef={enemyPositionRef}
        />
        <PlayerController enemyRef={enemyGroupRef} enemyPositionRef={enemyPositionRef} />
      </Canvas>

      <BattleHud onBack={onBack} onShowResult={onShowResult} />
    </main>
  );
}
