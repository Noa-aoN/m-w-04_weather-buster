import { Canvas } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Color, Vector3 } from "three";
import { BulletTrails } from "../entities/BulletTrails";
import { EnemyFigure } from "../entities/EnemyFigure";
import { EnemyMotion, ENEMY_SCALE } from "../entities/EnemyAi";
import { LightningWarnings } from "../entities/LightningWarnings";
import { FovController, PlayerBackAvatar, PlayerShield, PlayerWeapon } from "../entities/PlayerView";
import { StageTerrain } from "../entities/StageTerrain";
import { RainStreaks, SnowDrift, ThunderstormStrikes } from "../entities/WeatherFx";
import { BattleHud } from "../features/hud/BattleHud";
import { PlayerController } from "../features/player/PlayerController";
import { stages, weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { Stage, WeatherEnemyId } from "../game/types";

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
  // Initial spawn pushed further back (-9 / -13 / -16) so the boss intro reads
  // as a distant threat that closes in, not something already in your face.
  const baseZ = stage.id === "lab" ? -9 : stage.id === "ruins" ? -13 : -16;

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
      <ambientLight intensity={isClear ? 1.45 : 0.65} color={ambientColor} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={isClear ? 3.4 : 1.85}
        color={isClear ? "#ffffff" : stage.ringColor}
      />
      <hemisphereLight args={[isClear ? "#fff5d8" : "#bdeeff", isClear ? "#a8c8e8" : "#1c2a36", 0.55]} />
      <pointLight position={[0, 1.4, -3]} intensity={3.2} color={enemy.coreColor} />
      <fog attach="fog" args={[isClear ? "#c8ecff" : stage.fogColor, 8, fogFar]} />

      <StageTerrain stage={stage} isClear={isClear} />

      <group ref={enemyRef} position={[0, 2.6, baseZ]} scale={ENEMY_SCALE}>
        <EnemyFigure enemy={enemy} clear={isClear} />
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
      <BulletTrails />
      <PlayerShield />
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
