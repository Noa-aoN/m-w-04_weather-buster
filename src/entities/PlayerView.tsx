import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh, PerspectiveCamera, PointLight } from "three";
import { Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useBattleStore } from "../game/battleStore";
import { CHARACTER_MODEL_URL } from "./CharacterModel";
import { fitObjectToHeight, tintCharacterMaterials } from "./fitObject";
import { WeaponObject, weaponModelRotation } from "./WeaponModel";

// First-person weapon: tracks camera quaternion every frame, with a kicked
// recoil that decays over 130ms.
export function PlayerWeapon() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const flashLightRef = useRef<PointLight>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const cameraMode = useBattleStore((state) => state.cameraMode);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);

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
    node.translateZ(-0.55);
    // Recoil: punch back along camera axis and tip the muzzle up briefly.
    const sinceShot = performance.now() - lastShotAt;
    const recoilK = lastShotAt > 0 ? Math.max(0, 1 - sinceShot / 130) : 0;
    if (recoilK > 0) {
      const eased = recoilK * recoilK;
      node.translateZ(eased * 0.12);
      node.translateY(eased * 0.04);
      node.rotateX(eased * 0.18);
    }
  });

  if (cameraMode === "tps") {
    return null;
  }

  return (
    <group ref={groupRef}>
      <group rotation={weaponModelRotation(selectedWeaponId)}>
        <WeaponObject id={selectedWeaponId} targetSize={0.55} />
      </group>
      {flashVisible ? (
        <>
          <mesh ref={flashRef} position={[0, 0, -0.55]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshBasicMaterial color="#fff7a0" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          {[0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4].map((rot) => (
            <mesh key={rot} position={[0, 0, -0.55]} rotation={[0, 0, rot]}>
              <planeGeometry args={[0.55, 0.07]} />
              <meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0, 0, -0.66]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <pointLight ref={flashLightRef} position={[0, 0, -0.5]} intensity={8} color="#fff7a0" distance={5.5} />
        </>
      ) : null}
    </group>
  );
}

export function PlayerShield() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const shieldActive = useBattleStore((state) => state.shieldActive);
  const shieldEnergy = useBattleStore((state) => state.shieldEnergy);
  const lastShieldBlockAt = useBattleStore((state) => state.lastShieldBlockAt);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    node.visible = shieldActive || performance.now() - lastShieldBlockAt < 220;
    if (!node.visible) {
      return;
    }
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    node.translateZ(-1.05);
    const hitPulse = Math.max(0, 1 - (performance.now() - lastShieldBlockAt) / 220);
    const t = clock.getElapsedTime();
    const base = 0.95 + shieldEnergy / 100 * 0.18;
    node.scale.setScalar(base + Math.sin(t * 9) * 0.025 + hitPulse * 0.18);
    node.rotation.z = t * 0.55;
    node.traverse((child) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = shieldActive ? 0.22 + hitPulse * 0.28 : hitPulse * 0.35;
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.8 + hitPulse * 2.4;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <ringGeometry args={[0.48, 0.72, 72]} />
        <meshStandardMaterial color="#7cf4ff" emissive="#28d9ff" emissiveIntensity={1} transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[0.78, 0.82, 72]} />
        <meshBasicMaterial color="#ffd84d" transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function PlayerBackAvatar() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const charRef = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const lookTarget = useRef(new Vector3());
  const forwardVec = useRef(new Vector3());
  const [flashVisible, setFlashVisible] = useState(false);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const cameraMode = useBattleStore((state) => state.cameraMode);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const charGltf = useGLTF(CHARACTER_MODEL_URL[selectedCharacterId] ?? CHARACTER_MODEL_URL.iris);
  const characterAccent = useBattleStore((state) => {
    const id = state.selectedCharacterId;
    if (id === "iris") return "#28d9ff";
    if (id === "halo") return "#6cdcff";
    return "#ffd84d";
  });

  const { charFitted, animations } = useMemo(() => {
    const cloned = SkeletonUtils.clone(charGltf.scene) as Group;
    fitObjectToHeight(cloned, 1.7);
    tintCharacterMaterials(cloned, characterAccent, 0.05);
    return { charFitted: cloned, animations: charGltf.animations as AnimationClip[] };
  }, [charGltf, characterAccent]);

  const { actions, names } = useAnimations(animations, charRef);

  useEffect(() => {
    if (!actions || names.length === 0) {
      return;
    }
    const idleName = names.find((n) => n.toLowerCase().includes("idle")) ?? names[0];
    if (!idleName) {
      return;
    }
    const action = actions[idleName];
    if (action) {
      action.reset().fadeIn(0.25).play();
      return () => {
        action.fadeOut(0.25);
      };
    }
  }, [actions, names]);

  useEffect(() => {
    if (lastShotAt === 0 || !actions || names.length === 0) {
      return;
    }
    setFlashVisible(true);
    const flashId = window.setTimeout(() => setFlashVisible(false), 80);
    const punchName = names.find((n) => /punch|attack|shoot|fire/i.test(n));
    if (punchName) {
      const punch = actions[punchName];
      if (punch) {
        punch.reset();
        punch.setLoop(2200, 1);
        punch.clampWhenFinished = true;
        punch.fadeIn(0.05).play();
        const idleName = names.find((n) => n.toLowerCase().includes("idle")) ?? names[0];
        const idle = idleName ? actions[idleName] : null;
        const back = window.setTimeout(() => {
          punch.fadeOut(0.2);
          if (idle) {
            idle.reset().fadeIn(0.2).play();
          }
        }, 400);
        return () => {
          window.clearTimeout(flashId);
          window.clearTimeout(back);
        };
      }
    }
    return () => window.clearTimeout(flashId);
  }, [lastShotAt, actions, names]);

  const weaponGroupRef = useRef<Group>(null);

  useFrame(() => {
    const node = groupRef.current;
    if (!node || cameraMode !== "tps") {
      return;
    }
    camera.getWorldDirection(forwardVec.current);
    forwardVec.current.y = 0;
    if (forwardVec.current.lengthSq() === 0) {
      forwardVec.current.set(0, 0, -1);
    }
    forwardVec.current.normalize();
    node.position.set(
      camera.position.x + forwardVec.current.x * 1.8,
      0,
      camera.position.z + forwardVec.current.z * 1.8,
    );
    lookTarget.current.set(
      node.position.x + forwardVec.current.x * 10,
      0,
      node.position.z + forwardVec.current.z * 10,
    );
    node.lookAt(lookTarget.current);

    // Weapon follows camera orientation fully (yaw + pitch) so the barrel always
    // points where the camera looks, even when aiming up/down at flying enemies.
    const weapon = weaponGroupRef.current;
    if (weapon) {
      weapon.position.copy(camera.position);
      weapon.quaternion.copy(camera.quaternion);
      weapon.translateX(0.4);
      weapon.translateY(-0.05);
      weapon.translateZ(-1.4);
    }
  });

  if (cameraMode !== "tps") {
    return null;
  }

  return (
    <>
      <group ref={groupRef}>
        <group ref={charRef}>
          <primitive object={charFitted} />
        </group>
      </group>
      <group ref={weaponGroupRef}>
        <group rotation={weaponModelRotation(selectedWeaponId)}>
          <WeaponObject id={selectedWeaponId} targetSize={0.6} />
        </group>
        {flashVisible ? (
          <>
            <mesh ref={flashRef} position={[0, 0, -0.35]}>
              <sphereGeometry args={[0.14, 12, 12]} />
              <meshBasicMaterial color="#fff7a0" transparent opacity={0.95} toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0, -0.35]} intensity={6} color="#fff7a0" distance={4} />
          </>
        ) : null}
      </group>
    </>
  );
}

useGLTF.preload(CHARACTER_MODEL_URL.iris);
useGLTF.preload(CHARACTER_MODEL_URL.halo);
useGLTF.preload(CHARACTER_MODEL_URL.raika);

// Sets camera FOV from the store and adds a brief "punch" on each shot / skill.
export function FovController() {
  const { camera } = useThree();
  const fov = useBattleStore((state) => state.fov);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
  }, [camera, fov]);
  useFrame(() => {
    const perspective = camera as PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) {
      return;
    }
    const now = performance.now();
    const shotPunch = lastShotAt > 0
      ? Math.max(0, 1 - (now - lastShotAt) / (lastShotCritical ? 220 : 120)) * (lastShotCritical ? 1.4 : 0.6)
      : 0;
    const skillPunch = lastSkillAt > 0 ? Math.max(0, 1 - (now - lastSkillAt) / 360) * 3.5 : 0;
    perspective.fov = fov + shotPunch + skillPunch;
    perspective.updateProjectionMatrix();
  });
  return null;
}
