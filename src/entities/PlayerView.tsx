import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationClip, Group, Mesh, PerspectiveCamera, PointLight, Sprite } from "three";
import { AdditiveBlending, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useBattleStore } from "../game/battleStore";
import { findCharacter } from "../game/data";
import type { WeaponId } from "../game/types";
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

// 各兵器のマズルフラッシュ配色。core は trail tail の warm cream を基本とし
// 兵器の温度感（凍結カノンは寒色、ウェザー系は cyan、晴天系は warm 黄）に
// 応じて inner/outer ring と pointLight 色を変える。
type FlashPalette = { core: string; inner: string; outer: string; light: string };
const WEAPON_FLASH: Record<WeaponId, FlashPalette> = {
  // 汎用ブラスター — warm cream core + シアン rings
  weatherGun:        { core: "#fff7d0", inner: "#d4f6ff", outer: "#28d9ff", light: "#28d9ff" },
  // 晴天向け — 全体に暖色寄り、太陽光イメージ
  clearSkyGun:       { core: "#fffbe5", inner: "#fff0a8", outer: "#ffd84d", light: "#ffd84d" },
  // 梅雨対策 — teal、湿度・水蒸気イメージ
  rainySeasonKiller: { core: "#f0fff5", inner: "#c4f5e0", outer: "#4ce0b3", light: "#4ce0b3" },
  // ストームウォール — クールシアン
  stormwallRifle:    { core: "#fff7d0", inner: "#cdebff", outer: "#7ed5ff", light: "#7ed5ff" },
  // 凍結カノン — 寒色一色、冷気イメージ
  frostlance:        { core: "#f0faff", inner: "#dff0ff", outer: "#9fd8ff", light: "#bce6ff" },
  // 近接 — マズルフラッシュは出ないが palette は型のため用意
  windBlade:         { core: "#fff7d0", inner: "#fff0a8", outer: "#fff0a2", light: "#fff0a2" },
};

// First-person weapon: tracks camera quaternion every frame, with a kicked
// recoil that decays over 130ms.
//
// For windBlade, left click triggers one of four varied slash animations
// (right→left swipe, diagonal cross, forward thrust, vertical chop) cycled
// through so consecutive clicks visibly differ.
const SLASH_DURATION_MS = 180;
const SLASH_VARIANTS = 4;

/**
 * マズルフラッシュ（光線銃 / レーザー兵器テイスト）。発射点に同心の 3 リング
 * を重ねて短時間で広がる「エネルギー放出」を表現する。煙系は持たない。
 * カラーは弾道トレイル（white core + cream tail + cyan/gold mid）に揃え、
 * 中心は warm cream、外側は cyan に寄せる。
 *  - core      : circle_01 (soft glow) — 90ms、ピーク後すぐ消える熱核
 *  - innerRing : circle_03 (sharp ring) — 130ms、中速で 2 倍まで拡張
 *  - outerRing : circle_05 (soft ring) — 220ms、外側へゆっくり 3 倍に拡張
 *  - 寒色 pointLight — 110ms で消える
 */
function MuzzleFlash({
  lastShotAt,
  palette,
  zOffset = -0.62,
}: {
  lastShotAt: number;
  palette: FlashPalette;
  zOffset?: number;
}) {
  const coreTex = useTexture(MUZZLE_TEX_URL);
  const innerTex = useTexture(FLARE_TEX_URL);
  const outerTex = useTexture(SMOKE_TEX_URL);
  const coreRef = useRef<Sprite>(null);
  const innerRef = useRef<Sprite>(null);
  const outerRef = useRef<Sprite>(null);
  const lightRef = useRef<PointLight>(null);

  // ショット毎にランダム化する値。連射が「同じハンコ」に見えないよう
  // core scale をわずかに揺らす。
  const seenShotRef = useRef(0);
  const coreJitterRef = useRef(1);

  useFrame(() => {
    if (lastShotAt !== seenShotRef.current) {
      seenShotRef.current = lastShotAt;
      coreJitterRef.current = 0.94 + Math.random() * 0.16;
    }

    const elapsed = lastShotAt > 0 ? performance.now() - lastShotAt : Infinity;

    // core: 0ms ピーク → 90ms で 0、ほぼ拡張しない
    const coreK = Math.max(0, 1 - elapsed / 90);
    if (coreRef.current) {
      const s = coreJitterRef.current * (0.42 + coreK * 0.18);
      coreRef.current.scale.set(s, s, 1);
      const mat = coreRef.current.material as { opacity: number };
      mat.opacity = coreK;
      coreRef.current.visible = coreK > 0.01;
    }

    // innerRing: 0ms 小→ 130ms で約 2 倍、(1-t)^1.2 で fade
    const innerT = elapsed / 130;
    const innerK = innerT < 1 ? (1 - innerT) ** 1.2 : 0;
    if (innerRef.current) {
      const s = 0.55 + innerT * 0.75;
      innerRef.current.scale.set(s, s, 1);
      const mat = innerRef.current.material as { opacity: number };
      mat.opacity = innerK * 0.95;
      innerRef.current.visible = innerK > 0.01;
    }

    // outerRing: 0ms 中→ 220ms で約 3 倍、(1-t)^1.5 でゆっくり fade
    const outerT = elapsed / 220;
    const outerK = outerT < 1 ? (1 - outerT) ** 1.5 : 0;
    if (outerRef.current) {
      const s = 0.7 + outerT * 1.6;
      outerRef.current.scale.set(s, s, 1);
      const mat = outerRef.current.material as { opacity: number };
      mat.opacity = outerK * 0.7;
      outerRef.current.visible = outerK > 0.01;
    }

    // light: 110ms で 0、cool な cyan（trail mid と同系）
    if (lightRef.current) {
      const lightK = Math.max(0, 1 - elapsed / 110);
      lightRef.current.intensity = lightK * 14;
      lightRef.current.visible = lightK > 0.01;
    }
  });

  return (
    <>
      {/* 熱核: 弾の発射元を示す中心。warm cream を基本に兵器ごと微調整。 */}
      <sprite ref={coreRef} position={[0, 0, zOffset + 0.02]}>
        <spriteMaterial map={coreTex} color={palette.core} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* 内リング: 兵器カラーの明るい寄り、ショット直後の核近傍の余韻。 */}
      <sprite ref={innerRef} position={[0, 0, zOffset + 0.01]}>
        <spriteMaterial map={innerTex} color={palette.inner} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* 外リング: 兵器カラーで外側へ広がるショックウェーブ。 */}
      <sprite ref={outerRef} position={[0, 0, zOffset]}>
        <spriteMaterial map={outerTex} color={palette.outer} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight
        ref={lightRef}
        position={[0, 0, zOffset + 0.05]}
        intensity={0}
        color={palette.light}
        distance={7}
      />
    </>
  );
}

// MuzzleFlash の sprite material は ref 経由で color を変えていないため、
// 武器切替時はコンポーネントを再マウントして material color を作り直す
// 必要がある。親側で key={selectedWeaponId} を渡してコンポーネント刷新を強制する。

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
        <MuzzleFlash
          key={selectedWeaponId}
          lastShotAt={lastShotAt}
          palette={WEAPON_FLASH[selectedWeaponId]}
        />
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
