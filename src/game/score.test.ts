import { describe, it, expect } from "vitest";
import { calculateRank, calculateSunnyScore } from "./score";

describe("calculateSunnyScore", () => {
  it("returns the floor of 1000 + accuracy bonus when nothing was defeated", () => {
    const score = calculateSunnyScore({
      enemyMaxHp: 100,
      remainingEnemyHp: 100,
      shotsFired: 0,
      shotsHit: 0,
    });
    expect(score).toBe(1000);
  });

  it("rewards full defeat plus perfect accuracy", () => {
    const score = calculateSunnyScore({
      enemyMaxHp: 100,
      remainingEnemyHp: 0,
      shotsFired: 10,
      shotsHit: 10,
    });
    // 1000 + 5000 + 1500 = 7500
    expect(score).toBe(7500);
  });

  it("avoids divide-by-zero when no shots were fired", () => {
    const score = calculateSunnyScore({
      enemyMaxHp: 100,
      remainingEnemyHp: 0,
      shotsFired: 0,
      shotsHit: 0,
    });
    expect(score).toBe(6000);
  });
});

describe("calculateRank", () => {
  it("returns D when the player did not clear", () => {
    expect(
      calculateRank({ cleared: false, score: 9999, accuracyRatio: 1, damageTakenRatio: 0 }),
    ).toBe("D");
  });

  it("returns S only when accuracy, damage and score thresholds are all hit", () => {
    expect(
      calculateRank({ cleared: true, score: 7500, accuracyRatio: 0.9, damageTakenRatio: 0.1 }),
    ).toBe("S");
    // accuracy too low → drops to A
    expect(
      calculateRank({ cleared: true, score: 7500, accuracyRatio: 0.7, damageTakenRatio: 0.1 }),
    ).toBe("A");
  });

  it("ladders A / B / C / D as adjusted score and accuracy fall", () => {
    const a = calculateRank({ cleared: true, score: 6500, accuracyRatio: 0.7, damageTakenRatio: 0.2 });
    expect(a).toBe("A");
    const b = calculateRank({ cleared: true, score: 5200, accuracyRatio: 0.55, damageTakenRatio: 0.3 });
    expect(b).toBe("B");
    const c = calculateRank({ cleared: true, score: 4000, accuracyRatio: 0.3, damageTakenRatio: 0.4 });
    expect(c).toBe("C");
    const d = calculateRank({ cleared: true, score: 1500, accuracyRatio: 0.1, damageTakenRatio: 0.9 });
    expect(d).toBe("D");
  });

  it("penalises taking heavy damage by lowering the adjusted score", () => {
    const safe = calculateRank({ cleared: true, score: 6500, accuracyRatio: 0.7, damageTakenRatio: 0 });
    const beaten = calculateRank({ cleared: true, score: 6500, accuracyRatio: 0.7, damageTakenRatio: 1 });
    // safer run keeps an A or higher; mauled run drops at least one tier
    expect(["S", "A"]).toContain(safe);
    expect(["B", "C", "D"]).toContain(beaten);
  });
});
