import { Canvas } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { weatherEnemies } from "../game/data";
import type { WeatherEnemyId } from "../game/types";

function HomeStage() {
  return (
    <>
      <color attach="background" args={["#061019"]} />
      <Sky sunPosition={[2, 0.6, 1.6]} turbidity={9} rayleigh={3.2} mieCoefficient={0.04} />
      <Stars radius={90} depth={36} count={900} factor={3} fade />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.8} color="#bdeeff" />
      <fog attach="fog" args={["#07131d", 10, 28]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[34, 34, 20, 20]} />
        <meshStandardMaterial color="#101b23" metalness={0.28} roughness={0.32} />
      </mesh>
      {[-6, -2, 2.5, 6.5].map((x, index) => (
        <mesh key={x} position={[x, 0.7 + index * 0.16, -4.5 - index * 0.9]}>
          <boxGeometry args={[1.8, 1.4 + index * 0.32, 1.8]} />
          <meshStandardMaterial color="#263843" emissive="#0a8ec2" emissiveIntensity={0.08} />
        </mesh>
      ))}
      <mesh position={[0, 1.2, -3.1]}>
        <capsuleGeometry args={[0.36, 1.4, 8, 18]} />
        <meshStandardMaterial color="#445348" metalness={0.5} roughness={0.28} />
      </mesh>
    </>
  );
}

export function HomeScene({
  selectedEnemyId,
  onStart,
  onOpenEnemyGrid,
}: {
  selectedEnemyId: WeatherEnemyId;
  onStart: () => void;
  onOpenEnemyGrid: () => void;
}) {
  const selectedEnemy = weatherEnemies.find((enemy) => enemy.id === selectedEnemyId) ?? weatherEnemies[0];

  return (
    <main className="homeShell">
      <Canvas camera={{ position: [0, 2.4, 7.5], fov: 54 }}>
        <HomeStage />
      </Canvas>

      <div className="screenFrame" aria-hidden="true" />
      <header className="homeHeader">
        <span>PROJECT: WEATHER BUSTER</span>
        <strong>ONLINE</strong>
      </header>

      <section className="titleBlock">
        <p>PROJECT: WEATHER BUSTER</p>
        <h1>ウェザーバスター</h1>
        <strong>CLEAR THE SKY</strong>
        <span>荒れた天候を撃ち抜き、空を晴らせ</span>
      </section>

      <nav className="mainMenu" aria-label="メインメニュー">
        <button className="primaryMenuButton" type="button" onClick={onStart}>
          ◎ ゲーム開始
        </button>
        <button type="button" onClick={onOpenEnemyGrid}>
          ▣ 観測記録
        </button>
        <button type="button">⚒ 装備</button>
        <button type="button">⚙ 設定</button>
      </nav>

      <aside className="missionPreview">
        <span>MISSION PREVIEW</span>
        <div className="previewStage">
          <i />
          <i />
          <i />
        </div>
        <p>観測区域: 実験場</p>
        <p>敵候補: {weatherEnemies.map((enemy) => enemy.name).join(" / ")}</p>
        <div className="threatLine">
          {Array.from({ length: 9 }, (_, index) => (
            <b key={index} className={index < selectedEnemy.threat ? "filled" : ""} />
          ))}
        </div>
      </aside>

      <blockquote className="pilotLog">梅雨だけは、許さない。</blockquote>
    </main>
  );
}
