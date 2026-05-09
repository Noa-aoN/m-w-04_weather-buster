import { difficultyModifiers } from "./data";
import type {
  Character,
  DifficultyLevel,
  Weapon,
  WeatherEnemy,
  WeatherEnemyId,
} from "./types";

// Pure combat math used by the battle store. Kept in a separate module so it
// can be unit-tested in isolation without spinning up a Zustand store, three.js
// canvas, or React tree.

export const COMBAT_CONSTANTS = {
  PLAYER_MAX_HP: 1000,
  ENEMY_TICK_DAMAGE_BASE: 2,
  ENEMY_REGULAR_ATTACK_RATIO: 0.45,
  HIT_GAUGE_GAIN: 6,
  CRITICAL_GAUGE_GAIN: 10,
  MISS_GAUGE_GAIN: 1,
  // Melee weapons (windBlade) trade ranged safety for closing distance —
  // each hit grants a bonus on top of the base gain so the skill gauge
  // doesn't feel disproportionately slow despite needing point-blank range.
  MELEE_GAUGE_MULTIPLIER: 1.6,
  HEAL_AMOUNT: 350,
  STABILIZER_GAUGE_GAIN: 60,
  DECOY_DURATION_MS: 5000,
  DECOY_DAMAGE_RATIO: 0.4,
  CORE_DAMAGE_MULTIPLIER: 3.0,
  // Non-core hits do reduced damage so aiming for the glowing core matters.
  BODY_DAMAGE_MULTIPLIER: 0.55,
  SHIELD_DAMAGE_RATIO: 0.28,
  SHIELD_DRAIN_PER_BLOCK: 18,
  SHIELD_REGEN_PER_SECOND: 9,
  COMBO_RESET_MS: 2400,
  BARRIER_DAMAGE_MUL: 0.18,
  BARRIER_GAUGE_MUL: 0.4,
} as const;

export function enemyMaxHpFor(enemy: WeatherEnemy, difficulty: DifficultyLevel) {
  return Math.round(enemy.maxHp * difficultyModifiers[difficulty].hp);
}

export function computeOutgoingDamage(
  weapon: Weapon,
  enemyId: WeatherEnemyId,
  characterMul: number,
) {
  const specialty = weapon.specialtyAgainst.includes(enemyId)
    ? weapon.specialtyMultiplier
    : 1;
  return weapon.damage * specialty * characterMul;
}

export function computeIncomingDamage(
  amount: number,
  decoyUntil: number,
  characterMul: number,
  shieldActive: boolean,
  shieldEnergy: number,
  now: number = Date.now(),
) {
  const reduced = now < decoyUntil ? amount * COMBAT_CONSTANTS.DECOY_DAMAGE_RATIO : amount;
  const guarded = shieldActive && shieldEnergy > 0
    ? reduced * COMBAT_CONSTANTS.SHIELD_DAMAGE_RATIO
    : reduced;
  return guarded * characterMul;
}

export function shieldAfterBlock(shieldActive: boolean, shieldEnergy: number) {
  return shieldActive && shieldEnergy > 0
    ? Math.max(0, shieldEnergy - COMBAT_CONSTANTS.SHIELD_DRAIN_PER_BLOCK)
    : shieldEnergy;
}

export function computeReloadMs(weapon: Weapon) {
  // Heavier weapons take longer to reload, capped to a reasonable range.
  // Tightened ~25% so the manual right-click reload doesn't drag combat tempo.
  if (weapon.maxAmmo <= 8) return 1300;
  if (weapon.maxAmmo <= 14) return 1000;
  if (weapon.maxAmmo <= 22) return 850;
  return 700;
}

// One-shot pure resolution of a player gunshot. Returns the *diff* that the
// store should apply, plus a couple of derived flags (blocked / becomesClear /
// shouldAutoReload) that are useful for the caller.
//
// Keeping this pure means we can test combinations of barrier / crit / combo /
// auto-reload without touching the live store.
export type ApplyShotInput = {
  didHit: boolean;
  critical: boolean;
  weapon: Weapon;
  character: Character;
  enemyId: WeatherEnemyId;
  state: {
    enemyHp: number;
    pressureGauge: number;
    enemyBarrierUntil: number;
    combo: number;
    comboBest: number;
    lastComboAt: number;
  };
  now: number;
};

export type ApplyShotPatch = {
  enemyHp: number;
  pressureGauge: number;
  damage: number;
  blocked: boolean;
  effectiveCritical: boolean;
  combo: number;
  comboBest: number;
  lastComboAt: number;
  becomesClear: boolean;
  shouldAutoReload: boolean;
};

export function applyShot({
  didHit,
  critical,
  weapon,
  character,
  enemyId,
  state,
  now,
}: ApplyShotInput): ApplyShotPatch {
  const blocked = didHit && now < state.enemyBarrierUntil;
  const baseDamage = didHit
    ? computeOutgoingDamage(weapon, enemyId, character.damageMultiplier)
    : 0;
  const blockMul = blocked ? COMBAT_CONSTANTS.BARRIER_DAMAGE_MUL : 1;
  const zoneMul = critical
    ? COMBAT_CONSTANTS.CORE_DAMAGE_MULTIPLIER
    : COMBAT_CONSTANTS.BODY_DAMAGE_MULTIPLIER;
  const damage = baseDamage * zoneMul * blockMul;
  const enemyHp = Math.max(state.enemyHp - damage, 0);
  const baseGauge = didHit
    ? (critical ? COMBAT_CONSTANTS.CRITICAL_GAUGE_GAIN : COMBAT_CONSTANTS.HIT_GAUGE_GAIN)
    : COMBAT_CONSTANTS.MISS_GAUGE_GAIN;
  const gaugeMul = blocked ? COMBAT_CONSTANTS.BARRIER_GAUGE_MUL : 1;
  const meleeMul = weapon.id === "windBlade" ? COMBAT_CONSTANTS.MELEE_GAUGE_MULTIPLIER : 1;
  const pressureGauge = Math.min(
    state.pressureGauge + baseGauge * character.gaugeGainMultiplier * gaugeMul * meleeMul,
    100,
  );
  const becomesClear = enemyHp === 0 && state.enemyHp > 0;

  const comboReset = now - state.lastComboAt > COMBAT_CONSTANTS.COMBO_RESET_MS;
  const successHit = didHit && !blocked;
  const combo = successHit
    ? (comboReset ? 1 : state.combo + 1)
    : (blocked ? state.combo : 0);
  const comboBest = Math.max(state.comboBest, combo);
  const lastComboAt = successHit ? now : state.lastComboAt;

  return {
    enemyHp,
    pressureGauge,
    damage,
    blocked,
    effectiveCritical: didHit && critical && !blocked,
    combo,
    comboBest,
    lastComboAt,
    becomesClear,
    shouldAutoReload: enemyHp > 0,
  };
}
