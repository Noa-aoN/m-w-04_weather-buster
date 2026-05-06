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
    // FPS gun position: positioned for the new Sci-Fi Gun Pack which is
    // beefier than the old AR set. Keep it lower-right so the muzzle does
    // not block the central reticle.
    node.translateX(0.42);
    node.translateY(-0.36);
    node.translateZ(-0.62);
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
        <WeaponObject id={selectedWeaponId} targetSize={0.6} />
      </group>
      {flashVisible ? (
        <>
          {/* Tight white-hot core */}
          <mesh position={[0, 0, -0.62]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={1} toneMapped={false} />
          </mesh>
          {/* Bright orange-yellow halo around the core */}
          <mesh ref={flashRef} position={[0, 0, -0.62]}>
            <sphereGeometry args={[0.18, 14, 14]} />
            <meshBasicMaterial color="#ffd56a" transparent opacity={0.9} toneMapped={false} />
          </mesh>
          {/* Outer wide soft glow — sells volumetric muzzle blast */}
          <mesh position={[0, 0, -0.62]}>
            <sphereGeometry args={[0.34, 12, 12]} />
            <meshBasicMaterial color="#ff8a3a" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
          </mesh>
          {/* 6-pointed cross of flame petals (ratio'd plane sprites) */}
          {[0, Math.PI / 6, Math.PI / 3, Math.PI / 2, (Math.PI * 2) / 3, (Math.PI * 5) / 6].map((rot, i) => (
            <mesh key={rot} position={[0, 0, -0.62]} rotation={[0, 0, rot]}>
              <planeGeometry args={[0.78 - (i % 2) * 0.18, 0.13 - (i % 2) * 0.04]} />
              <meshBasicMaterial color={i % 2 === 0 ? "#ffe9a8" : "#ffaa42"} transparent opacity={0.78 - (i % 3) * 0.12} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
          {/* Forward smoke / heat-distort cone hint (a darker, smaller plane) */}
          <mesh position={[0, 0, -0.92]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.18, 0.45, 12, 1, true]} />
            <meshBasicMaterial color="#ffb060" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
          </mesh>
          {/* Distant pinpoint to give parallax depth */}
          <mesh position={[0, 0, -1.05]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <pointLight ref={flashLightRef} position={[0, 0, -0.55]} intensity={11} color="#ffd56a" distance={6.5} />
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
  const charGltf = useGLTF(CHARACTER_MODEL_URL[selectedCharacterId] ?? CHARACTER_MODEL_URL.noa);
  const characterAccent = useBattleStore((state) => {
    const id = state.selectedCharacterId;
    if (id === "noa") return "#28d9ff";
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

  useFrame(({ clock }) => {
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
    const t = clock.getElapsedTime();
    // Subtle idle breathing — Meshy AI meshes have no skeleton, so we fake
    // life via a gentle Y-bob on the body group. Keep the amplitude small
    // (~3cm) so it reads as "breathing" not "floating".
    const bobY = Math.sin(t * 2.1) * 0.025;
    node.position.set(
      camera.position.x + forwardVec.current.x * 1.8,
      bobY,
      camera.position.z + forwardVec.current.z * 1.8,
    );
    lookTarget.current.set(
      node.position.x + forwardVec.current.x * 10,
      bobY,
      node.position.z + forwardVec.current.z * 10,
    );
    node.lookAt(lookTarget.current);
    // Slight forward lean — sells "aiming" stance for the static mesh
    node.rotateX(-0.06);

    // Weapon follows camera orientation fully (yaw + pitch) so the barrel
    // always points where the camera looks, even when aiming up/down at
    // flying enemies. The avatar group lives ~1.8m in front of the camera;
    // placing the weapon ~2.0m ahead with a slight right-shoulder offset
    // puts it visually in the character's right hand. A tiny per-frame sway
    // matches the body bob so weapon and torso feel coupled.
    const weapon = weaponGroupRef.current;
    if (weapon) {
      weapon.position.copy(camera.position);
      weapon.quaternion.copy(camera.quaternion);
      weapon.translateX(0.55);
      weapon.translateY(0.1 + bobY * 0.6);
      weapon.translateZ(-2.0);
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
          <WeaponObject id={selectedWeaponId} targetSize={0.7} />
        </group>
        {flashVisible ? (
          <>
            <mesh ref={flashRef} position={[0, 0, -0.4]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshBasicMaterial color="#fff7a0" transparent opacity={0.95} toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0, -0.4]} intensity={6} color="#fff7a0" distance={4} />
          </>
        ) : null}
      </group>
    </>
  );
}

useGLTF.preload(CHARACTER_MODEL_URL.noa);
useGLTF.preload(CHARACTER_MODEL_URL.saka);

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
