import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { EnemyAura } from "../entities/EnemyAura";
import { WeatherEnemyModel } from "../entities/WeatherEnemyModel";
import { useBattleStore } from "../game/battleStore";
import { weatherEnemies } from "../game/data";
import type { WeatherEnemyId } from "../game/types";

function EnemyCardCanvas({ enemyId }: { enemyId: WeatherEnemyId }) {
  const enemy = weatherEnemies.find((candidate) => candidate.id === enemyId) ?? weatherEnemies[0];

  return (
    <Canvas
      camera={{ position: [0, 0.8, 4.1], fov: 45 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#07131b"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={1.6} color={enemy.accentColor} />
      <pointLight position={[0, 0.6, 2]} intensity={2.4} color={enemy.coreColor} />
      <fog attach="fog" args={["#07131b", 3, 8]} />
      <EnemyAura enemyId={enemy.id} color={enemy.accentColor} />
      <WeatherEnemyModel enemy={enemy} compact />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <ringGeometry args={[0.8, 1.2, 64]} />
        <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.24, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color={enemy.accentColor} transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </Canvas>
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

  return (
    <main className="gridShell sceneEnter">
      <div className="gridBackdrop" />
      <StarsBackground />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>天候性侵害体図鑑</h1>
          <small>敵リスト</small>
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
      </header>

      <section className="enemyGrid">
        {weatherEnemies.map((enemy) => (
          <article
            key={enemy.id}
            className={`enemyCard ${enemy.id === selectedEnemyId ? "selected" : ""} ${!enemy.playableInMvp ? "locked" : ""}`}
          >
            <button type="button" onClick={() => onSelectEnemy(enemy.id)} disabled={!enemy.playableInMvp}>
              <span className="enemyIndex">{enemy.index}</span>
              <div className="enemyPreview"><EnemyCardCanvas enemyId={enemy.id} /></div>
              <div className="enemyCardFooter">
                <span className="enemyIcon">{enemy.icon}</span>
                <div>
                  <strong>{enemy.name}</strong>
                  <em>{enemy.trait}</em>
                  <p>{enemy.description}</p>
                </div>
              </div>
              {!enemy.playableInMvp ? <b className="futureBadge">準備中</b> : null}
            </button>
          </article>
        ))}
      </section>

      <footer className="gridFooter">ウェザー・バスターズ / CLEAR THE SKY</footer>
    </main>
  );
}

function StarsBackground() {
  return (
    <div className="starsLayer" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}
