import { create } from "zustand";
import {
  difficultyModifiers,
  findCharacter,
  findStage,
  findWeapon,
  items,
  stages,
  weapons,
  weatherEnemies,
} from "./data";
import type {
  BattleStatus,
  BattleCameraMode,
  CharacterId,
  DifficultyLevel,
  ItemId,
  StageId,
  Weapon,
  WeaponId,
  WeatherEnemy,
  WeatherEnemyId,
} from "./types";

const PLAYER_MAX_HP = 1000;
const ENEMY_TICK_DAMAGE_BASE = 4;
const HIT_GAUGE_GAIN = 8;
const CRITICAL_GAUGE_GAIN = 14;
const MISS_GAUGE_GAIN = 2;
const HEAL_AMOUNT = 350;
const STABILIZER_GAUGE_GAIN = 60;
const DECOY_DURATION_MS = 5000;
const DECOY_DAMAGE_RATIO = 0.4;
const CORE_DAMAGE_MULTIPLIER = 2.4;
const SHIELD_DAMAGE_RATIO = 0.28;
const SHIELD_DRAIN_PER_BLOCK = 18;
const SHIELD_REGEN_PER_SECOND = 9;
const DEFAULT_ENEMY_INDEX = 2;
const DEFAULT_WEAPON_INDEX = 1;
const DEFAULT_CHARACTER_ID: CharacterId = "halo";

const initialStocks = (multiplier: number): Record<ItemId, number> => {
  const stocks = {} as Record<ItemId, number>;
  for (const item of items) {
    stocks[item.id] = Math.max(0, Math.floor(item.initialStock * multiplier + 0.001));
  }
  return stocks;
};

const enemyMaxHpFor = (enemy: WeatherEnemy, difficulty: DifficultyLevel) =>
  Math.round(enemy.maxHp * difficultyModifiers[difficulty].hp);

type AttackKind = "arc" | "linear" | "falling";

type LightningMarker = {
  id: number;
  x: number;
  z: number;
  triggersAt: number;
  spawnAt: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  radius: number;
  damage: number;
  color: string;
  trailGlow: number;
  kind: AttackKind;
};

type BattleState = {
  status: BattleStatus;
  selectedEnemyId: WeatherEnemyId;
  selectedWeaponId: WeaponId;
  selectedCharacterId: CharacterId;
  selectedStageId: StageId;
  selectedDifficulty: DifficultyLevel;
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  ammo: number;
  pressureGauge: number;
  shieldEnergy: number;
  shieldActive: boolean;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  elapsedSeconds: number;
  isPointerLocked: boolean;
  itemStocks: Record<ItemId, number>;
  lightningMarkers: LightningMarker[];
  decoyUntil: number;
  mouseSensitivity: number;
  fov: number;
  cameraMode: BattleCameraMode;
  crosshairColor: string;
  locationEnabled: boolean;
  currentWeatherEnemyId: WeatherEnemyId | null;
  currentWeatherCode: number | null;
  lastShotAt: number;
  lastShotHit: boolean;
  lastItemAt: number;
  lastItemId: ItemId | null;
  lastSkillAt: number;
  lastDefeatAt: number;
  lastShotCritical: boolean;
  lastShotDamage: number;
  lastShieldBlockAt: number;
  combo: number;
  comboBest: number;
  lastComboAt: number;
  selectEnemy: (id: WeatherEnemyId) => void;
  selectWeapon: (id: WeaponId) => void;
  selectCharacter: (id: CharacterId) => void;
  selectStage: (id: StageId) => void;
  setDifficulty: (value: DifficultyLevel) => void;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  masterVolume: number;
  setMouseSensitivity: (value: number) => void;
  setFov: (value: number) => void;
  setCameraMode: (value: BattleCameraMode) => void;
  setCrosshairColor: (value: string) => void;
  setSfxEnabled: (value: boolean) => void;
  setBgmEnabled: (value: boolean) => void;
  setMasterVolume: (value: number) => void;
  setLocationEnabled: (value: boolean) => void;
  setCurrentWeather: (enemyId: WeatherEnemyId | null, code: number | null) => void;
  start: () => void;
  reset: () => void;
  shoot: (didHit: boolean, critical?: boolean) => void;
  reload: () => void;
  takeDamageTick: () => void;
  takeMarkerDamage: (amount: number) => void;
  tick: () => void;
  triggerSkill: () => void;
  useItem: (id: ItemId) => void;
  spawnLightning: (marker: LightningMarker) => void;
  removeLightning: (id: number) => void;
  shiftMarkerTimes: (deltaMs: number) => void;
  setPointerLocked: (locked: boolean) => void;
  setShieldActive: (active: boolean) => void;
};

const baseLoadout = (weapon: Weapon, difficulty: DifficultyLevel) => ({
  playerHp: PLAYER_MAX_HP,
  ammo: weapon.maxAmmo,
  pressureGauge: 0,
  shieldEnergy: 100,
  shieldActive: false,
  shotsFired: 0,
  shotsHit: 0,
  damageTaken: 0,
  elapsedSeconds: 0,
  itemStocks: initialStocks(difficultyModifiers[difficulty].itemMultiplier),
  lightningMarkers: [] as LightningMarker[],
  decoyUntil: 0,
  lastShotAt: 0,
  lastShotHit: false,
  lastShotCritical: false,
  lastShotDamage: 0,
  lastItemAt: 0,
  lastItemId: null,
  lastSkillAt: 0,
  lastDefeatAt: 0,
  lastShieldBlockAt: 0,
  combo: 0,
  comboBest: 0,
  lastComboAt: 0,
});

const findEnemy = (id: WeatherEnemyId) =>
  weatherEnemies.find((enemy) => enemy.id === id) ??
  weatherEnemies[DEFAULT_ENEMY_INDEX];

const computeIncomingDamage = (
  amount: number,
  decoyUntil: number,
  characterMul: number,
  shieldActive: boolean,
  shieldEnergy: number,
) => {
  const reduced = Date.now() < decoyUntil ? amount * DECOY_DAMAGE_RATIO : amount;
  const guarded = shieldActive && shieldEnergy > 0 ? reduced * SHIELD_DAMAGE_RATIO : reduced;
  return guarded * characterMul;
};

const shieldAfterBlock = (shieldActive: boolean, shieldEnergy: number) =>
  shieldActive && shieldEnergy > 0
    ? Math.max(0, shieldEnergy - SHIELD_DRAIN_PER_BLOCK)
    : shieldEnergy;

const computeOutgoingDamage = (
  weapon: Weapon,
  enemyId: WeatherEnemyId,
  characterMul: number,
) => {
  const specialty = weapon.specialtyAgainst.includes(enemyId)
    ? weapon.specialtyMultiplier
    : 1;
  return weapon.damage * specialty * characterMul;
};

export const useBattleStore = create<BattleState>((set, get) => {
  const defaultEnemy = weatherEnemies[DEFAULT_ENEMY_INDEX];
  const defaultWeapon = weapons[DEFAULT_WEAPON_INDEX];

  return {
    status: "ready",
    selectedEnemyId: defaultEnemy.id,
    selectedWeaponId: defaultWeapon.id,
    selectedCharacterId: DEFAULT_CHARACTER_ID,
    selectedStageId: stages[0].id,
    selectedDifficulty: defaultEnemy.difficulty,
    playerMaxHp: PLAYER_MAX_HP,
    isPointerLocked: false,
    mouseSensitivity: 1,
    fov: 58,
    cameraMode: "fps",
    crosshairColor: "#ffffff",
    locationEnabled: false,
    currentWeatherEnemyId: null,
    currentWeatherCode: null,
    enemyHp: enemyMaxHpFor(defaultEnemy, defaultEnemy.difficulty),
    enemyMaxHp: enemyMaxHpFor(defaultEnemy, defaultEnemy.difficulty),
    ...baseLoadout(defaultWeapon, defaultEnemy.difficulty),
    selectEnemy: (id) => {
      const target = findEnemy(id);
      const weapon = findWeapon(get().selectedWeaponId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        selectedEnemyId: id,
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    selectWeapon: (id) => {
      const weapon = findWeapon(id);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        selectedWeaponId: id,
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    selectCharacter: (id) => {
      set({ selectedCharacterId: id });
    },
    selectStage: (id) => {
      set({ selectedStageId: id });
    },
    setDifficulty: (value) => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const maxHp = enemyMaxHpFor(target, value);
      set({
        selectedDifficulty: value,
        status: "ready",
        ...baseLoadout(weapon, value),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    sfxEnabled: true,
    bgmEnabled: true,
    masterVolume: 0.6,
    setMouseSensitivity: (value) => set({ mouseSensitivity: value }),
    setFov: (value) => set({ fov: value }),
    setCameraMode: (value) => set({ cameraMode: value }),
    setCrosshairColor: (value) => set({ crosshairColor: value }),
    setSfxEnabled: (value) => set({ sfxEnabled: value }),
    setBgmEnabled: (value) => set({ bgmEnabled: value }),
    setMasterVolume: (value) => set({ masterVolume: Math.max(0, Math.min(1, value)) }),
    setLocationEnabled: (value) => set({ locationEnabled: value }),
    setCurrentWeather: (enemyId, code) => set({ currentWeatherEnemyId: enemyId, currentWeatherCode: code }),
    start: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        status: "battle",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    reset: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    shoot: (didHit, critical = false) => {
      const state = get();
      if (state.status !== "battle" || state.ammo <= 0) {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      const character = findCharacter(state.selectedCharacterId);
      const baseDamage = didHit
        ? computeOutgoingDamage(weapon, state.selectedEnemyId, character.damageMultiplier)
        : 0;
      const damage = critical ? baseDamage * CORE_DAMAGE_MULTIPLIER : baseDamage;
      const nextHp = Math.max(state.enemyHp - damage, 0);
      const baseGauge = didHit ? (critical ? CRITICAL_GAUGE_GAIN : HIT_GAUGE_GAIN) : MISS_GAUGE_GAIN;
      const gauge = Math.min(
        state.pressureGauge + baseGauge * character.gaugeGainMultiplier,
        100,
      );
      const becomesClear = nextHp === 0 && state.enemyHp > 0;
      const nowMs = performance.now();
      const comboReset = nowMs - state.lastComboAt > 2400;
      const nextCombo = didHit ? (comboReset ? 1 : state.combo + 1) : 0;
      const nextComboBest = Math.max(state.comboBest, nextCombo);
      set({
        ammo: state.ammo - 1,
        shotsFired: state.shotsFired + 1,
        shotsHit: state.shotsHit + (didHit ? 1 : 0),
        enemyHp: nextHp,
        pressureGauge: gauge,
        status: nextHp === 0 ? "clear" : state.status,
        lastShotAt: nowMs,
        lastShotHit: didHit,
        lastShotCritical: didHit && critical,
        lastShotDamage: damage,
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
        combo: nextCombo,
        comboBest: nextComboBest,
        lastComboAt: didHit ? nowMs : state.lastComboAt,
      });
    },
    reload: () => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      set({ ammo: weapon.maxAmmo });
    },
    takeDamageTick: () => {
      const state = get();
      if (state.status !== "battle" || !state.isPointerLocked) {
        return;
      }
      const enemy = findEnemy(state.selectedEnemyId);
      const character = findCharacter(state.selectedCharacterId);
      const diffMod = difficultyModifiers[state.selectedDifficulty];
      const damage = computeIncomingDamage(
        enemy.threat * ENEMY_TICK_DAMAGE_BASE * diffMod.attackDamage,
        state.decoyUntil,
        character.damageTakenMultiplier,
        state.shieldActive,
        state.shieldEnergy,
      );
      const nextShieldEnergy = shieldAfterBlock(state.shieldActive, state.shieldEnergy);
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        shieldEnergy: nextShieldEnergy,
        shieldActive: nextShieldEnergy > 0 ? state.shieldActive : false,
        damageTaken: state.damageTaken + damage,
        lastShieldBlockAt: nextShieldEnergy !== state.shieldEnergy ? performance.now() : state.lastShieldBlockAt,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    takeMarkerDamage: (amount) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const character = findCharacter(state.selectedCharacterId);
      const damage = computeIncomingDamage(amount, state.decoyUntil, character.damageTakenMultiplier, state.shieldActive, state.shieldEnergy);
      const nextShieldEnergy = shieldAfterBlock(state.shieldActive, state.shieldEnergy);
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        shieldEnergy: nextShieldEnergy,
        shieldActive: nextShieldEnergy > 0 ? state.shieldActive : false,
        damageTaken: state.damageTaken + damage,
        lastShieldBlockAt: nextShieldEnergy !== state.shieldEnergy ? performance.now() : state.lastShieldBlockAt,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    tick: () => {
      const state = get();
      if (state.status !== "battle" || !state.isPointerLocked) {
        return;
      }
      const nextShieldEnergy = state.shieldActive
        ? state.shieldEnergy
        : Math.min(100, state.shieldEnergy + SHIELD_REGEN_PER_SECOND);
      set({ elapsedSeconds: state.elapsedSeconds + 1, shieldEnergy: nextShieldEnergy });
    },
    triggerSkill: () => {
      const state = get();
      if (state.status !== "battle" || state.pressureGauge < 100) {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      const character = findCharacter(state.selectedCharacterId);
      const specialty = weapon.specialtyAgainst.includes(state.selectedEnemyId)
        ? weapon.specialtyMultiplier
        : 1;
      const burst = Math.floor(
        state.enemyMaxHp * weapon.skillBurstRatio * specialty * character.damageMultiplier,
      );
      const nextHp = Math.max(state.enemyHp - burst, 0);
      const becomesClear = nextHp === 0 && state.enemyHp > 0;
      set({
        enemyHp: nextHp,
        pressureGauge: 0,
        shotsFired: state.shotsFired + weapon.skillBurstShots,
        shotsHit: state.shotsHit + weapon.skillBurstShots,
        status: nextHp === 0 ? "clear" : state.status,
        lastSkillAt: Date.now(),
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
      });
    },
    useItem: (id) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const stock = state.itemStocks[id];
      if (stock <= 0) {
        return;
      }
      const updated = { ...state.itemStocks, [id]: stock - 1 };
      const baseUpdate = {
        itemStocks: updated,
        lastItemAt: Date.now(),
        lastItemId: id,
      };
      if (id === "clearTonic") {
        set({
          ...baseUpdate,
          playerHp: Math.min(state.playerHp + HEAL_AMOUNT, state.playerMaxHp),
        });
      } else if (id === "lightningRod") {
        set({ ...baseUpdate, lightningMarkers: [] });
      } else if (id === "decoyUmbrella") {
        set({ ...baseUpdate, decoyUntil: Date.now() + DECOY_DURATION_MS });
      } else if (id === "pressureStabilizer") {
        set({
          ...baseUpdate,
          pressureGauge: Math.min(state.pressureGauge + STABILIZER_GAUGE_GAIN, 100),
        });
      }
    },
    spawnLightning: (marker) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      set({ lightningMarkers: [...state.lightningMarkers, marker] });
    },
    removeLightning: (id) => {
      const state = get();
      set({ lightningMarkers: state.lightningMarkers.filter((m) => m.id !== id) });
    },
    shiftMarkerTimes: (deltaMs) => {
      const state = get();
      set({
        lightningMarkers: state.lightningMarkers.map((marker) => ({
          ...marker,
          spawnAt: marker.spawnAt + deltaMs,
          triggersAt: marker.triggersAt + deltaMs,
        })),
      });
    },
    setPointerLocked: (locked) => set({ isPointerLocked: locked }),
    setShieldActive: (active) => {
      const state = get();
      set({ shieldActive: active && state.status === "battle" && state.shieldEnergy > 0 });
    },
  };
});

export { findStage };
