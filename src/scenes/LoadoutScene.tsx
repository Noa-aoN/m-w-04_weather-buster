import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import { CharacterModel } from "../entities/CharacterModel";
import { WeaponModel } from "../entities/WeaponModel";
import { ModalShell } from "../features/modal/ModalShell";
import { CodexLayout } from "../features/modal/CodexLayout";
import { characters, stages, weapons } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { CharacterId, StageId, WeaponId } from "../game/types";
import { assetUrl } from "../shared/assets";

const WEAPON_ACCENT: Record<WeaponId, string> = {
  weatherGun: "#28d9ff",
  clearSkyGun: "#ffd84d",
  rainySeasonKiller: "#4ce0b3",
  stormwallRifle: "#7ed5ff",
  frostlance: "#bce6ff",
  windBlade: "#fff0a2",
};

const STAGE_DECOR: Record<StageId, Array<{ url: string; x: number; z: number; scale: number; rotY?: number }>> = {
  lab: [
    { url: "/models/space-kit/machine_generator.glb", x: -2.2, z: -1.6, scale: 0.6 },
    { url: "/models/space-kit/machine_barrel.glb", x: 0.4, z: -1.8, scale: 0.7 },
    { url: "/models/space-kit/structure.glb", x: 2.4, z: -1.4, scale: 0.6 },
    { url: "/models/space-kit/satelliteDish.glb", x: -3, z: -2.4, scale: 0.5 },
  ],
  ruins: [
    { url: "/models/space-kit/rocks_smallA.glb", x: -2.5, z: -1.8, scale: 1.2 },
    { url: "/models/space-kit/rock.glb", x: 0.2, z: -2.0, scale: 1.4, rotY: 0.6 },
    { url: "/models/tower-defense-kit/tower-square-bottom-c.glb", x: 2.4, z: -1.6, scale: 0.7 },
    { url: "/models/space-kit/machine_barrelLarge.glb", x: -3.4, z: -1.2, scale: 0.55 },
  ],
  highland: [
    { url: "/models/space-kit/rock_crystalsLargeA.glb", x: -2.4, z: -1.8, scale: 0.9 },
    { url: "/models/space-kit/rock_crystalsLargeB.glb", x: 2.2, z: -1.6, scale: 0.9, rotY: 1.0 },
    { url: "/models/space-kit/rock_largeA.glb", x: 0.4, z: -2.4, scale: 0.8 },
    { url: "/models/space-kit/hangar_roundGlass.glb", x: 0, z: -3.2, scale: 0.7 },
  ],
};

function StageDecorItem({ url, x, z, scale, rotY = 0 }: { url: string; x: number; z: number; scale: number; rotY?: number }) {
  const { scene } = useGLTF(assetUrl(url));
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={[x, -0.4, z]} rotation={[0, rotY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

function StagePreviewScene({ id }: { id: StageId }) {
  const stage = useMemo(() => stages.find((s) => s.id === id) ?? stages[0], [id]);
  const lampRef = useRef<Mesh>(null);
  const decor = STAGE_DECOR[id] ?? [];

  useFrame(({ clock }) => {
    if (!lampRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const material = lampRef.current.material as { emissiveIntensity?: number };
    material.emissiveIntensity = 0.9 + Math.sin(t * 2.4) * 0.7;
  });

  return (
    <>
      <color attach="background" args={[stage.fogColor]} />
      <ambientLight intensity={0.6} color={stage.ambientColor} />
      <directionalLight position={[3, 5, 2]} intensity={1.5} color={stage.ringColor} />
      <fog attach="fog" args={[stage.fogColor, 5, 14]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={stage.groundColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, 0]}>
        <ringGeometry args={[1.5, 1.65, 64]} />
        <meshBasicMaterial color={stage.ringColor} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, 0]}>
        <ringGeometry args={[2.8, 2.95, 64]} />
        <meshBasicMaterial color={stage.ringColor} transparent opacity={0.32} toneMapped={false} />
      </mesh>
      {decor.map((item, idx) => (
        <StageDecorItem key={idx} {...item} />
      ))}
      <mesh ref={lampRef} position={[2.6, 1.2, -1.6]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={stage.ringColor} emissive={stage.ringColor} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </>
  );
}

const WEAPON_ACCENT_FALLBACK = "#28d9ff";

export function WeaponScene({ onBack }: { onBack: () => void }) {
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectWeapon = useBattleStore((state) => state.selectWeapon);
  const [previewId, setPreviewId] = useState<WeaponId>(selectedWeaponId);
  const previewWeapon = weapons.find((w) => w.id === previewId) ?? weapons[0];

  return (
    <ModalShell
      variant="codex"
      eyebrow="PROJECT: WEATHER BUSTER"
      title="ウェポン図鑑"
      subtitle="ウェポンを選ぶ"
      onBack={onBack}
    >
      <CodexLayout
        entries={weapons.map((weapon, index) => ({
          id: weapon.id,
          index: String(index + 1).padStart(2, "0"),
          name: weapon.name,
          trait: `${weapon.damage} DMG / ${weapon.maxAmmo} AMMO`,
        }))}
        selectedId={previewId}
        onSelect={(id) => setPreviewId(id)}
        renderPreview={(id) => (
          <>
            <directionalLight position={[3, 4, 3]} intensity={2} color={WEAPON_ACCENT[id] ?? WEAPON_ACCENT_FALLBACK} />
            <pointLight position={[-2, 1, 1]} intensity={1.4} color="#27d9ff" />
            <WeaponModel id={id} accent={WEAPON_ACCENT[id] ?? WEAPON_ACCENT_FALLBACK} showHaloRings={false} />
          </>
        )}
        cameraDistance={2.8}
        cameraTarget={[0, 0, 0]}
        detailHeader={(
          <>
            <span style={{ color: WEAPON_ACCENT[previewWeapon.id] ?? WEAPON_ACCENT_FALLBACK, letterSpacing: "0.18em", fontSize: 12 }}>
              {previewWeapon.specialtyAgainst.length > 0
                ? `特効 ×${previewWeapon.specialtyMultiplier.toFixed(2)} (${previewWeapon.specialtyAgainst.join(" / ")})`
                : "汎用"}
            </span>
            <strong>{previewWeapon.name}</strong>
            <em>{previewWeapon.skillName}</em>
          </>
        )}
        detailBody={(
          <>
            <p>{previewWeapon.description}</p>
            <dl>
              <div><dt>攻撃力</dt><dd>{previewWeapon.damage}</dd></div>
              <div><dt>装弾</dt><dd>{previewWeapon.maxAmmo}</dd></div>
              <div><dt>連射間隔</dt><dd>{previewWeapon.fireRateMs}ms</dd></div>
            </dl>
            <p style={{ color: "#ddebf3" }}>{previewWeapon.skillDescription}</p>
            <button
              type="button"
              className="primaryMenuButton codexDetailAction"
              disabled={selectedWeaponId === previewWeapon.id}
              onClick={() => selectWeapon(previewWeapon.id)}
            >
              {selectedWeaponId === previewWeapon.id ? "装備中" : "このウェポンを装備"}
            </button>
          </>
        )}
      />
    </ModalShell>
  );
}

export function PilotScene({ onBack }: { onBack: () => void }) {
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectCharacter = useBattleStore((state) => state.selectCharacter);
  const [previewId, setPreviewId] = useState<CharacterId>(selectedCharacterId);
  const previewCharacter = characters.find((c) => c.id === previewId) ?? characters[0];

  return (
    <ModalShell
      variant="codex"
      eyebrow="PROJECT: WEATHER BUSTER"
      title="バスター"
      subtitle="バスターを選ぶ"
      onBack={onBack}
    >
      <CodexLayout
        entries={characters.map((character) => ({
          id: character.id,
          name: character.codename,
          trait: `${character.callSign} / ${character.role}`,
        }))}
        selectedId={previewId}
        onSelect={(id) => setPreviewId(id)}
        renderPreview={(id) => {
          const c = characters.find((char) => char.id === id) ?? characters[0];
          return (
            <>
              <directionalLight position={[3, 4, 3]} intensity={2} color={c.accentColor} />
              <pointLight position={[-2, 1, 1]} intensity={1.4} color="#27d9ff" />
              <CharacterModel id={id} accent={c.accentColor} showHaloRings={false} />
            </>
          );
        }}
        cameraDistance={3.6}
        cameraTarget={[0, 0.85, 0]}
        cameraPosition={[0, 0.95, 3.6]}
        fov={36}
        detailHeader={(
          <>
            <span style={{ color: previewCharacter.accentColor, letterSpacing: "0.18em", fontSize: 12 }}>
              {previewCharacter.callSign} / {previewCharacter.role}
            </span>
            <strong>{previewCharacter.codename}</strong>
            <em>{previewCharacter.passiveName}</em>
          </>
        )}
        detailBody={(
          <>
            <p>{previewCharacter.description}</p>
            <q className="characterFlavor" style={{ color: previewCharacter.accentColor }}>
              {previewCharacter.flavor}
            </q>
            <dl>
              <div><dt>与ダメージ</dt><dd>×{previewCharacter.damageMultiplier.toFixed(2)}</dd></div>
              <div><dt>被ダメージ</dt><dd>×{previewCharacter.damageTakenMultiplier.toFixed(2)}</dd></div>
              <div><dt>気圧蓄積</dt><dd>×{previewCharacter.gaugeGainMultiplier.toFixed(2)}</dd></div>
              <div><dt>移動速度</dt><dd>×{previewCharacter.moveSpeedMultiplier.toFixed(2)}</dd></div>
            </dl>
            <button
              type="button"
              className="primaryMenuButton codexDetailAction"
              disabled={selectedCharacterId === previewId}
              onClick={() => selectCharacter(previewId)}
            >
              {selectedCharacterId === previewId ? "選択中" : "このバスターを選択"}
            </button>
          </>
        )}
      />
    </ModalShell>
  );
}

export function StageScene({ onBack }: { onBack: () => void }) {
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const selectStage = useBattleStore((state) => state.selectStage);
  const [previewId, setPreviewId] = useState<StageId>(selectedStageId);
  const stage = stages.find((candidate) => candidate.id === previewId) ?? stages[0];

  return (
    <ModalShell
      variant="codex"
      eyebrow="PROJECT: WEATHER BUSTER"
      title="ステージ図鑑"
      subtitle="ステージを選ぶ"
      onBack={onBack}
    >
      <CodexLayout
        entries={stages.map((s, index) => ({
          id: s.id,
          index: String(index + 1).padStart(2, "0"),
          name: s.name,
          trait: s.id.toUpperCase(),
        }))}
        selectedId={previewId}
        onSelect={(id) => setPreviewId(id)}
        renderPreview={(id) => <StagePreviewScene id={id} />}
        cameraDistance={6.2}
        cameraTarget={[0, 0.4, 0]}
        cameraPosition={[0, 2.0, 6.2]}
        fov={42}
        detailHeader={(
          <>
            <span style={{ color: stage.ringColor, letterSpacing: "0.18em", fontSize: 12 }}>
              {stage.id.toUpperCase()}
            </span>
            <strong>{stage.name}</strong>
          </>
        )}
        detailBody={(
          <>
            <p>{stage.description}</p>
            <dl>
              <div>
                <dt>広さ</dt>
                <dd>{Math.round(stage.arena.x * 2)}×{Math.round(stage.arena.zBack - stage.arena.zFront)} m</dd>
              </div>
              <div>
                <dt>視界</dt>
                <dd>{stage.skyTurbidity <= 5 ? "良好" : stage.skyTurbidity <= 10 ? "標準" : "霞"}</dd>
              </div>
              <div>
                <dt>地形</dt>
                <dd>{stage.id === "lab" ? "対称・平坦" : stage.id === "ruins" ? "瓦礫・遮蔽" : "起伏あり"}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="primaryMenuButton codexDetailAction"
              disabled={selectedStageId === previewId}
              onClick={() => selectStage(previewId)}
            >
              {selectedStageId === previewId ? "選択中" : "このステージを選択"}
            </button>
          </>
        )}
      />
    </ModalShell>
  );
}
