import { Canvas } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useMemo, useState } from "react";
import { WeatherEnemyModel } from "../entities/WeatherEnemyModel";
import { BattleHud } from "../features/hud/BattleHud";
import { calculateSunnyScore } from "../game/score";
import type { BattleStatus, WeatherEnemyId } from "../game/types";
import { initialWeapon, weatherEnemies } from "../game/data";
import { clamp } from "../shared/math";

function ExperimentField({ enemyId, isClear }: { enemyId: WeatherEnemyId; isClear: boolean }) {
  const enemy = weatherEnemies.find((candidate) => candidate.id === enemyId) ?? weatherEnemies[0];

  return (
    <>
      <color attach="background" args={[isClear ? "#7dc7ed" : "#0b1722"]} />
      {isClear ? (
        <Sky sunPosition={[2, 1, 3]} turbidity={3} rayleigh={0.9} />
      ) : (
        <Stars radius={80} depth={35} count={1300} factor={4} saturation={0} fade />
      )}
      <ambientLight intensity={isClear ? 1.2 : 0.42} />
      <directionalLight position={[4, 8, 3]} intensity={isClear ? 3 : 1.7} color={isClear ? "#ffffff" : enemy.accentColor} />
      <pointLight position={[0, 1.4, -3]} intensity={3} color={enemy.coreColor} />
      <fog attach="fog" args={[isClear ? "#c8ecff" : "#0b1722", 8, 24]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[28, 28, 32, 32]} />
        <meshStandardMaterial color={isClear ? "#d9f6ff" : "#111d26"} metalness={0.2} roughness={0.36} />
      </mesh>

      {[-6, -3, 1.5, 5.5].map((x, index) => (
        <mesh key={x} position={[x, 0.55 + index * 0.18, -2.8 - index * 1.1]}>
          <boxGeometry args={[1.5, 1.1 + index * 0.24, 1.5]} />
          <meshStandardMaterial color={isClear ? "#abc9d2" : "#263945"} emissive="#0ba0d7" emissiveIntensity={0.07} />
        </mesh>
      ))}

      <group position={[0, 2.0, -5.2]} scale={1.55}>
        <WeatherEnemyModel enemy={enemy} clear={isClear} />
      </group>

      {!isClear && enemy.id === "thunderstorm"
        ? [-2.4, 2.2].map((x) => (
            <mesh key={x} position={[x, 0.72, -3.2]} rotation={[0, 0, x > 0 ? -0.08 : 0.08]}>
              <boxGeometry args={[0.08, 3.1, 0.08]} />
              <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.4} />
            </mesh>
          ))
        : null}
    </>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function BattleScene({
  selectedEnemyId,
  onBack,
  onOpenEnemyGrid,
}: {
  selectedEnemyId: WeatherEnemyId;
  onBack: () => void;
  onOpenEnemyGrid: () => void;
}) {
  const enemy = useMemo(
    () => weatherEnemies.find((candidate) => candidate.id === selectedEnemyId) ?? weatherEnemies[0],
    [selectedEnemyId],
  );
  const [status, setStatus] = useState<BattleStatus>("ready");
  const [enemyHp, setEnemyHp] = useState(enemy.maxHp);
  const [shotsFired, setShotsFired] = useState(0);
  const [shotsHit, setShotsHit] = useState(0);
  const [pressureGauge, setPressureGauge] = useState(78);
  const [ammo, setAmmo] = useState(24);
  const [elapsedSeconds, setElapsedSeconds] = useState(157);

  const isClear = status === "clear";
  const score = calculateSunnyScore({
    enemyMaxHp: enemy.maxHp,
    remainingEnemyHp: enemyHp,
    shotsFired,
    shotsHit,
  });

  function resetBattle() {
    setStatus("ready");
    setEnemyHp(enemy.maxHp);
    setShotsFired(0);
    setShotsHit(0);
    setPressureGauge(78);
    setAmmo(24);
    setElapsedSeconds(157);
  }

  function startBattle() {
    setEnemyHp(enemy.maxHp);
    setShotsFired(0);
    setShotsHit(0);
    setPressureGauge(78);
    setAmmo(24);
    setElapsedSeconds(157);
    setStatus("battle");
  }

  function shoot() {
    if (status !== "battle") {
      return;
    }

    setShotsFired((current) => current + 1);
    setShotsHit((current) => current + 1);
    setPressureGauge((current) => clamp(current + 5, 0, 100));
    setAmmo((current) => Math.max(current - 1, 0));
    setElapsedSeconds((current) => current + 1);
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
      <Canvas camera={{ position: [0, 2.15, 7.1], fov: 58 }} onPointerDown={shoot}>
        <ExperimentField enemyId={enemy.id} isClear={isClear} />
      </Canvas>

      <BattleHud
        enemy={enemy}
        enemyHp={enemyHp}
        playerHp={100}
        weapon={initialWeapon}
        pressureGauge={pressureGauge}
        ammo={ammo}
        elapsedTime={formatTime(elapsedSeconds)}
        shotsFired={shotsFired}
        shotsHit={shotsHit}
        score={score}
        status={status}
        onStart={startBattle}
        onReset={resetBattle}
        onBack={onBack}
        onOpenEnemyGrid={onOpenEnemyGrid}
      />
    </main>
  );
}
