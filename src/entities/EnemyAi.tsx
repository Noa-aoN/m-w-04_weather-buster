import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import { difficultyModifiers } from "../game/data";
import type { DifficultyLevel, WeatherEnemy } from "../game/types";

// Per-enemy AI motion. When evolving, see AGENTS.md "敵 AI を触るとき" — the
// four points (AiPhase / phaseDurations / next / lerpRate) must always move
// together, otherwise transitions silently break.

export type AiPhase =
  | "approach"
  | "circle"
  | "telegraph"
  | "retreat"
  | "idle"
  | "dodge"
  | "zigzag"
  | "evade";

export const STANDOFF_DISTANCE = 7.5;
export const MIN_DISTANCE = 5.5;
export const ENEMY_SCALE = 1.55;

export function EnemyMotion({
  enemy,
  enemyRef,
  enemyPositionRef,
  baseZ,
  arenaX,
  difficulty,
}: {
  enemy: WeatherEnemy;
  enemyRef: React.RefObject<Group | null>;
  enemyPositionRef: React.RefObject<Vector3>;
  baseZ: number;
  arenaX: number;
  difficulty: DifficultyLevel;
}) {
  const { camera } = useThree();
  const status = useBattleStore((state) => state.status);
  const isPointerLocked = useBattleStore((state) => state.isPointerLocked);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);
  const phaseRef = useRef<{ mode: AiPhase; t: number; orbitDir: 1 | -1; angle: number; dodgeDir: 1 | -1; zigPhase: number }>({
    mode: "approach",
    t: 0,
    orbitDir: 1,
    angle: 0,
    dodgeDir: 1,
    zigPhase: 0,
  });
  const revealRef = useRef<{ startedAt: number | null; lastStatus: typeof status }>({ startedAt: null, lastStatus: status });

  useFrame((state, delta) => {
    const node = enemyRef.current;
    if (!node) {
      return;
    }
    if (revealRef.current.lastStatus !== status) {
      if (status === "battle") {
        revealRef.current.startedAt = performance.now();
      } else {
        revealRef.current.startedAt = null;
      }
      revealRef.current.lastStatus = status;
    }
    const revealStart = revealRef.current.startedAt;
    const revealDur = 700;
    const revealK = revealStart === null ? 1 : Math.min(1, (performance.now() - revealStart) / revealDur);
    const revealEase = revealK < 1 ? 1 - Math.pow(1 - revealK, 3) : 1;
    const revealOvershoot = revealK < 0.6 ? 1 + Math.sin(revealK * Math.PI / 0.6) * 0.18 : 1;
    const revealScale = revealStart === null ? 1 : revealEase * revealOvershoot;

    // Hit reaction: very brief flinch (80ms) just for the visual punch — no
    // longer locks the enemy in place, so they can immediately roll into a
    // dodge / zigzag / evade phase if the AI decides to.
    const hitFlinch = lastShotHit ? Math.max(0, 1 - (performance.now() - lastShotAt) / 80) : 0;
    const baseY = 2.6;
    const idleY = baseY + Math.sin(state.clock.getElapsedTime() * 1.1) * 0.18;
    if (status !== "battle") {
      node.position.set(0, idleY, baseZ);
      node.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.25;
      enemyPositionRef.current.copy(node.position);
      return;
    }
    // Subtle "breathing" pulse so the enemy feels alive even when stationary.
    const breath = 1 + Math.sin(state.clock.getElapsedTime() * 1.4 + difficulty * 0.5) * 0.025;
    if (!isPointerLocked) {
      node.scale.setScalar(ENEMY_SCALE * revealScale * breath);
      enemyPositionRef.current.copy(node.position);
      return;
    }
    node.scale.setScalar(ENEMY_SCALE * revealScale * breath * (1 + hitFlinch * 0.07));

    const aggression = difficultyModifiers[difficulty].movementAggression;
    const phase = phaseRef.current;
    phase.t += delta;
    const playerX = camera.position.x;
    const playerZ = camera.position.z;

    const phaseDurations: Record<AiPhase, number> = {
      approach: 1.4 - aggression * 0.4,
      circle: 2.2 + aggression * 0.5,
      telegraph: 0.55,
      retreat: 1.4 - aggression * 0.2,
      idle: 1.0 + Math.random() * 0.6,
      dodge: 0.45,
      zigzag: 1.5 + Math.random() * 0.6,
      evade: 1.6 - aggression * 0.2,
    };

    // React to recent shots: if the player just shot, prefer evasive phases.
    const justShotAt = lastShotAt > 0 ? performance.now() - lastShotAt : Infinity;
    const justShot = justShotAt < 220;

    if (phase.t > phaseDurations[phase.mode]) {
      phase.t = 0;
      const sluggishChance = enemy.id === "cloudy" ? 0.22 : enemy.id === "rainySeason" ? 0.18 : 0.1;
      const willIdle = phase.mode !== "idle" && Math.random() < sluggishChance;
      if (willIdle) {
        phase.mode = "idle";
      } else if (justShot && Math.random() < 0.55) {
        // Hit & run: snap to a fast lateral dodge after being shot at
        phase.mode = "dodge";
      } else {
        const r = Math.random();
        const next: Record<AiPhase, AiPhase> = {
          approach: r < 0.55 ? "circle" : r < 0.78 ? "zigzag" : "evade",
          circle: r < 0.32 ? "telegraph" : r < 0.6 ? "retreat" : r < 0.82 ? "zigzag" : "evade",
          telegraph: r < 0.32 ? "retreat" : r < 0.66 ? "circle" : "evade",
          retreat: r < 0.55 ? "approach" : r < 0.82 ? "zigzag" : "circle",
          idle: r < 0.65 ? "approach" : "circle",
          dodge: r < 0.55 ? "circle" : r < 0.85 ? "retreat" : "zigzag",
          zigzag: r < 0.5 ? "circle" : r < 0.78 ? "retreat" : "evade",
          evade: r < 0.5 ? "circle" : r < 0.78 ? "approach" : "retreat",
        };
        phase.mode = next[phase.mode];
      }
      if (phase.mode === "circle") {
        phase.orbitDir = Math.random() < 0.5 ? 1 : -1;
      }
      if (phase.mode === "dodge") {
        phase.dodgeDir = Math.random() < 0.5 ? 1 : -1;
      }
      if (phase.mode === "zigzag") {
        phase.zigPhase = Math.random() * Math.PI * 2;
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
    } else if (phase.mode === "dodge") {
      // Quick lateral burst perpendicular to player line-of-sight
      const dxFromPlayer = node.position.x - playerX;
      const dzFromPlayer = node.position.z - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      // Perpendicular = rotate the (dx,dz) vector by 90 degrees
      const perpX = -dzFromPlayer / dist;
      const perpZ = dxFromPlayer / dist;
      const burst = (3.4 + aggression * 1.2) * phase.dodgeDir;
      targetX = node.position.x + perpX * burst;
      targetZ = node.position.z + perpZ * burst;
    } else if (phase.mode === "zigzag") {
      // Orbit + rapid sin perpendicular wiggle = harder-to-track lateral path
      phase.angle += delta * (1.0 + aggression * 0.7) * phase.orbitDir;
      const baseX = playerX + Math.cos(phase.angle) * orbitRadius;
      const baseTargetZ = playerZ + Math.sin(phase.angle) * orbitRadius;
      const wiggle = Math.sin(state.clock.getElapsedTime() * 6.5 + phase.zigPhase) * (1.3 + aggression * 0.5);
      const dxFromPlayer = baseX - playerX;
      const dzFromPlayer = baseTargetZ - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      const perpX = -dzFromPlayer / dist;
      const perpZ = dxFromPlayer / dist;
      targetX = baseX + perpX * wiggle;
      targetZ = baseTargetZ + perpZ * wiggle;
    } else if (phase.mode === "evade") {
      // Pull back to a far standoff while strafing — full hit-and-run profile
      const k = Math.min(1, phase.t / phaseDurations.evade);
      const dxFromPlayer = node.position.x - playerX;
      const dzFromPlayer = node.position.z - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      const farRadius = orbitRadius + 4.2;
      const desiredX = playerX + (dxFromPlayer / dist) * farRadius;
      const desiredZ = playerZ + (dzFromPlayer / dist) * farRadius;
      // Add slow strafe so the enemy slides while pulling back
      const strafeAngle = state.clock.getElapsedTime() * 1.6 + phase.zigPhase;
      targetX = desiredX * k + node.position.x * (1 - k) + Math.sin(strafeAngle) * 1.4;
      targetZ = desiredZ * k + node.position.z * (1 - k) + Math.cos(strafeAngle) * 0.9;
    } else {
      const k = Math.min(1, phase.t / phaseDurations.retreat);
      const dxFromPlayer = node.position.x - playerX;
      const dzFromPlayer = node.position.z - playerZ;
      const dist = Math.max(Math.sqrt(dxFromPlayer * dxFromPlayer + dzFromPlayer * dzFromPlayer), 0.001);
      targetX = playerX + (dxFromPlayer / dist) * (orbitRadius + 2.4) * k + node.position.x * (1 - k);
      targetZ = playerZ + (dzFromPlayer / dist) * (orbitRadius + 2.4) * k + baseZ * (1 - k);
    }

    targetX += Math.sin(state.clock.getElapsedTime() * 1.3 + difficulty) * 0.3;
    targetZ += Math.cos(state.clock.getElapsedTime() * 1.1 + difficulty * 0.7) * 0.25;

    const dxClamp = targetX - playerX;
    const dzClamp = targetZ - playerZ;
    const distClamp = Math.sqrt(dxClamp * dxClamp + dzClamp * dzClamp);
    if (distClamp < MIN_DISTANCE && distClamp > 0.001) {
      targetX = playerX + (dxClamp / distClamp) * MIN_DISTANCE;
      targetZ = playerZ + (dzClamp / distClamp) * MIN_DISTANCE;
    }

    targetX = Math.max(-arenaX + 1, Math.min(arenaX - 1, targetX));
    targetZ = Math.max(baseZ * 1.8, Math.min(baseZ * 0.1 + 5, targetZ));

    const lerpRate = phase.mode === "idle" ? 0.4
      : phase.mode === "dodge" ? 4.2 + aggression * 1.4
      : phase.mode === "zigzag" ? 1.6 + aggression * 0.9
      : phase.mode === "evade" ? 1.5 + aggression * 0.8
      : (0.9 + aggression * 0.7);
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

    // Apply flinch as a small position jitter on top of the AI's intent.
    if (hitFlinch > 0) {
      node.position.x += (Math.random() - 0.5) * hitFlinch * 0.08;
      node.position.y += hitFlinch * 0.15;
    }

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
