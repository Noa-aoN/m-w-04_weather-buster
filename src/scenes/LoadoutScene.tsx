import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import { characters, stages, weapons } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { CharacterId, StageId, WeaponId } from "../game/types";

function WeaponSilhouette({ id }: { id: WeaponId }) {
  const palette: Record<WeaponId, [string, string]> = {
    weatherGun: ["#28d9ff", "#0a3a4a"],
    clearSkyGun: ["#ffd84d", "#3a3318"],
    rainySeasonKiller: ["#4ce0b3", "#10362d"],
    stormwallRifle: ["#7ed5ff", "#0d2336"],
    frostlance: ["#bce6ff", "#15384a"],
  };
  const [accent, body] = palette[id];

  return (
    <Canvas camera={{ position: [0, 0.6, 3.4], fov: 36 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.6} color={accent} />
      <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
      <fog attach="fog" args={["#06121b", 4, 10]} />
      <mesh rotation={[0, 0.4, 0]}>
        <boxGeometry args={[1.6, 0.32, 0.42]} />
        <meshStandardMaterial color={body} metalness={0.6} roughness={0.34} />
      </mesh>
      <mesh position={[-0.4, 0.18, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.24, 0.18, 0.4]} />
        <meshStandardMaterial color="#0e1a25" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0.6, 0, 0]} rotation={[0, Math.PI / 2 + 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 16]} />
        <meshStandardMaterial color="#0c151c" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.2, 0.08, 0.06]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.5]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </Canvas>
  );
}

function CharacterPortrait({ id }: { id: CharacterId }) {
  const accent: Record<CharacterId, string> = {
    iris: "#28d9ff",
    halo: "#6cdcff",
    raika: "#ffd84d",
  };
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.18;
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.04;
    }
  });

  const tint = accent[id];

  return (
    <Canvas camera={{ position: [0, 0.6, 3.6], fov: 38 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={1.6} color={tint} />
      <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
      <fog attach="fog" args={["#06121b", 4, 10]} />
      <group ref={groupRef}>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.32, 0.32, 0.32]} />
          <meshStandardMaterial color="#1c2a35" metalness={0.65} roughness={0.32} />
        </mesh>
        <mesh position={[0.04, 0.95, 0.16]}>
          <boxGeometry args={[0.14, 0.05, 0.04]} />
          <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[0.7, 0.6, 0.5]} />
          <meshStandardMaterial color="#3a5563" metalness={0.55} roughness={0.36} />
        </mesh>
        <mesh position={[0, 0.42, 0.26]}>
          <boxGeometry args={[0.55, 0.4, 0.05]} />
          <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[-0.45, 0.4, 0]}>
          <boxGeometry args={[0.18, 0.45, 0.36]} />
          <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
        </mesh>
        <mesh position={[0.45, 0.4, 0]}>
          <boxGeometry args={[0.18, 0.45, 0.36]} />
          <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
        </mesh>
        <mesh position={[-0.18, -0.18, 0]}>
          <boxGeometry args={[0.22, 0.6, 0.3]} />
          <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
        </mesh>
        <mesh position={[0.18, -0.18, 0]}>
          <boxGeometry args={[0.22, 0.6, 0.3]} />
          <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[0.7, 0.95, 64]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
    </Canvas>
  );
}

function StagePreview({ id }: { id: StageId }) {
  const stage = useMemo(() => stages.find((s) => s.id === id) ?? stages[0], [id]);
  const lampRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!lampRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const material = lampRef.current.material as { emissiveIntensity?: number };
    material.emissiveIntensity = 0.9 + Math.sin(t * 2.4) * 0.7;
  });

  return (
    <Canvas camera={{ position: [0, 1.8, 4.4], fov: 42 }}>
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
      {[-2.4, -0.6, 1.8].map((x, index) => (
        <mesh key={x} position={[x, 0.2 + index * 0.18, -2 - index * 0.4]}>
          <boxGeometry args={[0.7, 1.2 + index * 0.4, 0.7]} />
          <meshStandardMaterial color={stage.buildingColor} emissive={stage.buildingEmissive} emissiveIntensity={0.18} metalness={0.5} roughness={0.4} />
        </mesh>
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
              <em>DMG {weapon.damage} / AMMO {weapon.maxAmmo}</em>
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
          <span>キャラ固有スキル</span>
          <strong>{previewCharacter.passiveName}</strong>
          <p>{previewCharacter.passiveDescription}</p>
        </div>
        <button
          type="button"
          className="primaryMenuButton"
          disabled={selectedId === previewCharacter.id}
          onClick={() => selectCharacter(previewCharacter.id)}
        >
          {selectedId === previewCharacter.id ? "選択中" : "このパイロットを選択"}
        </button>
      </aside>
    </div>
  );
}

export function WeaponScene({ onBack }: { onBack: () => void }) {
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectWeapon = useBattleStore((state) => state.selectWeapon);
  const [previewWeapon, setPreviewWeapon] = useState<WeaponId>(selectedWeaponId);

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>WEAPON</h1>
          <small>武装選択</small>
        </div>
        <button type="button" className="screenBack" onClick={onBack}>← ホーム</button>
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

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>PILOT</h1>
          <small>パイロット選択</small>
        </div>
        <button type="button" className="screenBack" onClick={onBack}>← ホーム</button>
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

  return (
    <main className="loadoutShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>STAGE</h1>
          <small>戦域詳細</small>
        </div>
        <button type="button" className="screenBack" onClick={onBack}>← ホーム</button>
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
