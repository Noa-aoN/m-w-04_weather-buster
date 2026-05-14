import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import { difficultyModifiers, findMinionType } from "../game/data";
import { isDebugEnabled, writeDebug } from "../features/debug/debugBus";
import type { DifficultyLevel, WeatherEnemy } from "../game/types";
import { blockingColliders, resolveCircleVsCircles } from "./stageColliders";
import type { StageCollider } from "./stagePlacements";

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

// Per-enemy vertical tier. Four bands (地面 / 少し浮く / まぁまぁ浮く /
// だいぶ浮く) keep the silhouette varied across battles. Tornado is the only
// pure-ground enemy; lighter cloud types hover low; thunder/typhoon ride
// high in the sky.
const ENEMY_VERTICAL_TIER: Record<
  WeatherEnemy["id"],
  { base: number; amp: number; freq: number; grounded?: boolean }
> = {
  // 地面: 足が地面に着いた状態。微小な歩行バウンスのみ
  tornado:      { base: 0.4, amp: 0.05, freq: 4.2, grounded: true },
  // 少し浮く: 1〜1.5m
  cloudy:       { base: 1.2, amp: 0.35, freq: 1.2 },
  heavyRain:    { base: 1.4, amp: 0.4,  freq: 1.0 },
  // まぁまぁ浮く: 1.8〜2.4m
  blizzard:     { base: 1.8, amp: 0.5,  freq: 1.1 },
  rainySeason:  { base: 2.2, amp: 0.55, freq: 1.0 },
  // だいぶ浮く: 3〜3.6m （高層の雷雲・台風）
  thunderstorm: { base: 3.6, amp: 0.9,  freq: 0.9 },
  typhoon:      { base: 3.4, amp: 1.2,  freq: 1.3 },
};

// Enemy bounding radius for static-prop push-out. Enemies render larger
// than the player but the AI orbit logic already keeps them ≥ MIN_DISTANCE
// away, so we use a moderate disc that just covers the body silhouette.
const ENEMY_COLLIDER_RADIUS = 1.2;

export function EnemyMotion({
  enemy,
  enemyRef,
  enemyPositionRef,
  baseZ,
  arenaX,
  arenaZFront,
  arenaZBack,
  difficulty,
  colliders,
}: {
  enemy: WeatherEnemy;
  enemyRef: React.RefObject<Group | null>;
  enemyPositionRef: React.RefObject<Vector3>;
  baseZ: number;
  arenaX: number;
  arenaZFront: number;
  arenaZBack: number;
  difficulty: DifficultyLevel;
  colliders: readonly StageCollider[];
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
    // Pre-battle idle pose uses the same per-enemy vertical tier as combat,
    // so the tornado lands on the floor and high-altitude enemies hover up
    // top from the moment the player sees them on the ready screen.
    const idleTier = ENEMY_VERTICAL_TIER[enemy.id] ?? { base: 2.6, amp: 0.18, freq: 1.1 };
    const idleY = idleTier.base + Math.sin(state.clock.getElapsedTime() * 1.1) * (idleTier.grounded ? 0.04 : 0.18);
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
    // Stagger: hold position, jitter scale at ~6Hz so the silhouette visibly
    // pulses for the player. AI phase timer pauses so it picks up cleanly.
    const staggerUntil = useBattleStore.getState().staggerUntil;
    const nowMs = performance.now();
    const isStaggered = nowMs < staggerUntil;
    if (isStaggered) {
      const blink = 1 + Math.sin(nowMs * 0.04) * 0.06;
      node.scale.setScalar(ENEMY_SCALE * revealScale * blink);
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
      // Force pure flee while minions are alive — the boss lets them screen
      // and bolts to the back of the arena. Anything that closes the gap
      // (approach / circle / telegraph / idle) is overridden to evade so
      // there's a long stretch of un-pressured shooting time once the player
      // commits to clearing minions.
      const minionsAlive = useBattleStore.getState().minions.length > 0;
      if (minionsAlive && phase.mode !== "evade" && phase.mode !== "retreat") {
        phase.mode = "evade";
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

    // While minions are alive the boss hangs back — adds a flat radius bonus
    // pulled from the minion type so a future minion species can change the
    // boss's behaviour just by tweaking its config.
    const storeSnap = useBattleStore.getState();
    const liveMinions = storeSnap.minions;
    const minionStandoff = liveMinions.length > 0
      ? findMinionType(liveMinions[0].typeId).bossStandoffBonus
      : 0;
    // Brief recoil window: for ~3s after a minion spawns the boss adds an
    // extra standoff bonus on top of the persistent flee. Reads as "boss
    // jumps backward as the minions appear".
    const sinceSpawn = storeSnap.lastMinionSpawnAt > 0
      ? performance.now() - storeSnap.lastMinionSpawnAt
      : Infinity;
    const recoilBonus = sinceSpawn < 3000 ? 4 * (1 - sinceSpawn / 3000) : 0;
    const orbitRadius = (enemy.id === "tornado" || enemy.id === "blizzard" ? 6.6 + aggression * 1.2
      : enemy.id === "typhoon" ? 7.4 + aggression * 1.4
      : enemy.id === "cloudy" ? 6.2
      : 7.2 + aggression * 0.9) + minionStandoff + recoilBonus;

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

    // Filter colliders by the enemy's vertical extent — high-flying
    // bosses (thunderstorm at y≈3.6, typhoon at y≈3.4) shouldn't be
    // walled off by short pads / barrels they fly cleanly over. Approx
    // the enemy as a vertical extent of [y - radius, y + radius] using
    // the same disc radius as the XZ collider.
    const enemyFeetY = node.position.y - ENEMY_COLLIDER_RADIUS;
    const enemyHeadY = node.position.y + ENEMY_COLLIDER_RADIUS;
    const enemyBlockers = colliders.length > 0
      ? blockingColliders(enemyFeetY, enemyHeadY, colliders)
      : [];

    // Push the AI's intended target out of any blocking prop before the
    // arena clamp, so the steering target itself isn't inside a building.
    if (enemyBlockers.length > 0) {
      const resolved = resolveCircleVsCircles(targetX, targetZ, ENEMY_COLLIDER_RADIUS, enemyBlockers);
      targetX = resolved.x;
      targetZ = resolved.z;
    }

    targetX = Math.max(-arenaX + 1, Math.min(arenaX - 1, targetX));
    // Keep the boss inside (or just past) the player's reachable z range.
    // Player is clamped to [arenaZFront, arenaZBack]; allow the boss a small
    // buffer past arenaZFront so retreat is meaningful but never sends them
    // far enough to be unreachable.
    const enemyZMin = arenaZFront - 14;
    const enemyZMax = arenaZBack - 1.5;
    targetZ = Math.max(enemyZMin, Math.min(enemyZMax, targetZ));

    // Tornado is the only ground-bound rusher — bump its lerp rate so it
    // tracks the player faster than the floating types.
    const speedBoost = enemy.id === "tornado" ? 1.6 : 1;
    const lerpRate = (phase.mode === "idle" ? 0.4
      : phase.mode === "dodge" ? 4.2 + aggression * 1.4
      : phase.mode === "zigzag" ? 1.6 + aggression * 0.9
      : phase.mode === "evade" ? 1.5 + aggression * 0.8
      : (0.9 + aggression * 0.7)) * speedBoost;
    const factor = 1 - Math.exp(-lerpRate * delta);
    node.position.x += (targetX - node.position.x) * factor;
    node.position.z += (targetZ - node.position.z) * factor;

    // Final push-out on the *actual* (post-lerp) position. Without this
    // step the lerp can interpolate THROUGH a building when target was
    // outside but the previous frame's position was on the other side.
    if (enemyBlockers.length > 0) {
      const resolved = resolveCircleVsCircles(
        node.position.x,
        node.position.z,
        ENEMY_COLLIDER_RADIUS,
        enemyBlockers,
      );
      node.position.x = resolved.x;
      node.position.z = resolved.z;
    }

    const t = state.clock.getElapsedTime();
    const tier = ENEMY_VERTICAL_TIER[enemy.id] ?? { base: 1.6, amp: 0.6, freq: 1.0 };
    if (tier.grounded) {
      // 地面組: 足は床に着いたまま、ごく軽い歩行バウンス
      const stepBob = Math.abs(Math.sin(t * tier.freq)) * (tier.amp + 0.03);
      node.position.y = tier.base + stepBob + (phase.mode === "telegraph" ? -0.1 : 0);
    } else {
      // 浮遊組: tier の base + amp で高度層を表現。aggression と phase で振幅を微調整
      const ampBase = tier.amp * (1 + aggression * 0.3);
      const amp = phase.mode === "idle" ? ampBase * 0.35 : ampBase;
      const freq = phase.mode === "idle" ? tier.freq * 0.6 : tier.freq * (1 + aggression * 0.25);
      const baseOffset = phase.mode === "telegraph" ? -0.4 : 0;
      node.position.y = tier.base + baseOffset
        + Math.sin(t * freq) * amp
        + Math.sin(t * freq * 1.9) * amp * 0.25;
    }

    // Apply flinch as a small position jitter on top of the AI's intent.
    if (hitFlinch > 0) {
      node.position.x += (Math.random() - 0.5) * hitFlinch * 0.08;
      node.position.y += hitFlinch * 0.15;
    }

    const dxFace = playerX - node.position.x;
    const dzFace = playerZ - node.position.z;
    const facing = Math.atan2(dxFace, dzFace);
    if (enemy.id === "typhoon") {
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

    if (isDebugEnabled()) {
      const dxDebug = node.position.x - playerX;
      const dzDebug = node.position.z - playerZ;
      const distDebug = Math.sqrt(dxDebug * dxDebug + dzDebug * dzDebug);
      writeDebug({
        aiPhase: phase.mode,
        aiPhaseT: phase.t,
        enemyDistance: distDebug,
        enemyPosY: node.position.y,
        hitFlinch,
      });
    }
  });
  return null;
}
