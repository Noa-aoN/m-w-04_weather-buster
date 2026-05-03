import { useEffect, useState } from "react";
import { findCharacter, findStage, findWeapon, weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import { calculateRank, calculateSunnyScore } from "../game/score";
import type { BattleResult } from "../game/types";

function snapshot(): BattleResult {
  const state = useBattleStore.getState();
  const accuracyRatio = state.shotsFired === 0 ? 0 : state.shotsHit / state.shotsFired;
  const damageTakenRatio = state.damageTaken / state.playerMaxHp;
  const cleared = state.status === "clear";
  const score = calculateSunnyScore({
    enemyMaxHp: state.enemyMaxHp,
    remainingEnemyHp: state.enemyHp,
    shotsFired: state.shotsFired,
    shotsHit: state.shotsHit,
  });
  const rank = calculateRank({ cleared, score, accuracyRatio, damageTakenRatio });

  return {
    enemyId: state.selectedEnemyId,
    weaponId: state.selectedWeaponId,
    characterId: state.selectedCharacterId,
    stageId: state.selectedStageId,
    cleared,
    elapsedSeconds: state.elapsedSeconds,
    shotsFired: state.shotsFired,
    shotsHit: state.shotsHit,
    damageTaken: state.damageTaken,
    playerMaxHp: state.playerMaxHp,
    score,
    rank,
  };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ResultScene({
  onRetry,
  onHome,
}: {
  onRetry: () => void;
  onHome: () => void;
}) {
  const [result] = useState<BattleResult>(() => snapshot());
  const enemy = weatherEnemies.find((candidate) => candidate.id === result.enemyId) ?? weatherEnemies[0];
  const weapon = findWeapon(result.weaponId);
  const character = findCharacter(result.characterId);
  const stage = findStage(result.stageId);
  const accuracyPct = result.shotsFired === 0 ? 0 : Math.round((result.shotsHit / result.shotsFired) * 100);
  const damageTakenPct = Math.min(100, Math.round((result.damageTaken / result.playerMaxHp) * 100));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "r" || event.key === "Enter") {
        event.preventDefault();
        onRetry();
      } else if (key === "h") {
        event.preventDefault();
        onHome();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRetry, onHome]);

  return (
    <main className="resultShell sceneEnter">
      <div className="screenFrame" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>{result.cleared ? "MISSION CLEAR" : "MISSION FAILED"}</h1>
          <small>戦闘記録 / RESULT</small>
        </div>
      </header>

      <section className="resultBlock">
        <p className="resultEyebrow">{enemy.name} — {result.cleared ? "撃破完了" : "撤収"}</p>
        <h2 className="resultHeadline">{result.cleared ? "CLEAR SKY!" : "WEATHER OVER"}</h2>
        <span className="resultSub">PILOT {character.codename} / {weapon.name} / {stage.name}</span>
      </section>

      <section className={`resultRank rank--${result.rank.toLowerCase()}`}>
        <span>RANK</span>
        <strong>{result.rank}</strong>
      </section>

      <section className="resultStats">
        <article>
          <span>撃破時間</span>
          <strong>{formatTime(result.elapsedSeconds)}</strong>
        </article>
        <article>
          <span>命中率</span>
          <strong>{accuracyPct}%</strong>
          <small>{result.shotsHit} / {result.shotsFired}</small>
        </article>
        <article>
          <span>被ダメージ率</span>
          <strong>{damageTakenPct}%</strong>
          <small>{Math.round(result.damageTaken).toLocaleString()} / {result.playerMaxHp.toLocaleString()}</small>
        </article>
        <article>
          <span>晴天化スコア</span>
          <strong>{result.score.toLocaleString()}</strong>
        </article>
      </section>

      <footer className="resultFooter">
        <button type="button" onClick={onRetry}>再観測 (R / Enter)</button>
        <button type="button" className="primaryMenuButton" onClick={onHome}>タイトルへ戻る (H)</button>
      </footer>
    </main>
  );
}
