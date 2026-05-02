import { Canvas } from "@react-three/fiber";
import { WeatherEnemyModel } from "../entities/WeatherEnemyModel";
import { weatherEnemies } from "../game/data";
import type { WeatherEnemyId } from "../game/types";

function EnemyCardCanvas({ enemyId }: { enemyId: WeatherEnemyId }) {
  const enemy = weatherEnemies.find((candidate) => candidate.id === enemyId) ?? weatherEnemies[0];

  return (
    <Canvas camera={{ position: [0, 0.8, 4.1], fov: 45 }}>
      <color attach="background" args={["#07131b"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 3]} intensity={1.8} color={enemy.accentColor} />
      <pointLight position={[0, 0.6, 2]} intensity={2.2} color={enemy.coreColor} />
      <WeatherEnemyModel enemy={enemy} compact />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <ringGeometry args={[0.8, 1.2, 64]} />
        <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={0.45} />
      </mesh>
    </Canvas>
  );
}

export function EnemyGridScene({
  selectedEnemyId,
  onBack,
  onSelectEnemy,
}: {
  selectedEnemyId: WeatherEnemyId;
  onBack: () => void;
  onSelectEnemy: (enemyId: WeatherEnemyId) => void;
}) {
  return (
    <main className="gridShell">
      <div className="gridBackdrop" />
      <StarsBackground />
      <header className="gridHeader">
        <div>
          <h1>WEATHER ENEMY GRID</h1>
          <span>ウェザーエネミー図鑑</span>
        </div>
        <button type="button" onClick={onBack}>戻る</button>
      </header>

      <section className="enemyGrid">
        {weatherEnemies.map((enemy) => (
          <article key={enemy.id} className={`enemyCard ${enemy.id === selectedEnemyId ? "selected" : ""}`}>
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
              {!enemy.playableInMvp ? <b className="futureBadge">拡張候補</b> : null}
            </button>
          </article>
        ))}
      </section>

      <footer className="gridFooter">ウェザーバスター / CLEAR THE SKY</footer>
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
