import { useEffect, useState } from "react";
import { findCharacter, findStage, findWeapon, items, weatherEnemies } from "../../game/data";
import { useBattleStore } from "../../game/battleStore";
import { calculateSunnyScore } from "../../game/score";
import { requestPointerLock } from "../player/lockControls";

const controlHints: Array<[string, string]> = [
  ["W A S D", "移動"],
  ["MOUSE", "視点"],
  ["CLICK", "射撃"],
  ["SPACE", "ジャンプ"],
  ["SHIFT", "ダッシュ"],
  ["R", "リロード"],
  ["Q", "武器スキル"],
  ["1-4", "アイテム"],
  ["ESC", "ポーズ"],
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function ControlsHelp() {
  return (
    <dl className="controlsHelp">
      {controlHints.map(([key, label]) => (
        <div key={key}>
          <kbd>{key}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </dl>
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

function ItemToast() {
  const lastItemId = useBattleStore((state) => state.lastItemId);
  const lastItemAt = useBattleStore((state) => state.lastItemAt);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!lastItemId || lastItemAt === 0) {
      return;
    }
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 2200);
    return () => window.clearTimeout(id);
  }, [lastItemAt, lastItemId]);

  if (!active || !lastItemId) {
    return null;
  }
  const item = items.find((entry) => entry.id === lastItemId);
  return (
    <div className="hudToast" key={lastItemAt}>
      <span>ITEM</span>
      <strong>{item?.name}</strong>
      <small>{item?.effect}</small>
    </div>
  );
}

function SkillFlash() {
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (lastSkillAt === 0) {
      return;
    }
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 600);
    return () => window.clearTimeout(id);
  }, [lastSkillAt]);

  if (!active) {
    return null;
  }
  return <div className="skillFlash" key={lastSkillAt} aria-hidden="true" />;
}

function HitMarker({ color }: { color: string }) {
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);
  if (lastShotAt === 0) {
    return null;
  }
  return (
    <div
      key={lastShotAt}
      className={`hitMarker ${lastShotHit ? "hit" : "miss"}`}
      style={{ ["--hit-color" as string]: lastShotHit ? color : "rgba(255, 255, 255, 0.55)" }}
      aria-hidden="true"
    />
  );
}

export function BattleHud({
  onBack,
  onOpenEnemyGrid,
  onShowResult,
}: {
  onBack: () => void;
  onOpenEnemyGrid: () => void;
  onShowResult: () => void;
}) {
  const status = useBattleStore((state) => state.status);
  const isPointerLocked = useBattleStore((state) => state.isPointerLocked);
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const enemyHp = useBattleStore((state) => state.enemyHp);
  const enemyMaxHp = useBattleStore((state) => state.enemyMaxHp);
  const playerHp = useBattleStore((state) => state.playerHp);
  const playerMaxHp = useBattleStore((state) => state.playerMaxHp);
  const ammo = useBattleStore((state) => state.ammo);
  const pressureGauge = useBattleStore((state) => state.pressureGauge);
  const shotsFired = useBattleStore((state) => state.shotsFired);
  const shotsHit = useBattleStore((state) => state.shotsHit);
  const elapsedSeconds = useBattleStore((state) => state.elapsedSeconds);
  const itemStocks = useBattleStore((state) => state.itemStocks);
  const crosshairColor = useBattleStore((state) => state.crosshairColor);
  const decoyUntil = useBattleStore((state) => state.decoyUntil);
  const start = useBattleStore((state) => state.start);

  const enemy = weatherEnemies.find((candidate) => candidate.id === selectedEnemyId) ?? weatherEnemies[0];
  const weapon = findWeapon(selectedWeaponId);
  const character = findCharacter(selectedCharacterId);
  const stage = findStage(selectedStageId);
  const accuracy = shotsFired === 0 ? 0 : Math.round((shotsHit / shotsFired) * 100);
  const enemyHpRatio = Math.max(enemyHp / Math.max(enemyMaxHp, 1), 0);
  const playerHpRatio = Math.max(playerHp / Math.max(playerMaxHp, 1), 0);
  const decoyActive = Date.now() < decoyUntil;
  const score = calculateSunnyScore({
    enemyMaxHp,
    remainingEnemyHp: enemyHp,
    shotsFired,
    shotsHit,
  });

  function handleStart() {
    start();
    requestPointerLock();
  }

  function handleResume() {
    requestPointerLock();
  }

  return (
    <div className={`battleHud ${status === "battle" && isPointerLocked ? "battleHud--engaged" : ""}`}>
      <header className="battleBrand">
        <button type="button" onClick={onBack}>WEATHER BUSTER</button>
      </header>

      <div className="playerStatus tacticalPanel">
        <span>耐候値 / {character.codename}</span>
        <strong>{Math.round(playerHp).toLocaleString()} / {playerMaxHp.toLocaleString()}</strong>
        <div className="segmentedMeter cyan"><i style={{ width: `${playerHpRatio * 100}%` }} /></div>
        <span>気圧ゲージ{decoyActive ? " / DECOY" : ""}</span>
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
        <b>{formatTime(elapsedSeconds)}</b>
      </aside>

      <aside className="missionPanel tacticalPanel">
        <span>MISSION</span>
        <p>{stage.name} / {character.passiveName}</p>
        <label>
          <input type="checkbox" checked={status === "clear"} readOnly /> {enemy.name}を撃破する
        </label>
      </aside>

      <button className="enemyBookButton" type="button" onClick={onOpenEnemyGrid}>観測記録</button>

      <div className="radarPanel tacticalPanel">
        <div className="radarCircle"><i /><b /></div>
        <p>戦域: {stage.name}</p>
        <p>敵性質: {enemy.trait}</p>
      </div>

      <div className="itemPanel tacticalPanel">
        <span>アイテム</span>
        <div className="itemSlots">
          {items.map((item) => (
            <b key={item.id} className={itemStocks[item.id] === 0 ? "depleted" : ""}>
              {item.slotKey} {item.name} x{itemStocks[item.id].toString().padStart(2, "0")}
            </b>
          ))}
        </div>
      </div>

      <div className="weaponStatus tacticalPanel">
        <WeaponIcon />
        <span>{weapon.name}</span>
        <strong>{ammo} / {weapon.maxAmmo}</strong>
        <small>命中率 {accuracy}%</small>
      </div>

      <div className="skillStatus tacticalPanel">
        <span>武器スキル</span>
        <strong>{weapon.skillName}</strong>
        <div className="segmentedMeter yellow"><i style={{ width: `${pressureGauge}%` }} /></div>
        <small>{pressureGauge >= 100 ? "Q で発動可能" : weapon.skillDescription}</small>
      </div>

      <div
        className="reticle"
        style={{ borderColor: crosshairColor, ["--crosshair" as string]: crosshairColor }}
        aria-hidden="true"
      />
      <HitMarker color={enemy.accentColor} />
      <ItemToast />
      <SkillFlash />

      {status === "ready" ? (
        <div className="centerBanner">
          <p>{stage.name} / {character.codename}</p>
          <h1>{enemy.name}を撃破する</h1>
          <ControlsHelp />
          <div className="readyActions">
            <button type="button" className="primaryMenuButton" onClick={handleStart}>戦闘開始</button>
            <button type="button" onClick={onBack}>ホームへ</button>
          </div>
        </div>
      ) : null}

      {status === "battle" && !isPointerLocked ? (
        <div className="centerBanner pauseBanner">
          <p>POINTER UNLOCKED</p>
          <h1>一時停止中</h1>
          <ControlsHelp />
          <div className="pauseActions">
            <button type="button" className="primaryMenuButton" onClick={handleResume}>プレイ続行</button>
            <button type="button" onClick={onBack}>撤退してタイトルへ</button>
          </div>
        </div>
      ) : null}

      {status === "clear" ? (
        <div className="centerBanner clearBanner">
          <p>雲が割れ、空が戻った</p>
          <h1>CLEAR SKY!</h1>
          <button type="button" className="primaryMenuButton" onClick={onShowResult}>結果を見る</button>
        </div>
      ) : null}

      {status === "defeat" ? (
        <div className="centerBanner defeatBanner">
          <p>計測機を失った</p>
          <h1>WEATHER OVER</h1>
          <button type="button" className="primaryMenuButton" onClick={onShowResult}>結果を見る</button>
        </div>
      ) : null}
    </div>
  );
}
