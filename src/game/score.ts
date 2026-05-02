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
