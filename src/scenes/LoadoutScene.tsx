import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import { CharacterModel } from "../entities/CharacterModel";
import { WeaponModel } from "../entities/WeaponModel";
import { characters, stages, weapons } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { CharacterId, StageId, WeaponId } from "../game/types";
import { assetUrl } from "../shared/assets";

function useBackKey(onBack: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "h" || event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);
}

const WEAPON_ACCENT: Record<WeaponId, string> = {
  weatherGun: "#28d9ff",
  clearSkyGun: "#ffd84d",
  rainySeasonKiller: "#4ce0b3",
  stormwallRifle: "#7ed5ff",
  frostlance: "#bce6ff",
  windBlade: "#fff0a2",
};

function WeaponSilhouette({ id }: { id: WeaponId }) {
  const accent = WEAPON_ACCENT[id];
  return (
    <Canvas
      camera={{ position: [0, 0.6, 3.0], fov: 36 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.8} color={accent} />
      <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
      <fog attach="fog" args={["#06121b", 5, 12]} />
      <WeaponModel id={id} accent={accent} />
    </Canvas>
  );
}

const CHARACTER_ACCENT: Record<CharacterId, string> = {
  noa: "#28d9ff",
  saka: "#ffd84d",
};

function CharacterPortrait({ id }: { id: CharacterId }) {
  const tint = CHARACTER_ACCENT[id];
  return (
    <Canvas
      camera={{ position: [0, 0.4, 3.6], fov: 38 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.8} color={tint} />
      <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
      <fog attach="fog" args={["#06121b", 5, 12]} />
      <CharacterModel id={id} accent={tint} />
    </Canvas>
  );
}

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

function StagePreview({ id }: { id: StageId }) {
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
    <Canvas
      camera={{ position: [0, 1.8, 4.4], fov: 42 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
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
    </Canvas>
  );
}

function WeaponTab({
  selectedId,
  previewId,
  setPreviewId,
  selectWeapon,
}: {
  selectedId: WeaponId;
  previewId: WeaponId;
  setPreviewId: (id: WeaponId) => void;
  selectWeapon: (id: WeaponId) => void;
}) {
  const previewWeapon = weapons.find((w) => w.id === previewId) ?? weapons[0];
  return (
    <div className="loadoutLayout">
      <div className="weaponList">
        {weapons.map((weapon, index) => (
          <article
            key={weapon.id}
            className={`weaponCard ${weapon.id === selectedId ? "selected" : ""} ${weapon.id === previewId ? "active" : ""}`}
          >
            <button
              type="button"
              onMouseEnter={() => setPreviewId(weapon.id)}
              onFocus={() => setPreviewId(weapon.id)}
              onClick={() => {
                setPreviewId(weapon.id);
                selectWeapon(weapon.id);
              }}
            >
              <span className="weaponIndex">{String(index + 1).padStart(2, "0")}</span>
              <strong>{weapon.name}</strong>
              <em>攻撃力 {weapon.damage} / 装弾 {weapon.maxAmmo}</em>
              <p>{weapon.description}</p>
            </button>
          </article>
        ))}
      </div>

      <aside className="weaponDetail tacticalPanel">
        <div className="weaponDetailPreview">
          <WeaponSilhouette id={previewWeapon.id} />
        </div>
        <h2>{previewWeapon.name}</h2>
        <p className="weaponDescription">{previewWeapon.description}</p>
        <dl className="weaponStats">
          <div><dt>ダメージ</dt><dd>{previewWeapon.damage}</dd></div>
          <div><dt>最大装弾数</dt><dd>{previewWeapon.maxAmmo}</dd></div>
          <div><dt>連射間隔</dt><dd>{previewWeapon.fireRateMs}ms</dd></div>
        </dl>
        <div className="weaponSkill">
          <span>武器スキル</span>
          <strong>{previewWeapon.skillName}</strong>
          <p>{previewWeapon.skillDescription}</p>
        </div>
        {previewWeapon.specialtyAgainst.length > 0 ? (
          <div className="weaponSpecialty">
            <span>特効</span>
            <strong>x{previewWeapon.specialtyMultiplier.toFixed(2)}</strong>
            <p>対象: {previewWeapon.specialtyAgainst.join(" / ")}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="primaryMenuButton"
          disabled={selectedId === previewWeapon.id}
          onClick={() => selectWeapon(previewWeapon.id)}
        >
          {selectedId === previewWeapon.id ? "装備中" : "この武器を装備"}
        </button>
      </aside>
    </div>
  );
}

function CharacterTab({
  selectedId,
  previewId,
  setPreviewId,
  selectCharacter,
}: {
  selectedId: CharacterId;
  previewId: CharacterId;
  setPreviewId: (id: CharacterId) => void;
  selectCharacter: (id: CharacterId) => void;
}) {
  const previewCharacter = characters.find((c) => c.id === previewId) ?? characters[0];
  return (
    <div className="loadoutLayout">
      <div className="weaponList">
        {characters.map((character, index) => (
          <article
            key={character.id}
            className={`weaponCard ${character.id === selectedId ? "selected" : ""} ${character.id === previewId ? "active" : ""}`}
          >
            <button
              type="button"
              onMouseEnter={() => setPreviewId(character.id)}
              onFocus={() => setPreviewId(character.id)}
              onClick={() => {
                setPreviewId(character.id);
                selectCharacter(character.id);
              }}
            >
              <span className="weaponIndex">{String(index + 1).padStart(2, "0")}</span>
              <strong>{character.codename} <em>{character.callSign}</em></strong>
              <em>{character.role} / {character.passiveName}</em>
              <p>{character.description}</p>
            </button>
          </article>
        ))}
      </div>

      <aside className="weaponDetail tacticalPanel">
        <div className="weaponDetailPreview">
          <CharacterPortrait id={previewCharacter.id} />
        </div>
        <h2>{previewCharacter.codename} <em>/ {previewCharacter.callSign}</em></h2>
        <p className="weaponDescription">{previewCharacter.description}</p>
        <dl className="weaponStats">
          <div><dt>与ダメージ</dt><dd>x{previewCharacter.damageMultiplier.toFixed(2)}</dd></div>
          <div><dt>被ダメージ</dt><dd>x{previewCharacter.damageTakenMultiplier.toFixed(2)}</dd></div>
          <div><dt>気圧蓄積</dt><dd>x{previewCharacter.gaugeGainMultiplier.toFixed(2)}</dd></div>
        </dl>
        <div className="weaponSkill">
          <span>バスター固有スキル</span>
          <strong>{previewCharacter.passiveName}</strong>
          <p>{previewCharacter.passiveDescription}</p>
        </div>
        <button
          type="button"
          className="primaryMenuButton"
          disabled={selectedId === previewCharacter.id}
          onClick={() => selectCharacter(previewCharacter.id)}
        >
          {selectedId === previewCharacter.id ? "選択中" : "このバスターを選択"}
        </button>
      </aside>
    </div>
  );
}

export function WeaponScene({ onBack }: { onBack: () => void }) {
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectWeapon = useBattleStore((state) => state.selectWeapon);
  const [previewWeapon, setPreviewWeapon] = useState<WeaponId>(selectedWeaponId);
  useBackKey(onBack);

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>武器庫</h1>
          <small>武装を選ぶ</small>
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
      </header>

      <WeaponTab
        selectedId={selectedWeaponId}
        previewId={previewWeapon}
        setPreviewId={setPreviewWeapon}
        selectWeapon={selectWeapon}
      />
    </main>
  );
}

export function PilotScene({ onBack }: { onBack: () => void }) {
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectCharacter = useBattleStore((state) => state.selectCharacter);
  const [previewCharacter, setPreviewCharacter] = useState<CharacterId>(selectedCharacterId);
  useBackKey(onBack);

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>バスター</h1>
          <small>バスターを選ぶ</small>
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
      </header>

      <CharacterTab
        selectedId={selectedCharacterId}
        previewId={previewCharacter}
        setPreviewId={setPreviewCharacter}
        selectCharacter={selectCharacter}
      />
    </main>
  );
}

export function StageScene({ onBack }: { onBack: () => void }) {
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const stage = stages.find((candidate) => candidate.id === selectedStageId) ?? stages[0];
  useBackKey(onBack);

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>戦域</h1>
          <small>戦域の詳細</small>
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
      </header>

      <section className="stageDetailLayout">
        <div className="stageDetailPreview tacticalPanel">
          <StagePreview id={stage.id} />
        </div>
        <aside className="stageDetailPanel tacticalPanel">
          <span>{stage.id.toUpperCase()}</span>
          <h2>{stage.name}</h2>
          <p className="weaponDescription">{stage.description}</p>
          <dl className="weaponStats">
            <div><dt>環境光</dt><dd style={{ color: stage.ambientColor }}>{stage.ambientColor}</dd></div>
            <div><dt>リング</dt><dd style={{ color: stage.ringColor }}>{stage.ringColor}</dd></div>
            <div><dt>霧</dt><dd style={{ color: stage.fogColor }}>{stage.fogColor}</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
