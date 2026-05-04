import { describe, it, expect } from "vitest";
import {
  COMBAT_CONSTANTS,
  applyShot,
  computeIncomingDamage,
  computeReloadMs,
  enemyMaxHpFor,
  shieldAfterBlock,
} from "./combatRules";
import { findCharacter, findWeapon, weatherEnemies } from "./data";

const noa = findCharacter("iris");
const halu = findCharacter("halo");
const weatherGun = findWeapon("weatherGun");
const rainKiller = findWeapon("rainySeasonKiller");
const heavyRain = weatherEnemies.find((e) => e.id === "heavyRain")!;
const cloudy = weatherEnemies.find((e) => e.id === "cloudy")!;

describe("enemyMaxHpFor", () => {
  it("multiplies the base enemy HP by the difficulty modifier", () => {
    expect(enemyMaxHpFor(cloudy, 3)).toBe(Math.round(cloudy.maxHp * 1.0));
    expect(enemyMaxHpFor(cloudy, 1)).toBe(Math.round(cloudy.maxHp * 0.7));
    expect(enemyMaxHpFor(cloudy, 5)).toBe(Math.round(cloudy.maxHp * 1.6));
  });
});

describe("computeReloadMs", () => {
  it("scales reload time inversely to magazine size", () => {
    expect(computeReloadMs({ ...weatherGun, maxAmmo: 6 })).toBe(1700);
    expect(computeReloadMs({ ...weatherGun, maxAmmo: 14 })).toBe(1300);
    expect(computeReloadMs({ ...weatherGun, maxAmmo: 22 })).toBe(1100);
    expect(computeReloadMs({ ...weatherGun, maxAmmo: 32 })).toBe(950);
  });
});

describe("computeIncomingDamage", () => {
  it("returns the raw amount when no buffs apply", () => {
    expect(
      computeIncomingDamage(100, /*decoyUntil*/ 0, /*charMul*/ 1, /*shieldActive*/ false, /*shieldEnergy*/ 100, /*now*/ 1),
    ).toBe(100);
  });
  it("reduces incoming damage while decoy is active", () => {
    const out = computeIncomingDamage(100, /*decoyUntil*/ 1000, 1, false, 100, /*now*/ 500);
    expect(out).toBeCloseTo(40, 5);
  });
  it("further reduces incoming damage when shield is active and has energy", () => {
    const out = computeIncomingDamage(100, 0, 1, /*shieldActive*/ true, /*shieldEnergy*/ 50, 0);
    expect(out).toBeCloseTo(28, 5);
  });
  it("ignores shield when energy is zero", () => {
    expect(computeIncomingDamage(100, 0, 1, true, 0, 0)).toBe(100);
  });
  it("multiplies by the character's damage-taken multiplier last", () => {
    const out = computeIncomingDamage(100, 0, /*charMul*/ 0.5, false, 100, 0);
    expect(out).toBe(50);
  });
});

describe("shieldAfterBlock", () => {
  it("drains shield energy when shield is active and has energy", () => {
    expect(shieldAfterBlock(true, 50)).toBe(50 - COMBAT_CONSTANTS.SHIELD_DRAIN_PER_BLOCK);
  });
  it("clamps to zero", () => {
    expect(shieldAfterBlock(true, 5)).toBe(0);
  });
  it("returns the same energy when shield is inactive", () => {
    expect(shieldAfterBlock(false, 50)).toBe(50);
  });
});

const baseShotState = {
  enemyHp: 240,
  pressureGauge: 0,
  enemyBarrierUntil: 0,
  combo: 0,
  comboBest: 0,
  lastComboAt: 0,
};

describe("applyShot", () => {
  it("deals weapon-base damage on a normal hit", () => {
    const patch = applyShot({
      didHit: true,
      critical: false,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: baseShotState,
      now: 1000,
    });
    // weatherGun.damage(11) * specialty(1) * iris.damageMul(1.1) = 12.1
    expect(patch.damage).toBeCloseTo(12.1, 5);
    expect(patch.enemyHp).toBeCloseTo(240 - 12.1, 5);
    expect(patch.blocked).toBe(false);
    expect(patch.effectiveCritical).toBe(false);
    expect(patch.combo).toBe(1);
  });

  it("applies the core multiplier on critical hits", () => {
    const patch = applyShot({
      didHit: true,
      critical: true,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: baseShotState,
      now: 1000,
    });
    expect(patch.damage).toBeCloseTo(12.1 * COMBAT_CONSTANTS.CORE_DAMAGE_MULTIPLIER, 5);
    expect(patch.effectiveCritical).toBe(true);
  });

  it("applies the specialty multiplier when the weapon counters the enemy", () => {
    // rainySeasonKiller has heavyRain in specialtyAgainst (x1.45) and damage 28
    const patch = applyShot({
      didHit: true,
      critical: false,
      weapon: rainKiller,
      character: noa,
      enemyId: heavyRain.id,
      state: { ...baseShotState, enemyHp: 1000 },
      now: 1000,
    });
    // 28 * 1.45 * 1.1 = 44.66
    expect(patch.damage).toBeCloseTo(28 * 1.45 * 1.1, 5);
  });

  it("blocks shots while the enemy barrier is up (damage x0.18, no crit)", () => {
    const patch = applyShot({
      didHit: true,
      critical: true,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: { ...baseShotState, enemyBarrierUntil: 2000 },
      now: 1000,
    });
    // base 12.1 * crit 2.4 * barrier 0.18 = 5.227...
    expect(patch.damage).toBeCloseTo(12.1 * 2.4 * COMBAT_CONSTANTS.BARRIER_DAMAGE_MUL, 5);
    expect(patch.blocked).toBe(true);
    expect(patch.effectiveCritical).toBe(false);
  });

  it("preserves the existing combo when blocked, but does not advance it", () => {
    const patch = applyShot({
      didHit: true,
      critical: false,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: { ...baseShotState, enemyBarrierUntil: 5000, combo: 7, comboBest: 7, lastComboAt: 999 },
      now: 1000,
    });
    expect(patch.combo).toBe(7);
    expect(patch.comboBest).toBe(7);
  });

  it("breaks the combo on a clean miss", () => {
    const patch = applyShot({
      didHit: false,
      critical: false,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: { ...baseShotState, combo: 5, comboBest: 5, lastComboAt: 999 },
      now: 1000,
    });
    expect(patch.combo).toBe(0);
    expect(patch.damage).toBe(0);
  });

  it("resets the combo to 1 when more than COMBO_RESET_MS has passed since the last hit", () => {
    const patch = applyShot({
      didHit: true,
      critical: false,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: { ...baseShotState, combo: 9, comboBest: 9, lastComboAt: 0 },
      now: COMBAT_CONSTANTS.COMBO_RESET_MS + 100,
    });
    expect(patch.combo).toBe(1);
  });

  it("flags becomesClear and stops auto-reload when the shot empties the enemy HP", () => {
    const patch = applyShot({
      didHit: true,
      critical: true,
      weapon: weatherGun,
      character: noa,
      enemyId: cloudy.id,
      state: { ...baseShotState, enemyHp: 5 },
      now: 1000,
    });
    expect(patch.enemyHp).toBe(0);
    expect(patch.becomesClear).toBe(true);
    expect(patch.shouldAutoReload).toBe(false);
  });

  it("caps pressure gauge at 100", () => {
    const patch = applyShot({
      didHit: true,
      critical: true,
      weapon: weatherGun,
      character: halu, // gauge gain x0.9 to make sure cap math holds
      enemyId: cloudy.id,
      state: { ...baseShotState, pressureGauge: 96 },
      now: 1000,
    });
    expect(patch.pressureGauge).toBeLessThanOrEqual(100);
    expect(patch.pressureGauge).toBe(100);
  });
});
