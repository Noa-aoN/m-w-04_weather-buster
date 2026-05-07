import { useState } from "react";
import { CharacterModel } from "../entities/CharacterModel";
import { ModalShell } from "../features/modal/ModalShell";
import { CodexLayout } from "../features/modal/CodexLayout";
import { useBattleStore } from "../game/battleStore";
import { characters } from "../game/data";
import type { CharacterId } from "../game/types";

function CharacterPreview({ id }: { id: CharacterId }) {
  const character = characters.find((c) => c.id === id) ?? characters[0];
  return (
    <>
      <directionalLight position={[3, 4, 3]} intensity={2} color={character.accentColor} />
      <pointLight position={[-2, 1, 1]} intensity={1.4} color="#27d9ff" />
      <CharacterModel id={id} accent={character.accentColor} showHaloRings={false} />
    </>
  );
}

export function CharacterGridScene({ onBack }: { onBack: () => void }) {
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectCharacter = useBattleStore((state) => state.selectCharacter);
  const [previewId, setPreviewId] = useState<CharacterId>(selectedCharacterId);
  const previewCharacter = characters.find((c) => c.id === previewId) ?? characters[0];

  return (
    <ModalShell
      variant="codex"
      eyebrow="PROJECT: WEATHER BUSTER"
      title="バスター図鑑"
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
        renderPreview={(id) => <CharacterPreview id={id} />}
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
              <div>
                <dt>与ダメージ</dt>
                <dd>×{previewCharacter.damageMultiplier.toFixed(2)}</dd>
              </div>
              <div>
                <dt>被ダメージ</dt>
                <dd>×{previewCharacter.damageTakenMultiplier.toFixed(2)}</dd>
              </div>
              <div>
                <dt>気圧蓄積</dt>
                <dd>×{previewCharacter.gaugeGainMultiplier.toFixed(2)}</dd>
              </div>
              <div>
                <dt>移動速度</dt>
                <dd>×{previewCharacter.moveSpeedMultiplier.toFixed(2)}</dd>
              </div>
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
