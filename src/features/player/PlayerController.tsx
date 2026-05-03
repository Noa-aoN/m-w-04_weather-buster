import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Raycaster, Vector3 } from "three";
import { useBattleStore } from "../../game/battleStore";
import { setLockTarget } from "./lockControls";
import { useKeyboardInput } from "./useKeyboardInput";

const MOVE_SPEED = 5.4;
const DASH_MULTIPLIER = 1.55;
const JUMP_HEIGHT = 1.25;
const JUMP_DURATION = 0.55;
const ARENA_X = 11;
const ARENA_Z_BACK = 9;
const ARENA_Z_FRONT = -3;
const GROUND_Y = 2.15;
const LIGHTNING_INTERVAL_MS = 2200;
const LIGHTNING_WARNING_MS = 1600;
const LIGHTNING_DAMAGE = 95;
const LIGHTNING_RADIUS = 1.6;

export function PlayerController({
  enemyRef,
}: {
  enemyRef: React.RefObject<Object3D | null>;
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

  useFrame((_, delta) => {
    const state = useBattleStore.getState();
    if (state.status !== "battle") {
      return;
    }
    const keys = heldKeys.current;
    const dash = keys.has("shift") ? DASH_MULTIPLIER : 1;
    const speed = MOVE_SPEED * dash * delta;

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
    camera.position.x = Math.max(-ARENA_X, Math.min(ARENA_X, camera.position.x));
    camera.position.z = Math.max(ARENA_Z_FRONT, Math.min(ARENA_Z_BACK, camera.position.z));

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
    if (state.selectedEnemyId === "thunderstorm" && now >= nextLightningAt.current) {
      const marker = {
        id: now + Math.random(),
        x: (Math.random() - 0.5) * 16,
        z: -2 + (Math.random() - 0.5) * 9,
        triggersAt: now + LIGHTNING_WARNING_MS,
        radius: LIGHTNING_RADIUS,
        damage: LIGHTNING_DAMAGE,
      };
      state.spawnLightning(marker);
      nextLightningAt.current = now + LIGHTNING_INTERVAL_MS;
    }

    for (const marker of state.lightningMarkers) {
      if (now >= marker.triggersAt) {
        const dx = camera.position.x - marker.x;
        const dz = camera.position.z - marker.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= marker.radius) {
          state.takeMarkerDamage(marker.damage);
        }
        state.removeLightning(marker.id);
      }
    }
  });

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (document.pointerLockElement !== gl.domElement) return;
      const store = useBattleStore.getState();
      if (store.status !== "battle" || store.ammo <= 0) return;

      const dir = forward.current;
      camera.getWorldDirection(dir);
      raycaster.current.set(camera.position, dir);
      const target = enemyRef.current;
      const hits = target ? raycaster.current.intersectObject(target, true) : [];
      store.shoot(hits.length > 0);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
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
