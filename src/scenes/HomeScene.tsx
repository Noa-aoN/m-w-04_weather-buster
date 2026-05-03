import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { useBattleStore } from "../game/battleStore";
import { findCharacter, findStage, findWeapon, stages, weatherEnemies } from "../game/data";
import { useGeolocationWeather, weatherCodeLabel } from "../features/weather/useGeolocationWeather";
import type { LoadoutTab } from "../game/types";

function StartIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="6,4 28,16 6,28" fill="currentColor" opacity="0.92" />
      <polygon points="6,4 28,16 6,28" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="18" y="4" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="18" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="18" y="18" width="10" height="10" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function LoadoutIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 L16 9 M16 23 L16 29 M3 16 L9 16 M23 16 L29 16" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 4 L18 8 L22 8 L23 12 L27 14 L26 18 L28 22 L24 23 L22 27 L18 26 L16 28 L14 26 L10 27 L8 23 L4 22 L6 18 L4 14 L8 12 L10 8 L14 8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function GpsToggle() {
  const enabled = useBattleStore((state) => state.locationEnabled);
  const setEnabled = useBattleStore((state) => state.setLocationEnabled);
  const code = useBattleStore((state) => state.currentWeatherCode);
  const enemyId = useBattleStore((state) => state.currentWeatherEnemyId);
  const label = enabled ? (code === null ? "計測中" : weatherCodeLabel(code)) : "OFF";

  return (
    <button
      type="button"
      className={`gpsToggle ${enabled ? "on" : ""}`}
      aria-pressed={enabled}
      onClick={() => setEnabled(!enabled)}
    >
      <span className="gpsDot" />
      <small>GPS</small>
      <em>{label}</em>
      {enabled && enemyId ? <b className="gpsEnemyHint">出撃候補</b> : null}
    </button>
  );
}

function HeroMech({ accent }: { accent: string }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    node.position.y = -0.05 + Math.sin(clock.getElapsedTime() * 0.6) * 0.06;
    node.rotation.y = Math.sin(clock.getElapsedTime() * 0.25) * 0.04;
  });

  return (
    <group ref={groupRef} position={[1.35, 0, 1.15]} rotation={[0, Math.PI, 0]} scale={1.14}>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.46, 0.34, 0.4]} />
        <meshStandardMaterial color="#1c2a35" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0.06, 1.74, 0.16]}>
        <boxGeometry args={[0.18, 0.06, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[1.05, 0.85, 0.7]} />
        <meshStandardMaterial color="#3a5563" metalness={0.55} roughness={0.36} />
      </mesh>
      <mesh position={[0, 1.18, 0.36]}>
        <boxGeometry args={[0.8, 0.6, 0.05]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 1.2, -0.4]}>
        <boxGeometry args={[0.68, 0.56, 0.16]} />
        <meshStandardMaterial color="#122532" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[-0.24, 1.14, -0.52]}>
        <cylinderGeometry args={[0.08, 0.08, 0.28, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <mesh position={[0.24, 1.14, -0.52]}>
        <cylinderGeometry args={[0.08, 0.08, 0.28, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <mesh position={[-0.62, 1.5, 0.04]}>
        <boxGeometry args={[0.32, 0.5, 0.5]} />
        <meshStandardMaterial color="#2c4350" metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh position={[0.62, 1.5, 0.04]}>
        <boxGeometry args={[0.32, 0.5, 0.5]} />
        <meshStandardMaterial color="#2c4350" metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh position={[-0.78, 1.05, 0.05]}>
        <boxGeometry args={[0.22, 0.78, 0.22]} />
        <meshStandardMaterial color="#1f3441" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[0.78, 1.05, 0.05]}>
        <boxGeometry args={[0.22, 0.78, 0.22]} />
        <meshStandardMaterial color="#1f3441" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[1.05, 0.95, 0.36]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color="#0d1820" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[1.18, 0.66, 0.42]} rotation={[Math.PI / 2, 0, 0.18]}>
        <cylinderGeometry args={[0.045, 0.045, 0.6, 12]} />
        <meshStandardMaterial color="#070d12" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[-0.32, 0.42, 0]}>
        <boxGeometry args={[0.36, 0.78, 0.4]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.32, 0.42, 0]}>
        <boxGeometry args={[0.36, 0.78, 0.4]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[-0.32, 0.05, 0.06]}>
        <boxGeometry args={[0.42, 0.12, 0.5]} />
        <meshStandardMaterial color="#0c1820" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0.32, 0.05, 0.06]}>
        <boxGeometry args={[0.42, 0.12, 0.5]} />
        <meshStandardMaterial color="#0c1820" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0.42]}>
        <boxGeometry args={[0.16, 0.16, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function SatelliteDish() {
  const dishRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = dishRef.current;
    if (!node) {
      return;
    }
    node.rotation.y = Math.sin(clock.getElapsedTime() * 0.18) * 0.4 + 0.3;
  });

  return (
    <group position={[6.6, 0, -3.2]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.1, 1.2, 1.1]} />
        <meshStandardMaterial color="#16242e" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 1.4, 12]} />
        <meshStandardMaterial color="#1d2c38" metalness={0.6} roughness={0.32} />
      </mesh>
      <group ref={dishRef} position={[0, 2.55, 0]}>
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <sphereGeometry args={[1.4, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <meshStandardMaterial color="#aee3ff" emissive="#28d9ff" emissiveIntensity={0.16} metalness={0.4} roughness={0.4} side={2} />
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
          <meshStandardMaterial color="#6cd6ff" emissive="#6cd6ff" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function WarningTower({ position }: { position: [number, number, number] }) {
  const lampRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!lampRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const material = lampRef.current.material as { emissiveIntensity?: number };
    material.emissiveIntensity = 0.6 + (Math.sin(t * 3) + 1) * 1.4;
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.42, 2.8, 0.42]} />
        <meshStandardMaterial color="#1a2b36" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh ref={lampRef} position={[0, 2.96, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#ff315b" emissive="#ff315b" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FloorGrid({ ringColor }: { ringColor: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#0a141c" metalness={0.32} roughness={0.5} />
      </mesh>
      {[2.6, 5.6, 9.4].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.03, 0]}
        >
          <ringGeometry args={[radius, radius + 0.18, 96]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.55 - index * 0.12}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function RainStreaks({ count = 60, color = "#7adcff", opacity = 0.42 }: { count?: number; color?: string; opacity?: number }) {
  const groupRef = useRef<Group>(null);
  const streaks = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 32,
        y: Math.random() * 10 + 1,
        z: (Math.random() - 0.5) * 18 - 4,
        speed: 5 + Math.random() * 5,
      })),
    [count],
  );

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= streaks[i].speed * delta;
      if (child.position.y < 0) {
        child.position.y = 11;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {streaks.map((streak, index) => (
        <mesh key={index} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.02, 0.55, 0.02]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function HomeSnowDrift() {
  const groupRef = useRef<Group>(null);
  const flakes = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        x: (Math.random() - 0.5) * 32,
        y: Math.random() * 11,
        z: (Math.random() - 0.5) * 18 - 4,
        speed: 0.5 + Math.random() * 0.7,
        sway: Math.random() * Math.PI * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= flakes[i].speed * delta;
      child.position.x += Math.sin(t * 1.0 + flakes[i].sway) * delta * 0.4;
      if (child.position.y < 0) {
        child.position.y = 11;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {flakes.map((flake, index) => (
        <mesh key={index} position={[flake.x, flake.y, flake.z]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#dff8ff" emissive="#dff8ff" emissiveIntensity={0.45} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ThunderFlicker() {
  const lightRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const node = lightRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    const cycle = (t % 4.5) / 4.5;
    const flash = cycle < 0.04 ? Math.sin(cycle / 0.04 * Math.PI) : 0;
    const material = node.material as { emissiveIntensity?: number; opacity?: number };
    if (material.emissiveIntensity !== undefined) {
      material.emissiveIntensity = 0.3 + flash * 4.6;
    }
    if (material.opacity !== undefined) {
      material.opacity = 0.3 + flash * 0.55;
    }
  });

  return (
    <mesh ref={lightRef} position={[0, 6, -8]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 6]} />
      <meshStandardMaterial color="#fff7a8" emissive="#fff7a8" emissiveIntensity={0.3} transparent opacity={0.3} toneMapped={false} side={2} />
    </mesh>
  );
}

function HomeStage({
  accent,
  ringColor,
  weatherCode,
}: {
  accent: string;
  ringColor: string;
  weatherCode: number | null;
}) {
  const isRain = weatherCode !== null && ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82));
  const isSnow = weatherCode !== null && ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86));
  const isThunder = weatherCode !== null && weatherCode >= 95;
  const isFog = weatherCode === 45 || weatherCode === 48;
  const isCloudy = weatherCode !== null && weatherCode >= 1 && weatherCode <= 3;
  const isClear = weatherCode === 0;

  const fogColor = isThunder ? "#0a0c14" : isSnow ? "#a7c8d8" : isFog ? "#525c66" : "#06121d";
  const fogNear = isFog ? 4 : 8;
  const fogFar = isFog ? 18 : 30;

  return (
    <>
      <color attach="background" args={[isClear ? "#1d3a52" : "#040c14"]} />
      <Sky
        sunPosition={[2, isClear ? 0.7 : 0.4, 1.6]}
        turbidity={isClear ? 4 : isThunder ? 16 : 9}
        rayleigh={isClear ? 1.6 : 3.2}
        mieCoefficient={0.04}
      />
      <Stars radius={90} depth={36} count={isCloudy || isFog || isThunder ? 360 : 900} factor={3} fade />
      <ambientLight intensity={isClear ? 0.6 : 0.35} color="#9ad5ff" />
      <directionalLight position={[3, 6, 2]} intensity={isClear ? 2.2 : 1.6} color={isClear ? "#fff7d8" : "#bdeeff"} />
      <pointLight position={[6.6, 3.2, -3.2]} intensity={1.6} color={ringColor} distance={10} />
      <pointLight position={[-4, 2.4, 1]} intensity={1.2} color="#ff315b" distance={8} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <FloorGrid ringColor={ringColor} />
      <SatelliteDish />
      <HeroMech accent={accent} />
      <WarningTower position={[-7, 0, -2.5]} />
      <WarningTower position={[-3.6, 0, -4.6]} />
      <WarningTower position={[3.4, 0, -5.2]} />

      {[-9.2, -5.6, -1.4, 2.4, 5.4, 8.6].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.7 + Math.abs(index - 2) * 0.18, -5.2 - Math.abs(index - 2.5) * 0.6]}
        >
          <boxGeometry args={[1.5, 1.4 + Math.abs(index - 2) * 0.34, 1.5]} />
          <meshStandardMaterial color="#22343f" emissive="#0a8ec2" emissiveIntensity={0.12} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {isClear ? null : isSnow ? (
        <HomeSnowDrift />
      ) : isThunder ? (
        <RainStreaks count={120} color="#a8c8d8" opacity={0.55} />
      ) : isRain ? (
        <RainStreaks count={120} color="#7adcff" opacity={0.6} />
      ) : (
        <RainStreaks count={40} color="#7adcff" opacity={0.28} />
      )}

      {isThunder ? <ThunderFlicker /> : null}
    </>
  );
}

export function HomeScene({
  onStart,
  onOpenEnemyGrid,
  onOpenLoadout,
  onOpenSettings,
}: {
  onStart: () => void;
  onOpenEnemyGrid: () => void;
  onOpenLoadout: (tab?: LoadoutTab) => void;
  onOpenSettings: () => void;
}) {
  useGeolocationWeather();
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const selectStage = useBattleStore((state) => state.selectStage);
  const selectEnemy = useBattleStore((state) => state.selectEnemy);
  const currentWeatherCode = useBattleStore((state) => state.currentWeatherCode);
  const locationEnabled = useBattleStore((state) => state.locationEnabled);

  const selectedEnemy = weatherEnemies.find((enemy) => enemy.id === selectedEnemyId) ?? weatherEnemies[0];
  const weapon = findWeapon(selectedWeaponId);
  const character = findCharacter(selectedCharacterId);
  const stage = findStage(selectedStageId);
  const playableEnemies = weatherEnemies.filter((enemy) => enemy.playableInMvp);

  function cycleStage(direction: 1 | -1) {
    const currentIndex = stages.findIndex((s) => s.id === stage.id);
    const nextIndex = (currentIndex + direction + stages.length) % stages.length;
    selectStage(stages[nextIndex].id);
  }

  function cycleEnemy(direction: 1 | -1) {
    const currentIndex = playableEnemies.findIndex((e) => e.id === selectedEnemy.id);
    const nextIndex = (currentIndex + direction + playableEnemies.length) % playableEnemies.length;
    selectEnemy(playableEnemies[nextIndex].id);
  }

  return (
    <main className="homeShell sceneEnter">
      <Canvas camera={{ position: [-1.8, 2.2, 6.5], fov: 54 }}>
        <HomeStage
          accent={character.accentColor}
          ringColor={stage.ringColor}
          weatherCode={locationEnabled ? currentWeatherCode : null}
        />
      </Canvas>

      <div className="screenFrame" aria-hidden="true" />
      <header className="homeHeader">
        <span>PROJECT: WEATHER BUSTER</span>
        <div className="homeHeaderActions">
          <GpsToggle />
          <strong>ONLINE</strong>
        </div>
      </header>

      <section className="titleBlock">
        <p>PROJECT: WEATHER BUSTER</p>
        <h1>ウェザーバスター</h1>
        <strong>CLEAR THE SKY</strong>
        <span>荒れた天候を撃ち抜き、空を晴らせ</span>
      </section>

      <nav className="mainMenu" aria-label="メインメニュー">
        <button className="primaryMenuButton menuItem" type="button" onClick={onStart}>
          <span className="menuIcon"><StartIcon /></span>
          <span className="menuLabel">ゲーム開始</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenEnemyGrid}>
          <span className="menuIcon"><GridIcon /></span>
          <span className="menuLabel">観測記録</span>
        </button>
        <button className="menuItem" type="button" onClick={() => onOpenLoadout("weapon")}>
          <span className="menuIcon"><LoadoutIcon /></span>
          <span className="menuLabel">装備</span>
        </button>
        <button className="menuItem" type="button" onClick={onOpenSettings}>
          <span className="menuIcon"><GearIcon /></span>
          <span className="menuLabel">設定</span>
        </button>
      </nav>

      <aside className="missionPreview">
        <span>MISSION PREVIEW</span>
        <div className="loadoutSummary">
          <button type="button" className="summaryCard" onClick={() => onOpenLoadout("character")}>
            <small>PILOT</small>
            <strong>{character.codename}</strong>
            <em>{character.callSign}</em>
          </button>
          <button type="button" className="summaryCard" onClick={() => onOpenLoadout("weapon")}>
            <small>WEAPON</small>
            <strong>{weapon.name}</strong>
            <em>DMG {weapon.damage}</em>
          </button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の戦域" onClick={() => cycleStage(-1)}>◀</button>
          <div className="cyclerLabel">
            <small>戦域</small>
            <strong>{stage.name}</strong>
            <button type="button" className="stageDetailLink" onClick={() => onOpenLoadout("stage")}>DETAIL</button>
          </div>
          <button type="button" className="cyclerArrow" aria-label="次の戦域" onClick={() => cycleStage(1)}>▶</button>
        </div>

        <div className="missionCycler">
          <button type="button" className="cyclerArrow" aria-label="前の敵" onClick={() => cycleEnemy(-1)}>◀</button>
          <div className="cyclerLabel">
            <small>敵</small>
            <strong>{selectedEnemy.name}</strong>
            <em>{selectedEnemy.trait}</em>
          </div>
          <button type="button" className="cyclerArrow" aria-label="次の敵" onClick={() => cycleEnemy(1)}>▶</button>
        </div>

        <span className="threatLabel">脅威レベル</span>
        <div className="threatLine" role="img" aria-label={`脅威レベル ${selectedEnemy.threat}`}>
          {Array.from({ length: 9 }, (_, index) => (
            <b key={index} className={index < selectedEnemy.threat ? "filled" : ""}>
              {index < selectedEnemy.threat ? "▲" : ""}
            </b>
          ))}
        </div>
      </aside>

      <blockquote className="pilotLog">梅雨だけは、許さない。</blockquote>
    </main>
  );
}
