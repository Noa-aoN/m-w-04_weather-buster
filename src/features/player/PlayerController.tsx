import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Raycaster, Vector3 } from "three";
import { useBattleStore } from "../../game/battleStore";
import {
  difficultyModifiers,
  enemyAttackPatterns,
  findStage,
  weatherEnemies,
} from "../../game/data";
import { setLockTarget } from "./lockControls";
import { useKeyboardInput } from "./useKeyboardInput";

const MOVE_SPEED = 5.4;
const DASH_MULTIPLIER = 1.55;
const JUMP_HEIGHT = 1.25;
const JUMP_DURATION = 0.55;
const GROUND_Y = 2.15;

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
}: {
  enemyRef: React.RefObject<Object3D | null>;
  enemyPositionRef: React.RefObject<Vector3>;
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
      return;
    }
    if (battleStartedAtRef.current === null) {
      battleStartedAtRef.current = performance.now();
      nextLightningAt.current = 0;
      nextSpecialAt.current = 0;
    }
    const stage = findStage(state.selectedStageId);
    const arena = stage.arena;
    const keys = heldKeys.current;
    const dash = keys.has("shift") ? DASH_MULTIPLIER : 1;
    const slowed = performance.now() < state.slowUntil;
    const slowMul = slowed ? 0.55 : 1;
    const speed = MOVE_SPEED * dash * slowMul * delta;

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
    camera.position.x = Math.max(-arena.x, Math.min(arena.x, camera.position.x));
    camera.position.z = Math.max(arena.zFront, Math.min(arena.zBack, camera.position.z));

    if (keys.has(" ") && jumpStartedAt.current === null) {
      jumpStartedAt.current = performance.now();
    }
    if (jumpStartedAt.current !== null) {
      const elapsed = (performance.now() - jumpStartedAt.current) / 1000;
      const t = elapsed / JUMP_DURATION;
      if (t >= 1) {
        camera.position.y = GROUND_Y;
        jumpStartedAt.current = null;
      } else {
        camera.position.y = GROUND_Y + Math.sin(t * Math.PI) * JUMP_HEIGHT;
      }
    } else {
      camera.position.y = GROUND_Y;
    }

    const now = performance.now();
      const enemy = weatherEnemies.find((candidate) => candidate.id === state.selectedEnemyId);
      const pattern = enemy ? enemyAttackPatterns[enemy.id] : null;
      if (enemy && pattern && now >= nextLightningAt.current) {
      const diffMod = difficultyModifiers[state.selectedDifficulty];
      const interval = pattern.intervalMs * diffMod.attackInterval;
      const damage = pattern.damage * diffMod.attackDamage;
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
    // Pre-fire charge window (1.2s before special)
    const CHARGE_LEAD_MS = 1200;
    if (enemy && pattern && nextSpecialAt.current !== 0) {
      const leadStart = nextSpecialAt.current - CHARGE_LEAD_MS;
      if (now >= leadStart && state.enemyChargeFiresAt !== nextSpecialAt.current) {
        state.beginEnemyCharge(nextSpecialAt.current);
      }
    }
    if (enemy && pattern && now >= nextSpecialAt.current && nextSpecialAt.current !== 0) {
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

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      const store = useBattleStore.getState();
      if (store.status !== "battle") return;
      if (event.button === 2) {
        event.preventDefault();
        store.setShieldActive(true);
        return;
      }
      if (event.button !== 0 || store.ammo <= 0) return;

      const dir = forward.current;
      camera.getWorldDirection(dir);
      raycaster.current.set(camera.position, dir);
      const target = enemyRef.current;
      const hits = target ? raycaster.current.intersectObject(target, true) : [];
      const didHit = hits.length > 0;
      const critical = didHit && hits.some((hit) => {
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
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 2) {
        useBattleStore.getState().setShieldActive(false);
      }
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
  }, [camera, gl.domElement, enemyRef]);

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
