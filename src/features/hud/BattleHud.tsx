import type { BattleStatus, WeatherEnemy, Weapon } from "../../game/types";

type BattleHudProps = {
  enemy: WeatherEnemy;
  enemyHp: number;
  playerHp: number;
  weapon: Weapon;
  pressureGauge: number;
  shotsFired: number;
  shotsHit: number;
  score: number;
  status: BattleStatus;
  onStart: () => void;
  onReset: () => void;
};

export function BattleHud({
  enemy,
  enemyHp,
  playerHp,
  weapon,
  pressureGauge,
  shotsFired,
  shotsHit,
  score,
  status,
  onStart,
  onReset,
}: BattleHudProps) {
  const accuracy = shotsFired === 0 ? 0 : Math.round((shotsHit / shotsFired) * 100);
  const enemyHpRatio = Math.max(enemyHp / enemy.maxHp, 0);

  return (
    <div className="hud">
      <div className="hudTop">
        <section className="meterPanel">
          <span className="hudLabel">耐候値</span>
          <strong>{playerHp}%</strong>
          <div className="meter">
            <span style={{ width: `${playerHp}%` }} />
          </div>
        </section>

        <section className="enemyPanel">
          <span className="hudLabel">敵天候</span>
          <strong>{enemy.name}</strong>
          <div className="meter enemyMeter">
            <span style={{ width: `${enemyHpRatio * 100}%` }} />
          </div>
        </section>
      </div>

      <div className="reticle" aria-hidden="true" />

      <div className="hudBottom">
        <section className="weaponPanel">
          <span className="hudLabel">武器</span>
          <strong>{weapon.name}</strong>
          <small>{weapon.skillName}</small>
        </section>

        <section className="weaponPanel">
          <span className="hudLabel">気圧ゲージ</span>
          <strong>{pressureGauge}%</strong>
          <div className="meter pressureMeter">
            <span style={{ width: `${pressureGauge}%` }} />
          </div>
        </section>

        <section className="weaponPanel compact">
          <span className="hudLabel">命中率</span>
          <strong>{accuracy}%</strong>
        </section>

        <section className="weaponPanel compact">
          <span className="hudLabel">晴天化スコア</span>
          <strong>{score}</strong>
        </section>
      </div>

      {status === "ready" ? (
        <div className="centerBanner">
          <p>観測区域: 実験場</p>
          <h1>ウェザーバスター</h1>
          <button type="button" onClick={onStart}>
            戦闘開始
          </button>
        </div>
      ) : null}

      {status === "clear" ? (
        <div className="centerBanner clearBanner">
          <p>雲が割れ、空が戻った</p>
          <h1>CLEAR SKY!</h1>
          <button type="button" onClick={onReset}>
            再観測
          </button>
        </div>
      ) : null}
    </div>
  );
}
