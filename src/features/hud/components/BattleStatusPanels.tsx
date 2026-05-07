import { HudPanel } from "./HudPanel";
import { HudMeter, HudStatRow } from "./HudStats";

export function PlayerStatusPanel({
  characterCodename,
  decoyActive,
  playerHp,
  playerMaxHp,
  playerHpRatio,
  pressureGauge,
  shieldActive,
  shieldEnergy,
}: {
  characterCodename: string;
  decoyActive: boolean;
  playerHp: number;
  playerMaxHp: number;
  playerHpRatio: number;
  pressureGauge: number;
  shieldActive: boolean;
  shieldEnergy: number;
}) {
  return (
    <HudPanel className="playerStatus">
      <HudStatRow
        label={`耐候値 / ${characterCodename}`}
        value={`${Math.round(playerHp).toLocaleString()} / ${playerMaxHp.toLocaleString()}`}
      />
      <HudMeter tone="cyan" value={playerHpRatio * 100} />
      <HudStatRow label={decoyActive ? "気圧ゲージ / 囮展開中" : "気圧ゲージ"} value={`${Math.round(pressureGauge)}%`} />
      <HudMeter tone="yellow" value={pressureGauge} />
      <HudStatRow label={shieldActive ? "気象シールド / 展開中" : "気象シールド"} value={`${Math.round(shieldEnergy)}%`} />
      <HudMeter tone="shield" value={shieldEnergy} />
    </HudPanel>
  );
}

export function BossStatusBar({
  enemyName,
  hpRatio,
  staggered,
}: {
  enemyName: string;
  hpRatio: number;
  staggered: boolean;
}) {
  return (
    <div className={`bossBar ${staggered ? "bossBar--staggered" : ""}`}>
      <strong>{enemyName}</strong>
      {staggered ? <span className="bossBarStagger">硬直</span> : null}
      <div><i style={{ width: `${Math.max(0, Math.min(1, hpRatio)) * 100}%` }} /></div>
    </div>
  );
}

export function ScorePanel({ elapsedLabel, score }: { elapsedLabel: string; score: number }) {
  return (
    <HudPanel as="aside" className="scorePanel">
      <HudStatRow label="晴天化スコア" value={score.toLocaleString()} />
      <HudStatRow label="経過時間" value={elapsedLabel} />
    </HudPanel>
  );
}

export function MissionPanel({
  enemyName,
  isClear,
  passiveName,
  stageName,
}: {
  enemyName: string;
  isClear: boolean;
  passiveName: string;
  stageName: string;
}) {
  return (
    <HudPanel as="aside" className="missionPanel">
      <span>ミッション</span>
      <p>{stageName} / {passiveName}</p>
      <label>
        <input type="checkbox" checked={isClear} readOnly /> {enemyName}を撃破する
      </label>
    </HudPanel>
  );
}

export function RadarPanel({ enemyTrait, stageName }: { enemyTrait: string; stageName: string }) {
  return (
    <HudPanel className="radarPanel">
      <div className="radarCircle"><i /><b /></div>
      <p>ステージ: {stageName}</p>
      <p>敵性質: {enemyTrait}</p>
    </HudPanel>
  );
}

function WeaponIcon() {
  return (
    <svg className="weaponIcon" viewBox="0 0 60 28" aria-hidden="true">
      <path
        d="M2 14 L40 14 L40 8 L52 8 L52 14 L58 14 L58 18 L52 18 L52 22 L42 22 L42 18 L18 18 L18 22 L8 22 L8 18 L2 18 Z"
        fill="none"
        stroke="#28d9ff"
        strokeWidth="1.4"
      />
      <path d="M22 14 L26 14" stroke="#ffd84d" strokeWidth="1.6" />
    </svg>
  );
}

export function WeaponStatusPanel({
  detail,
  isEmpty,
  isLow,
  value,
  weaponName,
}: {
  detail: string;
  isEmpty: boolean;
  isLow: boolean;
  value: string;
  weaponName: string;
}) {
  const className = `weaponStatus ${isEmpty ? "weaponStatus--empty" : isLow ? "weaponStatus--low" : ""}`;
  return (
    <HudPanel className={className}>
      <div className="weaponStatus__visual">
        <WeaponIcon />
      </div>
      <div className="weaponStatus__content">
        <HudStatRow label={weaponName} value={value} />
        <small>{detail}</small>
      </div>
    </HudPanel>
  );
}

export function SkillStatusPanel({
  description,
  gauge,
  ready,
  skillName,
}: {
  description: string;
  gauge: number;
  ready: boolean;
  skillName: string;
}) {
  return (
    <HudPanel className={`skillStatus ${ready ? "skillStatus--ready" : ""}`}>
      <HudStatRow label="ウェポンスキル" value={skillName} />
      <HudMeter tone="yellow" value={gauge} />
      <small>{ready ? "Q で発動可能" : description}</small>
    </HudPanel>
  );
}
