import { create } from "zustand";
import {
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
  ItemId,
  StageId,
  Weapon,
  WeaponId,
  WeatherEnemyId,
} from "./types";

const PLAYER_MAX_HP = 1250;
const ENEMY_TICK_DAMAGE_BASE = 4;
const HIT_GAUGE_GAIN = 8;
const MISS_GAUGE_GAIN = 2;
const HEAL_AMOUNT = 350;
const STABILIZER_GAUGE_GAIN = 60;
const DECOY_DURATION_MS = 5000;
const DECOY_DAMAGE_RATIO = 0.4;
const DEFAULT_ENEMY_INDEX = 2;
const DEFAULT_WEAPON_INDEX = 1;
const DEFAULT_CHARACTER_ID: CharacterId = "halo";

const initialStocks = (): Record<ItemId, number> => {
  const stocks = {} as Record<ItemId, number>;
  for (const item of items) {
    stocks[item.id] = item.initialStock;
  }
  return stocks;
};

type LightningMarker = {
  id: number;
  x: number;
  z: number;
  triggersAt: number;
  radius: number;
  damage: number;
};

type BattleState = {
  status: BattleStatus;
  selectedEnemyId: WeatherEnemyId;
  selectedWeaponId: WeaponId;
  selectedCharacterId: CharacterId;
  selectedStageId: StageId;
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  ammo: number;
  pressureGauge: number;
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
  selectEnemy: (id: WeatherEnemyId) => void;
  selectWeapon: (id: WeaponId) => void;
  selectCharacter: (id: CharacterId) => void;
  selectStage: (id: StageId) => void;
  setMouseSensitivity: (value: number) => void;
  setFov: (value: number) => void;
  setCameraMode: (value: BattleCameraMode) => void;
  setCrosshairColor: (value: string) => void;
  setLocationEnabled: (value: boolean) => void;
  setCurrentWeather: (enemyId: WeatherEnemyId | null, code: number | null) => void;
  start: () => void;
  reset: () => void;
  shoot: (didHit: boolean) => void;
  reload: () => void;
  takeDamageTick: () => void;
  takeMarkerDamage: (amount: number) => void;
  tick: () => void;
  triggerSkill: () => void;
  useItem: (id: ItemId) => void;
  spawnLightning: (marker: LightningMarker) => void;
  removeLightning: (id: number) => void;
  setPointerLocked: (locked: boolean) => void;
};

const baseLoadout = (weapon: Weapon) => ({
  playerHp: PLAYER_MAX_HP,
  ammo: weapon.maxAmmo,
  pressureGauge: 0,
  shotsFired: 0,
  shotsHit: 0,
  damageTaken: 0,
  elapsedSeconds: 0,
  itemStocks: initialStocks(),
  lightningMarkers: [] as LightningMarker[],
  decoyUntil: 0,
  lastShotAt: 0,
  lastShotHit: false,
  lastItemAt: 0,
  lastItemId: null,
  lastSkillAt: 0,
  lastDefeatAt: 0,
});

const findEnemy = (id: WeatherEnemyId) =>
  weatherEnemies.find((enemy) => enemy.id === id) ??
  weatherEnemies[DEFAULT_ENEMY_INDEX];

const computeIncomingDamage = (
  amount: number,
  decoyUntil: number,
  characterMul: number,
) => {
  const reduced = Date.now() < decoyUntil ? amount * DECOY_DAMAGE_RATIO : amount;
  return reduced * characterMul;
};

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
    playerMaxHp: PLAYER_MAX_HP,
    isPointerLocked: false,
    mouseSensitivity: 1,
    fov: 58,
    cameraMode: "fps",
    crosshairColor: "#ffffff",
    locationEnabled: false,
    currentWeatherEnemyId: null,
    currentWeatherCode: null,
    enemyHp: defaultEnemy.maxHp,
    enemyMaxHp: defaultEnemy.maxHp,
    ...baseLoadout(defaultWeapon),
    selectEnemy: (id) => {
      const target = findEnemy(id);
      const weapon = findWeapon(get().selectedWeaponId);
      set({
        selectedEnemyId: id,
        status: "ready",
        ...baseLoadout(weapon),
        enemyHp: target.maxHp,
        enemyMaxHp: target.maxHp,
      });
    },
    selectWeapon: (id) => {
      const weapon = findWeapon(id);
      const target = findEnemy(get().selectedEnemyId);
      set({
        selectedWeaponId: id,
        status: "ready",
        ...baseLoadout(weapon),
        enemyHp: target.maxHp,
        enemyMaxHp: target.maxHp,
      });
    },
    selectCharacter: (id) => {
      set({ selectedCharacterId: id });
    },
    selectStage: (id) => {
      set({ selectedStageId: id });
    },
    setMouseSensitivity: (value) => set({ mouseSensitivity: value }),
    setFov: (value) => set({ fov: value }),
    setCameraMode: (value) => set({ cameraMode: value }),
    setCrosshairColor: (value) => set({ crosshairColor: value }),
    setLocationEnabled: (value) => set({ locationEnabled: value }),
    setCurrentWeather: (enemyId, code) => set({ currentWeatherEnemyId: enemyId, currentWeatherCode: code }),
    start: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      set({
        status: "battle",
        ...baseLoadout(weapon),
        enemyHp: target.maxHp,
        enemyMaxHp: target.maxHp,
      });
    },
    reset: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      set({
        status: "ready",
        ...baseLoadout(weapon),
        enemyHp: target.maxHp,
        enemyMaxHp: target.maxHp,
      });
    },
    shoot: (didHit) => {
      const state = get();
      if (state.status !== "battle" || state.ammo <= 0) {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      const character = findCharacter(state.selectedCharacterId);
      const damage = didHit
        ? computeOutgoingDamage(weapon, state.selectedEnemyId, character.damageMultiplier)
        : 0;
      const nextHp = Math.max(state.enemyHp - damage, 0);
      const baseGauge = didHit ? HIT_GAUGE_GAIN : MISS_GAUGE_GAIN;
      const gauge = Math.min(
        state.pressureGauge + baseGauge * character.gaugeGainMultiplier,
        100,
      );
      const becomesClear = nextHp === 0 && state.enemyHp > 0;
      set({
        ammo: state.ammo - 1,
        shotsFired: state.shotsFired + 1,
        shotsHit: state.shotsHit + (didHit ? 1 : 0),
        enemyHp: nextHp,
        pressureGauge: gauge,
        status: nextHp === 0 ? "clear" : state.status,
        lastShotAt: Date.now(),
        lastShotHit: didHit,
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
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
      if (state.status !== "battle") {
        return;
      }
      const enemy = findEnemy(state.selectedEnemyId);
      const character = findCharacter(state.selectedCharacterId);
      const damage = computeIncomingDamage(
        enemy.threat * ENEMY_TICK_DAMAGE_BASE,
        state.decoyUntil,
        character.damageTakenMultiplier,
      );
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        damageTaken: state.damageTaken + damage,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    takeMarkerDamage: (amount) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const character = findCharacter(state.selectedCharacterId);
      const damage = computeIncomingDamage(amount, state.decoyUntil, character.damageTakenMultiplier);
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        damageTaken: state.damageTaken + damage,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    tick: () => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      set({ elapsedSeconds: state.elapsedSeconds + 1 });
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
    setPointerLocked: (locked) => set({ isPointerLocked: locked }),
  };
});

export { findStage };
