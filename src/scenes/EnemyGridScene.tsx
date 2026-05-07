import { useState } from "react";
import { EnemyAura } from "../entities/EnemyAura";
import { WeatherEnemyModel } from "../entities/WeatherEnemyModel";
import { ModalShell } from "../features/modal/ModalShell";
import { CodexLayout } from "../features/modal/CodexLayout";
import { useBattleStore } from "../game/battleStore";
import { weatherEnemies } from "../game/data";
import type { WeatherEnemyId } from "../game/types";

function EnemyPreview({ enemyId }: { enemyId: WeatherEnemyId }) {
  const enemy = weatherEnemies.find((candidate) => candidate.id === enemyId) ?? weatherEnemies[0];
  return (
    <>
      <directionalLight position={[3, 4, 3]} intensity={2} color={enemy.accentColor} />
      <pointLight position={[0, 0.6, 2]} intensity={2.4} color={enemy.coreColor} />
      <EnemyAura enemyId={enemy.id} color={enemy.accentColor} />
      <WeatherEnemyModel enemy={enemy} compact />
    </>
  );
}

export function EnemyGridScene({
  onBack,
  onSelectEnemy,
}: {
  onBack: () => void;
  onSelectEnemy: (enemyId: WeatherEnemyId) => void;
}) {
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const [previewId, setPreviewId] = useState<WeatherEnemyId>(selectedEnemyId);
  const previewEnemy = weatherEnemies.find((candidate) => candidate.id === previewId) ?? weatherEnemies[0];

  return (
    <ModalShell
      variant="codex"
      eyebrow="PROJECT: WEATHER BUSTER"
      title="天候性侵害体図鑑"
      subtitle="敵リスト"
      onBack={onBack}
    >
      <CodexLayout
        entries={weatherEnemies.map((enemy) => ({
          id: enemy.id,
          index: enemy.index,
          name: enemy.name,
          trait: enemy.trait,
          locked: !enemy.playableInMvp,
          lockedLabel: "準備中",
        }))}
        selectedId={previewId}
        onSelect={(id) => setPreviewId(id)}
        renderPreview={(id) => <EnemyPreview enemyId={id} />}
        cameraDistance={4.6}
        detailHeader={(
          <>
            <span style={{ color: previewEnemy.accentColor, letterSpacing: "0.18em", fontSize: 12 }}>
              {previewEnemy.icon} {previewEnemy.trait}
            </span>
            <strong>{previewEnemy.name}</strong>
            <em>脅威レベル {previewEnemy.threat} / 推奨難易度 Lv {previewEnemy.difficulty}</em>
          </>
        )}
        detailBody={(
          <>
            <p>{previewEnemy.description}</p>
            {previewEnemy.playableInMvp ? (
              <button
                type="button"
                className="primaryMenuButton codexDetailAction"
                onClick={() => onSelectEnemy(previewId)}
              >
                この敵を出撃対象に設定
              </button>
            ) : null}
          </>
        )}
      />
    </ModalShell>
  );
}
