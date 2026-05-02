import { Canvas } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useMemo, useState } from "react";
import { BattleHud } from "../features/hud/BattleHud";
import { calculateSunnyScore } from "../game/score";
import type { BattleStatus, WeatherEnemy } from "../game/types";
import { initialWeapon, weatherEnemies } from "../game/data";
import { clamp } from "../shared/math";

function EnemyCore({
  enemy,
  isClear,
}: {
  enemy: WeatherEnemy;
  isClear: boolean;
}) {
  return (
    <group position={[0, 1.6, -4]}>
      <mesh>
        <sphereGeometry args={[0.82, 48, 48]} />
        <meshStandardMaterial
          color={isClear ? "#f7f3c1" : enemy.color}
          emissive={isClear ? "#fff5a0" : enemy.accentColor}
          emissiveIntensity={isClear ? 0.7 : 0.28}
          roughness={0.35}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.18, 0.025, 12, 96]} />
        <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} />
      </mesh>
    </group>
  );
}

function ExperimentField({
  enemy,
  isClear,
}: {
  enemy: WeatherEnemy;
  isClear: boolean;
}) {
  return (
    <>
      <color attach="background" args={[isClear ? "#8ccff0" : "#26333f"]} />
      {isClear ? (
        <Sky sunPosition={[2, 1, 3]} turbidity={3} rayleigh={0.8} />
      ) : (
        <Stars radius={80} depth={35} count={1600} factor={4} saturation={0} fade />
      )}
      <ambientLight intensity={isClear ? 1.2 : 0.45} />
      <directionalLight position={[4, 8, 3]} intensity={isClear ? 3 : 1.5} />
      <fog attach="fog" args={[isClear ? "#c8ecff" : "#26333f", 7, 18]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[22, 22, 24, 24]} />
        <meshStandardMaterial
          color={isClear ? "#d9f6ff" : "#1b2730"}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>

      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, 0.45, -1.5]}>
          <boxGeometry args={[1.2, 0.9, 1.2]} />
          <meshStandardMaterial color={isClear ? "#b8d8de" : "#33424a"} />
        </mesh>
      ))}

      <EnemyCore enemy={enemy} isClear={isClear} />
    </>
  );
}

export function BattleScene() {
  const [selectedEnemyId, setSelectedEnemyId] = useState(weatherEnemies[0].id);
  const enemy = useMemo(
    () => weatherEnemies.find((candidate) => candidate.id === selectedEnemyId) ?? weatherEnemies[0],
    [selectedEnemyId],
  );
  const [status, setStatus] = useState<BattleStatus>("ready");
  const [enemyHp, setEnemyHp] = useState(enemy.maxHp);
  const [shotsFired, setShotsFired] = useState(0);
  const [shotsHit, setShotsHit] = useState(0);
  const [pressureGauge, setPressureGauge] = useState(0);

  const isClear = status === "clear";
  const score = calculateSunnyScore({
    enemyMaxHp: enemy.maxHp,
    remainingEnemyHp: enemyHp,
    shotsFired,
    shotsHit,
  });

  function resetBattle(nextEnemy: WeatherEnemy = enemy) {
    setStatus("ready");
    setEnemyHp(nextEnemy.maxHp);
    setShotsFired(0);
    setShotsHit(0);
    setPressureGauge(0);
  }

  function startBattle() {
    setEnemyHp(enemy.maxHp);
    setShotsFired(0);
    setShotsHit(0);
    setPressureGauge(0);
    setStatus("battle");
  }

  function shoot() {
    if (status !== "battle") {
      return;
    }

    setShotsFired((current) => current + 1);
    setShotsHit((current) => current + 1);
    setPressureGauge((current) => clamp(current + 14, 0, 100));
    setEnemyHp((current) => {
      const nextHp = Math.max(current - initialWeapon.damage, 0);
      if (nextHp === 0) {
        setStatus("clear");
      }
      return nextHp;
    });
  }

  return (
    <main className="gameShell">
      <Canvas
        camera={{ position: [0, 2.2, 5.8], fov: 58 }}
        onPointerDown={shoot}
      >
        <ExperimentField enemy={enemy} isClear={isClear} />
      </Canvas>

      <div className="enemySelector" aria-label="敵天候選択">
        {weatherEnemies.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={candidate.id === enemy.id ? "active" : ""}
            onClick={() => {
              setSelectedEnemyId(candidate.id);
              resetBattle(candidate);
            }}
          >
            {candidate.name}
          </button>
        ))}
      </div>

      <p className="enemyDescription">{enemy.description}</p>

      <BattleHud
        enemy={enemy}
        enemyHp={enemyHp}
        playerHp={100}
        weapon={initialWeapon}
        pressureGauge={pressureGauge}
        shotsFired={shotsFired}
        shotsHit={shotsHit}
        score={score}
        status={status}
        onStart={startBattle}
        onReset={() => resetBattle()}
      />
    </main>
  );
}
