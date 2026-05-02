import type { BattleStatus, WeatherEnemy, Weapon } from "../../game/types";

type BattleHudProps = {
  enemy: WeatherEnemy;
  enemyHp: number;
  playerHp: number;
  weapon: Weapon;
  pressureGauge: number;
  ammo: number;
  elapsedTime: string;
  shotsFired: number;
  shotsHit: number;
  score: number;
  status: BattleStatus;
  onStart: () => void;
  onReset: () => void;
  onBack: () => void;
  onOpenEnemyGrid: () => void;
};

export function BattleHud({
  enemy,
  enemyHp,
  playerHp,
  weapon,
  pressureGauge,
  ammo,
  elapsedTime,
  shotsFired,
  shotsHit,
  score,
  status,
  onStart,
  onReset,
  onBack,
  onOpenEnemyGrid,
}: BattleHudProps) {
  const accuracy = shotsFired === 0 ? 0 : Math.round((shotsHit / shotsFired) * 100);
  const enemyHpRatio = Math.max(enemyHp / enemy.maxHp, 0);

  return (
    <div className="battleHud">
      <header className="battleBrand">
        <button type="button" onClick={onBack}>WEATHER BUSTER</button>
      </header>

      <div className="playerStatus tacticalPanel">
        <span>耐候値</span>
        <strong>{playerHp.toLocaleString()} / 1,250</strong>
        <div className="segmentedMeter cyan"><i style={{ width: `${playerHp}%` }} /></div>
        <span>気圧ゲージ</span>
        <div className="segmentedMeter yellow"><i style={{ width: `${pressureGauge}%` }} /></div>
      </div>

      <div className="bossBar">
        <strong>{enemy.name}</strong>
        <div><i style={{ width: `${enemyHpRatio * 100}%` }} /></div>
      </div>

      <aside className="scorePanel tacticalPanel">
        <span>晴天化スコア</span>
        <strong>{score.toLocaleString()}</strong>
        <span>経過時間</span>
        <b>{elapsedTime}</b>
      </aside>

      <aside className="missionPanel tacticalPanel">
        <span>MISSION</span>
        <p>全ての敵を撃破し、実験場の気象を安定させよ</p>
        <label><input type="checkbox" checked={status === "clear"} readOnly /> {enemy.name}を撃破する</label>
      </aside>

      <button className="enemyBookButton" type="button" onClick={onOpenEnemyGrid}>観測記録</button>

      <div className="radarPanel tacticalPanel">
        <div className="radarCircle"><i /><b /></div>
        <p>エリア: 実験場</p>
        <p>敵性質: {enemy.trait}</p>
      </div>

      <div className="itemPanel tacticalPanel">
        <span>アイテム</span>
        <div className="itemSlots"><b>1 避雷針 x02</b><b>2 晴れ薬 x03</b></div>
      </div>

      <div className="weaponStatus tacticalPanel">
        <span>{weapon.name}</span>
        <strong>{ammo} / {weapon.maxAmmo}</strong>
        <small>命中率 {accuracy}%</small>
      </div>

      <div className="skillStatus tacticalPanel">
        <span>武器スキル</span>
        <strong>{weapon.skillName}</strong>
        <div className="segmentedMeter yellow"><i style={{ width: `${pressureGauge}%` }} /></div>
      </div>

      <div className="reticle" aria-hidden="true" />

      {status === "ready" ? (
        <div className="centerBanner">
          <p>観測区域: 実験場</p>
          <h1>{enemy.name}を撃破する</h1>
          <button type="button" onClick={onStart}>戦闘開始</button>
        </div>
      ) : null}

      {status === "clear" ? (
        <div className="centerBanner clearBanner">
          <p>雲が割れ、空が戻った</p>
          <h1>CLEAR SKY!</h1>
          <button type="button" onClick={onReset}>再観測</button>
        </div>
      ) : null}
    </div>
  );
}
