import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Raycaster, Vector3 } from "three";
import { useBattleStore } from "../../game/battleStore";
import { COMBAT_CONSTANTS } from "../../game/combatRules";
import {
  CONTACT_RADIUS,
  difficultyModifiers,
  enemyAttackPatterns,
  enemyContactReactions,
  findCharacter,
  findMinionType,
  findStage,
  findWeapon,
  weatherEnemies,
} from "../../game/data";
import { findMinionByObject, getMinionRoot, getMinionWorldPosition } from "../../entities/minionRegistry";
import {
  blockingColliders,
  groundYAt,
  rayToFirstCollider,
  resolveCircleVsCircles,
} from "../../entities/stageColliders";
import type { StageCollider } from "../../entities/stagePlacements";
import { setLockTarget } from "./lockControls";
import { useKeyboardInput } from "./useKeyboardInput";

const MOVE_SPEED = 5.4;
const DASH_MULTIPLIER = 1.55;
const JUMP_HEIGHT = 1.25;
const JUMP_DURATION = 0.55;
// Camera height above the player's "feet" plane. Eye height — the camera
// sits this far above whichever ground they're standing on (floor or a
// platform top).
const EYE_HEIGHT = 2.15;
const WIND_BLADE_REACH = 4.8;
const WIND_BLADE_DOT = 0.62;
// Player capsule radius for static-prop collision. ~30cm closer to the
// real character silhouette than the legacy "no collider" feel; small
// enough to thread between adjacent props without sticking.
const PLAYER_COLLIDER_RADIUS = 0.45;
// Right-click crescent: longer reach than the close swing so the player can
// answer enemies that have stepped out of melee range. Cooldown is much
// slower than left-click so the projectile can't replace gunplay entirely.
const WIND_BLADE_PROJECTILE_REACH = 22;
const WIND_BLADE_PROJECTILE_DOT = 0.82;
const WIND_BLADE_PROJECTILE_COOLDOWN_MS = 1000;

function getSpecialDelay(enemyId: string): number {
  // Larger / scarier enemies fire specials more often
  if (enemyId === "typhoon") return 14000;
  if (enemyId === "thunderstorm") return 17000;
  if (enemyId === "rainySeason") return 19000;
  if (enemyId === "blizzard") return 20000;
  if (enemyId === "tornado") return 21000;
  if (enemyId === "heavyRain") return 16000;
  if (enemyId === "cloudy") return 26000;
  return 22000;
}

function getSpecialBurstCount(enemyId: string): number {
  if (enemyId === "typhoon") return 5;
  if (enemyId === "heavyRain") return 5;
  if (enemyId === "thunderstorm") return 4;
  if (enemyId === "rainySeason") return 4;
  if (enemyId === "blizzard") return 3;
  if (enemyId === "tornado") return 3;
  if (enemyId === "cloudy") return 3;
  return 0;
}

export function PlayerController({
  enemyRef,
  enemyPositionRef,
  colliders,
}: {
  enemyRef: React.RefObject<Object3D | null>;
  enemyPositionRef: React.RefObject<Vector3>;
  colliders: readonly StageCollider[];
}) {
  const { camera, gl } = useThree();
  const sensitivity = useBattleStore((state) => state.mouseSensitivity);
  const controlsRef = useRef<{ pointerSpeed?: number } | null>(null);

  const heldKeys = useKeyboardInput((key) => {
    const store = useBattleStore.getState();
    if (key === "r") {
      store.reload();
    } else if (key === "q") {
      store.triggerSkill();
    } else if (key === "e" || key === "1") {
      store.useItem("clearTonic");
    } else if (key === "2") {
      store.useItem("lightningRod");
    } else if (key === "3") {
      store.useItem("decoyUmbrella");
    } else if (key === "4") {
      store.useItem("pressureStabilizer");
    }
  });
  const jumpStartedAt = useRef<number | null>(null);
  const raycaster = useRef(new Raycaster());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const move = useRef(new Vector3());
  const nextLightningAt = useRef(0);
  const nextSpecialAt = useRef(0);
  const battleStartedAtRef = useRef<number | null>(null);
  const bobPhaseRef = useRef(0);
  const lastContactAt = useRef(0);

  useEffect(() => {
    setLockTarget(gl.domElement);
    return () => setLockTarget(null);
  }, [gl.domElement]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.pointerSpeed = sensitivity;
    }
  }, [sensitivity]);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.status === prev.status) {
        return;
      }
      if (state.status === "clear" || state.status === "defeat") {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    });
  }, []);

  useEffect(() => {
    let pausedAt: number | null = null;
    return useBattleStore.subscribe((state, prev) => {
      if (state.isPointerLocked === prev.isPointerLocked) {
        return;
      }
      if (state.status !== "battle") {
        pausedAt = null;
        return;
      }
      if (!state.isPointerLocked) {
        pausedAt = performance.now();
      } else if (pausedAt !== null) {
        const delta = performance.now() - pausedAt;
        pausedAt = null;
        useBattleStore.getState().shiftMarkerTimes(delta);
        nextLightningAt.current += delta;
        if (nextSpecialAt.current !== 0) {
          nextSpecialAt.current += delta;
        }
      }
    });
  }, []);

  useFrame((_, delta) => {
    const state = useBattleStore.getState();
    if (state.status !== "battle" || !state.isPointerLocked) {
      battleStartedAtRef.current = null;
      // While paused / not locked, drop any held shield so the deflect doesn't
      // stay on across the pause break.
      if (state.shieldActive) useBattleStore.getState().setShieldActive(false);
      return;
    }
    if (battleStartedAtRef.current === null) {
      battleStartedAtRef.current = performance.now();
      nextLightningAt.current = 0;
      nextSpecialAt.current = 0;
    }
    // B key (held) raises the shield while held. Release → drop shield.
    const wantShield = heldKeys.current.has("b");
    if (wantShield !== state.shieldActive) {
      useBattleStore.getState().setShieldActive(wantShield);
    }
    const stage = findStage(state.selectedStageId);
    const arena = stage.arena;
    const keys = heldKeys.current;
    const dash = keys.has("shift") ? DASH_MULTIPLIER : 1;
    const slowed = performance.now() < state.slowUntil;
    const slowMul = slowed ? 0.55 : 1;
    const character = findCharacter(state.selectedCharacterId);
    const speed = MOVE_SPEED * character.moveSpeedMultiplier * dash * slowMul * delta;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() === 0) {
      forward.current.set(0, 0, -1);
    }
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    move.current.set(0, 0, 0);
    if (keys.has("w")) move.current.add(forward.current);
    if (keys.has("s")) move.current.sub(forward.current);
    if (keys.has("d")) move.current.add(right.current);
    if (keys.has("a")) move.current.sub(right.current);
    if (move.current.lengthSq() > 0) {
      move.current.normalize().multiplyScalar(speed);
      camera.position.x += move.current.x;
      camera.position.z += move.current.z;
    }
    // Push the player back out of any static prop they slid into. Filter
    // colliders by current vertical extent so a low platform / pad doesn't
    // block sideways approach (player steps on top) and an overhead
    // hanging sign doesn't block at all (player walks under). Done before
    // the arena clamp so a collider near the wall can't trap the player
    // past the boundary.
    if (colliders.length > 0) {
      const feetY = camera.position.y - EYE_HEIGHT;
      const headY = camera.position.y;
      const blockers = blockingColliders(feetY, headY, colliders);
      if (blockers.length > 0) {
        const resolved = resolveCircleVsCircles(
          camera.position.x,
          camera.position.z,
          PLAYER_COLLIDER_RADIUS,
          blockers,
        );
        camera.position.x = resolved.x;
        camera.position.z = resolved.z;
      }
    }
    camera.position.x = Math.max(-arena.x, Math.min(arena.x, camera.position.x));
    camera.position.z = Math.max(arena.zFront, Math.min(arena.zBack, camera.position.z));

    if (keys.has(" ") && jumpStartedAt.current === null) {
      jumpStartedAt.current = performance.now();
    }
    const isMoving = move.current.lengthSq() > 0;
    const dashing = dash > 1 && isMoving;
    if (state.isDashing !== dashing) {
      useBattleStore.setState({ isDashing: dashing });
    }
    if (isMoving) {
      bobPhaseRef.current += delta * (dash > 1 ? 14 : 9);
    } else {
      // Decay bob phase smoothly toward zero so head settles when stopping
      bobPhaseRef.current *= Math.max(0, 1 - delta * 6);
    }
    const bobAmplitude = isMoving ? (dash > 1 ? 0.045 : 0.028) : 0;
    const verticalBob = Math.sin(bobPhaseRef.current) * bobAmplitude;
    // Compute the ground level under the player: floor (y=0) by default,
    // or the top of any short collider whose disc contains them and that
    // their current feet are at-or-above (so they "step up" onto low
    // pads / platforms automatically). Jump arc adds on top of this.
    const currentFeetY = camera.position.y - EYE_HEIGHT;
    const groundY = colliders.length > 0
      ? groundYAt(camera.position.x, camera.position.z, currentFeetY, colliders)
      : 0;
    if (jumpStartedAt.current !== null) {
      const elapsed = (performance.now() - jumpStartedAt.current) / 1000;
      const t = elapsed / JUMP_DURATION;
      if (t >= 1) {
        camera.position.y = groundY + EYE_HEIGHT;
        jumpStartedAt.current = null;
      } else {
        camera.position.y = groundY + EYE_HEIGHT + Math.sin(t * Math.PI) * JUMP_HEIGHT;
      }
    } else {
      camera.position.y = groundY + EYE_HEIGHT + verticalBob;
    }

    const now = performance.now();
      // Skill animation pacing: each step fires at startedAt + k*interval,
      // and `advanceSkillStep` applies that step's damage + bumps the
      // per-shot signals so the existing muzzle-flash / tracer / blade
      // swing reactions all play on cadence. Loop in case multiple steps
      // came due in the same frame after a long stall.
      const skillAnim = state.skillAnimation;
      if (skillAnim !== null) {
        let steps = skillAnim.completedSteps;
        while (steps < skillAnim.totalSteps) {
          const fireAt = skillAnim.startedAt + steps * skillAnim.stepIntervalMs;
          if (now < fireAt) break;
          state.advanceSkillStep();
          steps += 1;
        }
      }
      const enemy = weatherEnemies.find((candidate) => candidate.id === state.selectedEnemyId);
      const pattern = enemy ? enemyAttackPatterns[enemy.id] : null;

      // Body-contact reaction — when the player walks into the boss the
      // store applies a per-enemy damage + knockback (and optional slow).
      // Cooldown prevents spam while still in range. The high-altitude
      // bosses (thunderstorm / typhoon) hover well above the player so we
      // include a y check — otherwise standing under them would trigger
      // contact damage repeatedly even though they're nowhere near.
      // The wind-blade buster skill cancels the contact reaction entirely.
      const blockContact = state.lastSkillAt > 0
        && state.selectedWeaponId === "windBlade"
        && now - state.lastSkillAt < 4000;
      if (enemy && !blockContact) {
        const ePos = enemyPositionRef.current;
        const dx = camera.position.x - ePos.x;
        const dy = camera.position.y - ePos.y;
        const dz = camera.position.z - ePos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < CONTACT_RADIUS * CONTACT_RADIUS) {
          const reaction = enemyContactReactions[enemy.id];
          if (reaction && now - lastContactAt.current > reaction.cooldownMs) {
            lastContactAt.current = now;
            state.takeMarkerDamage(reaction.damage);
            const dist = Math.max(Math.sqrt(distSq), 0.0001);
            state.applyKnockback(
              (dx / dist) * reaction.knockback * 6,
              (dz / dist) * reaction.knockback * 6,
            );
            // Toast lives at least until cooldown ends OR the slow expires,
            // whichever is later — so the player sees the status while it
            // still affects them.
            const toastUntil = Math.max(
              now + reaction.cooldownMs,
              reaction.slowMs ? now + reaction.slowMs : 0,
            );
            const stateUpdate: { slowUntil?: number; lastContactAt: number; contactEnemyId: typeof enemy.id; contactToastUntil: number } = {
              lastContactAt: now,
              contactEnemyId: enemy.id,
              contactToastUntil: toastUntil,
            };
            if (reaction.slowMs) {
              stateUpdate.slowUntil = now + reaction.slowMs;
            }
            useBattleStore.setState(stateUpdate);
          }
        }
      }
      // While the boss is staggered, push the next attack windows out so they
      // don't fire on resume. A small grace (200ms) keeps a clear pocket of
      // peace before normal patterns return.
      const staggered = now < state.staggerUntil;
      if (staggered) {
        const resumeAt = state.staggerUntil + 200;
        if (nextLightningAt.current < resumeAt) nextLightningAt.current = resumeAt;
        if (nextSpecialAt.current !== 0 && nextSpecialAt.current < resumeAt) {
          nextSpecialAt.current = resumeAt;
        }
      }
      if (!staggered && enemy && pattern && now >= nextLightningAt.current) {
      const diffMod = difficultyModifiers[state.selectedDifficulty];
      const minionAttackMul = state.minions.length > 0
        ? findMinionType(state.minions[0].typeId).bossAttackIntervalMul
        : 1;
      const interval = pattern.intervalMs * diffMod.attackInterval * minionAttackMul;
      const damage = pattern.damage * diffMod.attackDamage * COMBAT_CONSTANTS.ENEMY_REGULAR_ATTACK_RATIO;
      const half = (arena.zBack - arena.zFront) / 2;
      const center = (arena.zBack + arena.zFront) / 2;
      const targetX = pattern.followsPlayer
        ? camera.position.x + (Math.random() - 0.5) * pattern.spreadX * 0.5
        : (Math.random() - 0.5) * Math.min(pattern.spreadX, arena.x * 1.4);
      const targetZ = pattern.followsPlayer
        ? camera.position.z + (Math.random() - 0.5) * pattern.spreadZ * 0.5
        : center + (Math.random() - 0.5) * Math.min(pattern.spreadZ, half * 1.4);
      const clampedX = Math.max(-arena.x, Math.min(arena.x, targetX));
      const clampedZ = Math.max(arena.zFront, Math.min(arena.zBack, targetZ));
      const origin = enemyPositionRef.current;
      const fromX = pattern.kind === "falling" ? clampedX : origin.x;
      const fromZ = pattern.kind === "falling" ? clampedZ : origin.z;
      const fromY = pattern.kind === "falling" ? 14 : origin.y + 0.6;
      const marker = {
        id: now + Math.random(),
        x: clampedX,
        z: clampedZ,
        triggersAt: now + pattern.warningMs,
        spawnAt: now,
        fromX,
        fromY,
        fromZ,
        radius: pattern.radius,
        damage,
        color: pattern.projectileColor,
        trailGlow: pattern.trailGlow,
        kind: pattern.kind,
        enemyId: enemy.id,
      };
      state.spawnLightning(marker);
      nextLightningAt.current = now + interval;
    }

    // Periodic enemy special attack: a multi-marker burst that's clearly
    // telegraphed by the volume of markers but still survivable.
    if (enemy && pattern && nextSpecialAt.current === 0) {
      // Initialize on first frame after battle start (gives ~10s grace)
      nextSpecialAt.current = now + getSpecialDelay(enemy.id);
    }
    // While minions are alive the boss only fires its regular ranged volley
    // — specials (multi-marker burst) are suppressed so the player has a
    // clear "kill the minions first, then the boss reopens" rhythm. Push
    // the next special timer out so it doesn't fire the moment the last
    // minion dies.
    const minionsAlive = state.minions.length > 0;
    if (minionsAlive && nextSpecialAt.current !== 0) {
      const minimum = now + 4000;
      if (nextSpecialAt.current < minimum) nextSpecialAt.current = minimum;
    }
    // Pre-fire charge window (1.2s before special)
    const CHARGE_LEAD_MS = 1200;
    if (!staggered && !minionsAlive && enemy && pattern && nextSpecialAt.current !== 0) {
      const leadStart = nextSpecialAt.current - CHARGE_LEAD_MS;
      if (now >= leadStart && state.enemyChargeFiresAt !== nextSpecialAt.current) {
        state.beginEnemyCharge(nextSpecialAt.current);
      }
    }
    if (!staggered && !minionsAlive && enemy && pattern && now >= nextSpecialAt.current && nextSpecialAt.current !== 0) {
      const diffMod = difficultyModifiers[state.selectedDifficulty];
      const burstCount = getSpecialBurstCount(enemy.id);
      if (burstCount > 0) {
        useBattleStore.setState({ lastSpecialFiredAt: now });
        const baseTargetX = camera.position.x;
        const baseTargetZ = camera.position.z;
        for (let i = 0; i < burstCount; i += 1) {
          const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.4;
          const ringRadius = 2.4 + Math.random() * 1.2;
          const tx = Math.max(-arena.x, Math.min(arena.x, baseTargetX + Math.cos(angle) * ringRadius));
          const tz = Math.max(arena.zFront, Math.min(arena.zBack, baseTargetZ + Math.sin(angle) * ringRadius));
          const origin = enemyPositionRef.current;
          const isFalling = pattern.kind === "falling";
          state.spawnLightning({
            id: now + Math.random() + i * 0.001,
            x: tx,
            z: tz,
            triggersAt: now + pattern.warningMs * 1.2 + i * 90,
            spawnAt: now + i * 90,
            fromX: isFalling ? tx : origin.x,
            fromY: isFalling ? 14 : origin.y + 0.6,
            fromZ: isFalling ? tz : origin.z,
            radius: pattern.radius * 1.05,
            damage: pattern.damage * diffMod.attackDamage * 1.15,
            color: pattern.projectileColor,
            trailGlow: pattern.trailGlow * 1.4,
            kind: pattern.kind,
            enemyId: enemy.id,
          });
        }
      }
      nextSpecialAt.current = now + getSpecialDelay(enemy.id);
    }

    for (const marker of state.lightningMarkers) {
      if (now >= marker.triggersAt) {
        const dx = camera.position.x - marker.x;
        const dz = camera.position.z - marker.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= marker.radius) {
          // Static prop occlusion: cast a 3D ray from the marker's
          // origin (boss / minion / sky) to the player. If a static
          // collider is in the way and tall enough to intercept the
          // ray's Y at that point, the attack is blocked.
          const ox = marker.fromX;
          const oy = marker.fromY;
          const oz = marker.fromZ;
          const rx = camera.position.x - ox;
          const ry = camera.position.y - oy;
          const rz = camera.position.z - oz;
          const rayDist = Math.sqrt(rx * rx + ry * ry + rz * rz);
          let blocked = false;
          if (colliders.length > 0 && rayDist > 0.001) {
            const blockerT = rayToFirstCollider(
              ox, oy, oz,
              rx / rayDist, ry / rayDist, rz / rayDist,
              colliders,
            );
            if (blockerT < rayDist) blocked = true;
          }
          if (!blocked) {
            state.takeMarkerDamage(marker.damage);
            const markerEnemyId = (marker as { enemyId?: typeof marker.enemyId }).enemyId;
            const pat = markerEnemyId ? enemyAttackPatterns[markerEnemyId] : null;
            if (pat && pat.knockback > 0) {
              const len = Math.max(distance, 0.0001);
              // Tornado pulls player TOWARD impact (and toward the enemy in
              // the case of a colocated marker) — that's its signature feel.
              const direction = markerEnemyId === "tornado" ? -1 : 1;
              const nx = (dx / len) * direction;
              const nz = (dz / len) * direction;
              state.applyKnockback(nx * pat.knockback * 6, nz * pat.knockback * 6);
            }
            // RainySeason marker leaves a temporary slow on the player.
            if (markerEnemyId === "rainySeason") {
              useBattleStore.setState({ slowUntil: now + 2200 });
            }
          }
        }
        state.removeLightning(marker.id);
      }
    }

    // Apply knockback velocity (decays each frame via consumeKnockback)
    if (Math.abs(state.knockbackVx) > 0.01 || Math.abs(state.knockbackVz) > 0.01) {
      const kb = state.consumeKnockback();
      camera.position.x += kb.vx * delta;
      camera.position.z += kb.vz * delta;
      camera.position.x = Math.max(-arena.x, Math.min(arena.x, camera.position.x));
      camera.position.z = Math.max(arena.zFront, Math.min(arena.zBack, camera.position.z));
    }

    // Minion attacks — each minion fires its own ranged marker on its own
    // cadence, originating from the minion's world position so it reads as
    // "they are shooting from over there" rather than from the boss.
    // Boss stagger no longer pauses minion fire: while the boss is
    // exposed the screen feels too quiet without minions still pressing,
    // and the player still gets a clear "boss is open" cue from the boss
    // itself going still.
    if (state.minions.length > 0) {
      for (const minion of state.minions) {
        const type = findMinionType(minion.typeId);
        if (now - minion.lastAttackAt < type.attackIntervalMs) continue;
        const minionPos = getMinionWorldPosition(minion.id);
        if (!minionPos) continue;
        // Range gate: minions only fire when at a real ranged distance from
        // the player. Threshold halved so they sit closer in and still keep
        // shooting — they shouldn't be a melee threat, just a constant
        // peppering pressure from mid-range.
        const dx = minionPos.x - camera.position.x;
        const dz = minionPos.z - camera.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);
        if (distToPlayer < 2.5) continue;
        state.recordMinionAttack(minion.id, now);
        const targetX = camera.position.x + (Math.random() - 0.5) * 3;
        const targetZ = camera.position.z + (Math.random() - 0.5) * 3;
        const clampedX = Math.max(-arena.x, Math.min(arena.x, targetX));
        const clampedZ = Math.max(arena.zFront, Math.min(arena.zBack, targetZ));
        state.spawnLightning({
          id: now + Math.random() + minion.id * 0.0001,
          x: clampedX,
          z: clampedZ,
          triggersAt: now + type.attackWarningMs,
          spawnAt: now,
          fromX: minionPos.x,
          fromY: minionPos.y + 0.2,
          fromZ: minionPos.z,
          radius: type.attackRadius,
          damage: type.attackDamage,
          color: "#cfe9f4",
          trailGlow: 0.8,
          kind: "arc",
          enemyId: enemy?.id ?? "cloudy",
        });
      }
    }

    // Schedule periodic enemy barrier
    if (enemy && pattern && pattern.barrierIntervalMs > 0 && pattern.barrierDurationMs > 0) {
      const sinceStart = now - (battleStartedAtRef.current ?? now);
      if (sinceStart > 4500) {
        const intervalElapsedSinceLast = now - (state.lastEnemyBarrierAt > 0 ? state.lastEnemyBarrierAt : now - pattern.barrierIntervalMs);
        if (state.lastEnemyBarrierAt === 0 || intervalElapsedSinceLast >= pattern.barrierIntervalMs) {
          state.raiseEnemyBarrier(pattern.barrierDurationMs);
        }
      }
    }
  });

  const lastTriggerAtRef = useRef(0);
  const lastSlashProjectileAtRef = useRef(0);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      const store = useBattleStore.getState();
      if (store.status !== "battle") return;
      // Right click:
      //   - non-windBlade → reload (mandatory; no auto-reload anymore)
      //   - windBlade     → fire mid-range crescent projectile
      if (event.button === 2) {
        event.preventDefault();
        if (store.selectedWeaponId === "windBlade") {
          const now = performance.now();
          if (now - lastSlashProjectileAtRef.current < WIND_BLADE_PROJECTILE_COOLDOWN_MS) {
            return;
          }
          lastSlashProjectileAtRef.current = now;
          const dir = forward.current;
          camera.getWorldDirection(dir);
          const toEnemy = enemyPositionRef.current.clone().sub(camera.position);
          const distance = toEnemy.length();
          const alignment = distance > 0 ? dir.dot(toEnemy.normalize()) : 0;
          let didHit = distance <= WIND_BLADE_PROJECTILE_REACH && alignment >= WIND_BLADE_PROJECTILE_DOT;
          // Static prop occlusion: if a static collider sits between the
          // camera and the enemy along the aim direction *and* its body
          // intercepts the shot Y at that point, the crescent can't pass.
          if (didHit && colliders.length > 0) {
            const blockerT = rayToFirstCollider(
              camera.position.x,
              camera.position.y,
              camera.position.z,
              dir.x,
              dir.y,
              dir.z,
              colliders,
            );
            if (blockerT < distance) {
              didHit = false;
              useBattleStore.setState({
                lastShotBlockedAt: now,
                lastShotBlockedX: camera.position.x + dir.x * blockerT,
                lastShotBlockedY: camera.position.y + dir.y * blockerT,
                lastShotBlockedZ: camera.position.z + dir.z * blockerT,
              });
            }
          }
          // Crit when the crescent threads the boss tightly along its center
          // line — narrower than melee so a clean ranged shot still rewards.
          const critical = didHit && alignment >= 0.95;
          store.fireSlashProjectile(didHit, critical);
        } else {
          store.reload();
        }
        return;
      }
      if (event.button !== 0) return;
      const now = performance.now();
      // Empty mag → bump the "reload!" warning, but don't shoot. No more
      // auto-reload — the player has to ask for it.
      if (store.ammo <= 0) {
        useBattleStore.setState({ lastEmptyClickAt: now });
        return;
      }
      if (now < store.reloadingUntil) return;
      const weapon = findWeapon(store.selectedWeaponId);
      if (now - lastTriggerAtRef.current < weapon.fireRateMs) return;
      lastTriggerAtRef.current = now;

      const dir = forward.current;
      camera.getWorldDirection(dir);
      if (weapon.id === "windBlade") {
        const toEnemy = enemyPositionRef.current.clone().sub(camera.position);
        const distance = toEnemy.length();
        const alignment = distance > 0 ? dir.dot(toEnemy.normalize()) : 0;
        const didHit = distance <= WIND_BLADE_REACH && alignment >= WIND_BLADE_DOT;
        const critical = didHit && distance <= WIND_BLADE_REACH * 0.62 && alignment >= 0.88;
        store.shoot(didHit, critical);
        return;
      }
      raycaster.current.set(camera.position, dir);
      const target = enemyRef.current;
      const enemyHits = target ? raycaster.current.intersectObject(target, true) : [];
      const minionRoot = getMinionRoot();
      const minionHits = minionRoot ? raycaster.current.intersectObject(minionRoot, true) : [];
      const closestEnemy = enemyHits[0];
      const closestMinion = minionHits[0];
      // Static prop occlusion: anything closer than the nearest collider
      // along the 3D aim ray is reachable; anything further is blocked.
      // Height-aware — a low pad won't kill a horizontal shot from
      // standing eye level.
      const occlusionT = colliders.length > 0
        ? rayToFirstCollider(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            dir.x,
            dir.y,
            dir.z,
            colliders,
          )
        : Infinity;
      const recordBlock = () => {
        useBattleStore.setState({
          lastShotBlockedAt: now,
          lastShotBlockedX: camera.position.x + dir.x * occlusionT,
          lastShotBlockedY: camera.position.y + dir.y * occlusionT,
          lastShotBlockedZ: camera.position.z + dir.z * occlusionT,
        });
      };
      // Closer object wins. If a minion is in front of the boss the player
      // gets to chip it down first; otherwise the boss takes the shot.
      // Skip the minion shot too if a static prop is in the way.
      if (closestMinion && (!closestEnemy || closestMinion.distance < closestEnemy.distance)) {
        if (closestMinion.distance >= occlusionT) {
          // Blocked by a static prop — register a miss instead.
          recordBlock();
          store.shoot(false, false);
          return;
        }
        const minionId = findMinionByObject(closestMinion.object);
        if (minionId !== null) {
          store.shootMinion(minionId);
          return;
        }
      }
      const enemyDist = closestEnemy ? closestEnemy.distance : Infinity;
      const didHit = enemyHits.length > 0 && enemyDist < occlusionT;
      // Enemy was hit by the raycast but a static prop is in the way →
      // record a block so the impact-spark VFX shows the player WHY the
      // shot didn't connect.
      if (closestEnemy && enemyDist >= occlusionT && occlusionT < Infinity) {
        recordBlock();
      }
      const critical = didHit && enemyHits.some((hit) => {
        let node: Object3D | null = hit.object;
        while (node) {
          if (node.userData && node.userData.isCore === true) {
            return true;
          }
          if (node.name === "enemyCore") {
            return true;
          }
          node = node.parent;
        }
        return false;
      });
      store.shoot(didHit, critical);
    };
    const onMouseUp = (_event: MouseEvent) => {
      // Shield no longer lives on right click; nothing to release here.
    };
    const onContextMenu = (event: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        event.preventDefault();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [camera, gl.domElement, enemyRef, enemyPositionRef]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      useBattleStore.getState().tick();
    }, 1000);
    const damageId = window.setInterval(() => {
      useBattleStore.getState().takeDamageTick();
    }, 3000);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(damageId);
    };
  }, []);

  return (
    <PointerLockControls
      ref={controlsRef as never}
      onLock={() => useBattleStore.getState().setPointerLocked(true)}
      onUnlock={() => useBattleStore.getState().setPointerLocked(false)}
    />
  );
}
