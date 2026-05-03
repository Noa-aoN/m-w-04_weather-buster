import type { RankLetter } from "./types";

export function calculateSunnyScore(params: {
  enemyMaxHp: number;
  remainingEnemyHp: number;
  shotsFired: number;
  shotsHit: number;
}) {
  const defeatedRatio =
    (params.enemyMaxHp - params.remainingEnemyHp) / params.enemyMaxHp;
  const accuracy =
    params.shotsFired === 0 ? 0 : params.shotsHit / params.shotsFired;

  return Math.round(1000 + defeatedRatio * 5000 + accuracy * 1500);
}

export function calculateRank(params: {
  cleared: boolean;
  score: number;
  accuracyRatio: number;
  damageTakenRatio: number;
}): RankLetter {
  if (!params.cleared) {
    return "D";
  }

  const damagePenalty = Math.min(params.damageTakenRatio, 1) * 0.5;
  const adjusted = params.score * (1.2 - damagePenalty);

  if (params.accuracyRatio >= 0.85 && params.damageTakenRatio <= 0.18 && adjusted >= 7000) {
    return "S";
  }
  if (adjusted >= 6200 && params.accuracyRatio >= 0.65) {
    return "A";
  }
  if (adjusted >= 4800 && params.accuracyRatio >= 0.45) {
    return "B";
  }
  if (adjusted >= 3500) {
    return "C";
  }
  return "D";
}
