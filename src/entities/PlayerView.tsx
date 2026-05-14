import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh, PerspectiveCamera, PointLight, Sprite } from "three";
import { AdditiveBlending, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useBattleStore } from "../game/battleStore";
import { findCharacter } from "../game/data";
import { isDebugEnabled, writeDebug } from "../features/debug/debugBus";
import { assetUrl } from "../shared/assets";
import { CHARACTER_MODEL_URL } from "./CharacterModel";
import { fitObjectToHeight, tintCharacterMaterials } from "./fitObject";
import { WeaponObject, weaponModelRotation, weaponModelScale } from "./WeaponModel";

const MUZZLE_TEX_URL = assetUrl("/textures/particles/muzzle.png");
const FLARE_TEX_URL = assetUrl("/textures/particles/flare.png");
const SMOKE_TEX_URL = assetUrl("/textures/particles/smoke.png");
useTexture.preload(MUZZLE_TEX_URL);
useTexture.preload(FLARE_TEX_URL);
useTexture.preload(SMOKE_TEX_URL);

// First-person weapon: tracks camera quaternion every frame, with a kicked
// recoil that decays over 130ms.
//
// For windBlade, left click triggers one of four varied slash animations
// (right→left swipe, diagonal cross, forward thrust, vertical chop) cycled
// through so consecutive clicks visibly differ.
const SLASH_DURATION_MS = 180;
const SLASH_VARIANTS = 4;

/**
 * マズルフラッシュ（SF / 光線銃テイスト）。Kenney Particle Pack の sprite を
 * 3 枚使い useFrame で減衰駆動。lastShotAt が更新されると新ショットとして
 * 認識し、各 sprite を独立した曲線で fade する。
 *  - muzzle : アナモルフィックレンズフレア（80ms、横長の SF ブラスター閃光）
 *  - flare  : 鋭い 4 点星（110ms、ショット毎にランダム回転）
 *  - shockRing : エネルギーリング（180ms、外側に拡張しながら fade）
 *  - 寒色 pointLight（100ms で消える）
 */
function MuzzleFlash({ lastShotAt, zOffset = -0.62 }: { lastShotAt: number; zOffset?: number }) {
  const muzzleTex = useTexture(MUZZLE_TEX_URL);
  const flareTex = useTexture(FLARE_TEX_URL);
  const ringTex = useTexture(SMOKE_TEX_URL);
  const muzzleRef = useRef<Sprite>(null);
  const flareRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  const lightRef = useRef<PointLight>(null);

  // ショット毎にランダム化する値。lastShotAt が変わったタイミングで更新。
  const seenShotRef = useRef(0);
  const flareRotRef = useRef(0);
  const muzzleScaleRef = useRef(1);

  useFrame(() => {
    if (lastShotAt !== seenShotRef.current) {
      seenShotRef.current = lastShotAt;
      flareRotRef.current = Math.random() * Math.PI * 2;
      muzzleScaleRef.current = 0.92 + Math.random() * 0.24;
    }

    const elapsed = lastShotAt > 0 ? performance.now() - lastShotAt : Infinity;

    // muzzle (anamorphic flare): 0ms ピーク → 80ms で 0。横長のまま使う
    // ことでブラスター発射らしいレンズフレア感を出す。
    const muzzleK = Math.max(0, 1 - elapsed / 80);
    if (muzzleRef.current) {
      const baseW = muzzleScaleRef.current * (1.4 + muzzleK * 0.6);
      muzzleRef.current.scale.set(baseW, baseW * 0.55, 1);
      const mat = muzzleRef.current.material as { opacity: number };
      mat.opacity = muzzleK;
      muzzleRef.current.visible = muzzleK > 0.01;
    }

    // flare (sharp 4-point star): 0ms ピーク → 110ms で 0
    const flareK = Math.max(0, 1 - elapsed / 110);
    if (flareRef.current) {
      const s = 0.85 + flareK * 0.5;
      flareRef.current.scale.set(s, s, 1);
      const mat = flareRef.current.material as { opacity: number; rotation: number };
      mat.opacity = flareK;
      mat.rotation = flareRotRef.current;
      flareRef.current.visible = flareK > 0.01;
    }

    // shockRing: 0ms 小さい → 180ms で大きく拡がりながら fade。エネルギー
    // 兵器の発射時ショックウェーブを表現。
    const ringT = elapsed / 180;
    const ringK = ringT < 1 ? (1 - ringT) ** 1.2 : 0;
    if (ringRef.current) {
      const s = 0.4 + ringT * 1.6;
      ringRef.current.scale.set(s, s, 1);
      const mat = ringRef.current.material as { opacity: number };
      mat.opacity = ringK * 0.85;
      ringRef.current.visible = ringK > 0.01;
    }

    // light: 100ms で 0、cool な cyan
    if (lightRef.current) {
      const lightK = Math.max(0, 1 - elapsed / 100);
      lightRef.current.intensity = lightK * 14;
      lightRef.current.visible = lightK > 0.01;
    }
  });

  return (
    <>
      {/* 主閃光: アナモルフィックレンズフレア。横長のまま使うと SF ブラスター
          らしさが出る。色は white→cyan 寄り。 */}
      <sprite ref={muzzleRef} position={[0, 0, zOffset]}>
        <spriteMaterial map={muzzleTex} color="#d8f3ff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* 鋭い 4 点星: ショット毎にランダム回転、寒色寄りの白で刺さる印象。 */}
      <sprite ref={flareRef} position={[0, 0, zOffset + 0.01]}>
        <spriteMaterial map={flareTex} color="#a8e8ff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* エネルギーリング: cyan の薄い円が外側に拡張、additive でフワッと
          消えるショックウェーブ。 */}
      <sprite ref={ringRef} position={[0, 0, zOffset - 0.02]}>
        <spriteMaterial map={ringTex} color="#5ec8ff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight
        ref={lightRef}
        position={[0, 0, zOffset + 0.05]}
        intensity={0}
        color="#7adcff"
        distance={7}
      />
    </>
  );
}

export function PlayerWeapon() {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const cameraMode = useBattleStore((state) => state.cameraMode);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const slashVariantRef = useRef(0);
  const slashStartedAt = useRef(0);

  useEffect(() => {
    if (lastShotAt === 0) {
      return;
    }
    if (selectedWeaponId === "windBlade") {
      slashVariantRef.current = (slashVariantRef.current + 1) % SLASH_VARIANTS;
      slashStartedAt.current = lastShotAt;
    }
  }, [lastShotAt, selectedWeaponId]);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    if (selectedWeaponId === "windBlade") {
      node.translateX(0.58);
      node.translateY(-0.54);
      node.translateZ(-0.72);
      node.rotateZ(-0.28);
      // Slash animation: every variant is now an "off-screen above → fast
      // downstrike" so the chop reads as decisive regardless of which
      // variant the rotation lands on. Variants only differ in the slight
      // angle / cross-direction the blade lands at, so a 3-hit combo still
      // has visual variety.
      //
      // Curve: ease-in (t² acceleration). The blade is parked off-frame
      // above with the tip pointed up at t=0, then falls fast through the
      // crosshair to a forward-down landing pose by t=1.
      const slashElapsed = slashStartedAt.current > 0
        ? performance.now() - slashStartedAt.current
        : Infinity;
      if (slashElapsed < SLASH_DURATION_MS) {
        const t = slashElapsed / SLASH_DURATION_MS;
        const eased = t * t;
        const w = 1 - eased; // wind-up coefficient (1 at start, 0 at end)
        // Y travels from off-screen high (t=0) → below the rest pose (t=1)
        // so the tip clearly carves past the crosshair on the way down.
        const liftY = 1.7 * w - 0.45 * eased;
        // X rotation: tip pointing up-back at t=0 → strongly forward-down at
        // t=1. The bigger end angle (0.95 rad ≈ 54°) plants the tip well
        // below the camera line for a decisive landing.
        const tiltX = -1.1 * w + eased * 0.95;
        node.translateY(liftY);
        node.rotateX(tiltX);
        switch (slashVariantRef.current) {
          case 0: // straight-down centered chop
            break;
          case 1: // down + slight left landing
            node.rotateZ(-w * 0.35 + eased * 0.18);
            node.translateX(-eased * 0.32);
            break;
          case 2: // down + slight right landing (mirror of 1)
            node.rotateZ(w * 0.35 - eased * 0.18);
            node.translateX(eased * 0.32);
            break;
          case 3: // overhead slam — adds forward thrust on impact
            node.translateZ(-eased * 0.55);
            node.translateY(-eased * 0.30);
            break;
        }
      }
    } else {
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
    }
  });

  if (cameraMode === "tps") {
    return null;
  }

  return (
    <group ref={groupRef}>
      <group rotation={weaponModelRotation(selectedWeaponId)} scale={weaponModelScale(selectedWeaponId)}>
        <WeaponObject id={selectedWeaponId} targetSize={selectedWeaponId === "windBlade" ? 1.05 : 0.6} />
      </group>
      {selectedWeaponId !== "windBlade" ? (
        <MuzzleFlash lastShotAt={lastShotAt} />
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
  const characterAccent = useBattleStore((state) => findCharacter(state.selectedCharacterId).accentColor);

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
        <group rotation={weaponModelRotation(selectedWeaponId)} scale={weaponModelScale(selectedWeaponId)}>
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
useGLTF.preload(CHARACTER_MODEL_URL.metappi);

// Sets camera FOV from the store and adds a brief "punch" on each shot / skill.
export function FovController() {
  const { camera } = useThree();
  const fov = useBattleStore((state) => state.fov);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  const status = useBattleStore((state) => state.status);
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
    // While the clear sky pan is animating, let it own the FOV / pitch so we
    // don't fight its easing.
    if (status === "clear") {
      return;
    }
    const now = performance.now();
    const shotPunch = lastShotAt > 0
      ? Math.max(0, 1 - (now - lastShotAt) / (lastShotCritical ? 220 : 120)) * (lastShotCritical ? 1.4 : 0.6)
      : 0;
    const skillPunch = lastSkillAt > 0 ? Math.max(0, 1 - (now - lastSkillAt) / 360) * 3.5 : 0;
    perspective.fov = fov + shotPunch + skillPunch;
    perspective.updateProjectionMatrix();
    if (isDebugEnabled()) {
      writeDebug({
        cameraFov: perspective.fov,
        shotPunch,
        skillPunch,
        lastSkillAt,
        sinceSkill: lastSkillAt > 0 ? now - lastSkillAt : 0,
      });
    }
  });
  return null;
}
