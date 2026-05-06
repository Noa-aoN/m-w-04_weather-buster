import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { CharacterModel } from "../entities/CharacterModel";
import { useBattleStore } from "../game/battleStore";
import { characters } from "../game/data";
import type { CharacterId } from "../game/types";

function CharacterCardCanvas({ id, accent }: { id: CharacterId; accent: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0.78, 5.2], fov: 34 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.78, 0)}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#07131b"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={1.6} color={accent} />
      <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
      <fog attach="fog" args={["#06121b", 4, 10]} />
      <CharacterModel id={id} accent={accent} />
    </Canvas>
  );
}

export function CharacterGridScene({
  onBack,
}: {
  onBack: () => void;
}) {
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectCharacter = useBattleStore((state) => state.selectCharacter);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "h" || key === "escape" || event.key === "Escape") {
        event.preventDefault();
        onBack();
      } else if (key === "1") {
        selectCharacter(characters[0].id);
      } else if (key === "2") {
        selectCharacter(characters[1].id);
      } else if (key === "3") {
        selectCharacter(characters[2].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, selectCharacter]);

  return (
    <main className="gridShell sceneEnter">
      <div className="gridBackdrop" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>PILOT GRID</h1>
          <small>パイロット図鑑 / キャラクター選択</small>
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
      </header>

      <section className="enemyGrid characterGrid">
        {characters.map((character, index) => (
          <article
            key={character.id}
            className={`enemyCard ${character.id === selectedCharacterId ? "selected" : ""}`}
          >
            <button
              type="button"
              onClick={() => selectCharacter(character.id)}
              aria-pressed={character.id === selectedCharacterId}
            >
              <span className="enemyIndex">{`0${index + 1}`}</span>
              <div className="enemyPreview"><CharacterCardCanvas id={character.id} accent={character.accentColor} /></div>
              <div className="enemyCardFooter">
                <span className="enemyIcon" style={{ color: character.accentColor }}>✦</span>
                <div>
                  <strong>{character.codename} <em style={{ color: character.accentColor }}>/ {character.callSign}</em></strong>
                  <em>{character.role} / {character.passiveName}</em>
                  <q className="characterFlavor" style={{ color: character.accentColor }}>{character.flavor}</q>
                  <p>{character.description}</p>
                </div>
              </div>
              <b className="characterKeyHint">({index + 1})</b>
            </button>
          </article>
        ))}
      </section>

      <footer className="gridFooter">PILOT GRID / Press 1-3 to select / H to back</footer>
    </main>
  );
}
