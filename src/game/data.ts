import type {
  BossMinionConfig,
  Character,
  Item,
  MinionType,
  MinionTypeId,
  Stage,
  Weapon,
  WeatherEnemy,
  WeatherEnemyId,
} from "./types";

export const weatherEnemies: WeatherEnemy[] = [
  {
    id: "cloudy",
    index: "01",
    name: "曇り",
    maxHp: 510,
    color: "#b9c2c9",
    accentColor: "#63d8ff",
    coreColor: "#b7f2ff",
    icon: "☁",
    trait: "練習",
    threat: 2,
    difficulty: 1,
    description: "薄い視界の濁りを残す、入門級の天侵体。動きは緩く、まず狙い撃つ標的に最適。",
    playableInMvp: true,
  },
  {
    id: "heavyRain",
    index: "02",
    name: "豪雨",
    maxHp: 810,
    color: "#255f88",
    accentColor: "#29c8ff",
    coreColor: "#5ee7ff",
    icon: "☔",
    trait: "視界妨害",
    threat: 4,
    difficulty: 2,
    description: "視界を白く塗りつぶす豪雨を纏う。攻撃は速く、立ち止まる者を雨脚で削り取る。",
    playableInMvp: true,
  },
  {
    id: "thunderstorm",
    index: "03",
    name: "落雷",
    maxHp: 1000,
    color: "#4b4f58",
    accentColor: "#ffd84d",
    coreColor: "#fff2a6",
    icon: "⚡",
    trait: "落雷",
    threat: 6,
    difficulty: 3,
    description: "頭上に黒雲を背負い、地表へ高圧の雷を落とす。直撃すれば、致命。",
    playableInMvp: true,
  },
  {
    id: "tornado",
    index: "04",
    name: "竜巻",
    maxHp: 1190,
    color: "#9fb8c8",
    accentColor: "#6be6ff",
    coreColor: "#8df0ff",
    icon: "◌",
    trait: "吸引",
    threat: 7,
    difficulty: 4,
    description: "巨大な渦を伴って迫る。間合いに踏み込まれた者は風に巻き上げられ、連撃で削られる。",
    playableInMvp: true,
  },
  {
    id: "rainySeason",
    index: "05",
    name: "梅雨",
    maxHp: 1300,
    color: "#315d54",
    accentColor: "#4ce0b3",
    coreColor: "#8dffd8",
    icon: "♢",
    trait: "状態異常",
    threat: 7,
    difficulty: 4,
    description: "湿った霧を撒き、機材と肺を同時に重くする。継続ダメージと移動阻害が厄介。",
    playableInMvp: true,
  },
  {
    id: "blizzard",
    index: "06",
    name: "吹雪",
    maxHp: 1190,
    color: "#b7d7f2",
    accentColor: "#9fe8ff",
    coreColor: "#dff8ff",
    icon: "❄",
    trait: "凍結",
    threat: 6,
    difficulty: 3,
    description: "白い暴風で視界を奪い、関節を凍らせて行動を止めにくる。火力で押し切るタイプ。",
    playableInMvp: true,
  },
  {
    id: "typhoon",
    index: "07",
    name: "台風",
    maxHp: 2300,
    color: "#314d65",
    accentColor: "#24d8ff",
    coreColor: "#f9fbff",
    icon: "◎",
    trait: "準備中",
    threat: 9,
    difficulty: 5,
    description: "豪雨・落雷・竜巻を併せ持つ複合型天侵体。現在、観測局で調整中。",
    playableInMvp: false,
  },
];

export const weapons: Weapon[] = [
  {
    id: "weatherGun",
    name: "ウェザーガン",
    damage: 12,
    maxAmmo: 32,
    fireRateMs: 90,
    skillName: "天候連射",
    skillDescription: "敵HPの 22% を 8 連射で素早く削る。",
    skillBurstRatio: 0.22,
    skillBurstShots: 8,
    description: "標準支給の基本ウェポン。連射と取り回しのバランスに優れる。",
    specialtyAgainst: [],
    specialtyMultiplier: 1,
  },
  {
    id: "clearSkyGun",
    name: "クリアスカイガン",
    damage: 19,
    maxAmmo: 22,
    fireRateMs: 140,
    skillName: "晴天バースト",
    skillDescription: "圧縮した低気圧弾を 5 発、敵HPの 32% を一気に削る。",
    skillBurstRatio: 0.32,
    skillBurstShots: 5,
    description: "扱いやすい中口径ウェポン。スキルの一撃で局面をひっくり返せる。",
    specialtyAgainst: [],
    specialtyMultiplier: 1,
  },
  {
    id: "rainySeasonKiller",
    name: "梅雨キラー",
    damage: 22,
    maxAmmo: 9,
    fireRateMs: 220,
    skillName: "湿度排除",
    skillDescription: "敵HPの 28% を 3 発で削る。湿気系の天侵体には特効で +35%。",
    skillBurstRatio: 0.28,
    skillBurstShots: 3,
    description: "湿度系特化の重ウェポン。特効対象の梅雨・豪雨にだけ強く、それ以外には控えめ。",
    specialtyAgainst: ["rainySeason", "heavyRain"],
    specialtyMultiplier: 1.35,
  },
  {
    id: "stormwallRifle",
    name: "雷除けライフル",
    damage: 14,
    maxAmmo: 14,
    fireRateMs: 130,
    skillName: "電界反射",
    skillDescription: "敵HPの 26% を 4 発で削る。落雷には特効で +40%。",
    skillBurstRatio: 0.26,
    skillBurstShots: 4,
    description: "対落雷特化のライフル。落雷以外には威力が抑えめ。",
    specialtyAgainst: ["thunderstorm"],
    specialtyMultiplier: 1.4,
  },
  {
    id: "frostlance",
    name: "凍結カノン",
    damage: 18,
    maxAmmo: 10,
    fireRateMs: 200,
    skillName: "凍結弾",
    skillDescription: "敵HPの 26% を 4 発で凍結。吹雪・竜巻には特効で +30%。",
    skillBurstRatio: 0.26,
    skillBurstShots: 4,
    description: "対吹雪・竜巻特化の重カノン。それ以外には威力が控えめ。",
    specialtyAgainst: ["blizzard", "tornado"],
    specialtyMultiplier: 1.3,
  },
  {
    id: "windBlade",
    name: "風切ブレード",
    damage: 36,
    maxAmmo: 999,
    fireRateMs: 360,
    skillName: "風向反転",
    skillDescription: "敵HPの 28% を 3 連斬で削る。竜巻・台風には特効で +35%。",
    skillBurstRatio: 0.28,
    skillBurstShots: 3,
    description: "弾を持たない近接ブレード。竜巻・台風以外には威力が抑えめで、玄人向け。",
    specialtyAgainst: ["tornado", "typhoon"],
    specialtyMultiplier: 1.35,
  },
];

export const items: Item[] = [
  {
    id: "clearTonic",
    slotKey: "1",
    name: "晴れ薬",
    effect: "耐候値を回復",
    description: "使用すると耐候値を 350 回復する",
    initialStock: 3,
  },
  {
    id: "lightningRod",
    slotKey: "2",
    name: "避雷針",
    effect: "落雷予兆を打ち消す",
    description: "場のすべての落雷予兆を消す",
    initialStock: 2,
  },
  {
    id: "decoyUmbrella",
    slotKey: "3",
    name: "デコイ傘",
    effect: "敵の狙いを逸らす",
    description: "5秒間、被ダメージを 60% 軽減する",
    initialStock: 2,
  },
  {
    id: "pressureStabilizer",
    slotKey: "4",
    name: "気圧安定剤",
    effect: "気圧ゲージを蓄積",
    description: "ウェポンスキルゲージを大きく増やす",
    initialStock: 1,
  },
];

export const characters: Character[] = [
  {
    id: "noa",
    codename: "ノア",
    callSign: "NOA",
    role: "機動バランス",
    passiveName: "晴天適応",
    passiveDescription: "与ダメ +10% / 移動 +10%",
    damageMultiplier: 1.1,
    damageTakenMultiplier: 1.0,
    gaugeGainMultiplier: 1.0,
    moveSpeedMultiplier: 1.1,
    accentColor: "#28d9ff",
    description: "気象観測局所属のバスター。長く続いた雨の記憶を胸に、湿度系天侵体の観測と制圧に強いこだわりを持つ。軽装の機動力で間合いを支配する。",
    flavor: "梅雨を、ゆるさない",
  },
  {
    id: "saka",
    codename: "サカ",
    callSign: "SAKA",
    role: "重装アタッカー",
    passiveName: "重装気圧",
    passiveDescription: "与ダメ +30% / 被ダメ -15% / 移動 -20%",
    damageMultiplier: 1.3,
    damageTakenMultiplier: 0.85,
    gaugeGainMultiplier: 1.0,
    moveSpeedMultiplier: 0.8,
    accentColor: "#ffd84d",
    description: "装甲スーツを纏った重装アタッカー。機動性は捨て、圧倒的な火力と粘り強さで短期決戦を仕掛ける。にんじん片手に踏み込む独自スタイル。",
    flavor: "にんじん齧って、撃ち抜くぜ",
  },
];

export const stages: Stage[] = [
  {
    id: "lab",
    name: "天候研究所",
    description: "試作機の検証場。整備された円形フィールド。",
    ambientColor: "#1f4255",
    groundColor: "#0a141c",
    ringColor: "#28d9ff",
    fogColor: "#06121b",
    skyTurbidity: 9,
    skyRayleigh: 3.2,
    buildingColor: "#1f2f3a",
    buildingEmissive: "#0aa0d7",
    arena: { x: 11, zFront: -3, zBack: 9 },
  },
  {
    id: "ruins",
    name: "都市跡",
    description: "崩壊した観測都市。瓦礫が残る非対称地形。",
    ambientColor: "#3d2218",
    groundColor: "#1a0f0a",
    ringColor: "#ff8845",
    fogColor: "#1a0c08",
    skyTurbidity: 14,
    skyRayleigh: 1.4,
    buildingColor: "#3a2a26",
    buildingEmissive: "#d76a2e",
    arena: { x: 19, zFront: -6, zBack: 16 },
  },
  {
    id: "highland",
    name: "高地観測所",
    description: "極寒の山頂観測所。視界が霧で淡い。",
    ambientColor: "#22425b",
    groundColor: "#152030",
    ringColor: "#bce6ff",
    fogColor: "#a7c8d8",
    skyTurbidity: 4,
    skyRayleigh: 0.8,
    buildingColor: "#2c4453",
    buildingEmissive: "#7ab5d7",
    arena: { x: 21, zFront: -7, zBack: 18 },
  },
];

type DifficultyModifier = {
  hp: number;
  attackDamage: number;
  attackInterval: number;
  itemMultiplier: number;
  movementAggression: number;
};

export const difficultyModifiers: Record<1 | 2 | 3 | 4 | 5, DifficultyModifier> = {
  1: { hp: 0.7, attackDamage: 0.55, attackInterval: 1.6, itemMultiplier: 1.6, movementAggression: 0.5 },
  2: { hp: 0.9, attackDamage: 0.85, attackInterval: 1.25, itemMultiplier: 1.3, movementAggression: 0.75 },
  3: { hp: 1.0, attackDamage: 1.0, attackInterval: 1.0, itemMultiplier: 1.0, movementAggression: 1.0 },
  4: { hp: 1.25, attackDamage: 1.25, attackInterval: 0.82, itemMultiplier: 0.7, movementAggression: 1.3 },
  5: { hp: 1.6, attackDamage: 1.55, attackInterval: 0.65, itemMultiplier: 0.5, movementAggression: 1.7 },
};

export type EnemyAttackPattern = {
  intervalMs: number;
  warningMs: number;
  damage: number;
  radius: number;
  projectileColor: string;
  arcHeight: number;
  spreadX: number;
  spreadZ: number;
  followsPlayer: boolean;
  trailGlow: number;
  kind: "arc" | "linear" | "falling";
  knockback: number;
  barrierIntervalMs: number;
  barrierDurationMs: number;
};

export const enemyAttackPatterns: Record<string, EnemyAttackPattern> = {
  cloudy: {
    intervalMs: 4500,
    warningMs: 1800,
    damage: 28,
    radius: 1.6,
    projectileColor: "#cfe9f4",
    arcHeight: 3.6,
    spreadX: 8,
    spreadZ: 6,
    followsPlayer: false,
    trailGlow: 0.6,
    kind: "arc",
    knockback: 0,
    barrierIntervalMs: 0,
    barrierDurationMs: 0,
  },
  heavyRain: {
    intervalMs: 1100,
    warningMs: 700,
    damage: 35,
    radius: 1.4,
    projectileColor: "#5ee7ff",
    arcHeight: 0,
    spreadX: 12,
    spreadZ: 8,
    followsPlayer: true,
    trailGlow: 1.4,
    kind: "linear",
    knockback: 0.6,
    barrierIntervalMs: 0,
    barrierDurationMs: 0,
  },
  thunderstorm: {
    intervalMs: 2200,
    warningMs: 1500,
    damage: 110,
    radius: 1.6,
    projectileColor: "#fff2a6",
    arcHeight: 0,
    spreadX: 14,
    spreadZ: 9,
    followsPlayer: false,
    trailGlow: 2.4,
    kind: "falling",
    knockback: 0.4,
    barrierIntervalMs: 17000,
    barrierDurationMs: 1800,
  },
  tornado: {
    intervalMs: 1700,
    warningMs: 1100,
    damage: 70,
    radius: 1.5,
    projectileColor: "#8df0ff",
    arcHeight: 2.4,
    spreadX: 5,
    spreadZ: 4,
    followsPlayer: true,
    trailGlow: 1.4,
    kind: "arc",
    knockback: 1.6,
    barrierIntervalMs: 0,
    barrierDurationMs: 0,
  },
  rainySeason: {
    intervalMs: 2900,
    warningMs: 1700,
    damage: 74,
    radius: 2.1,
    projectileColor: "#8dffd8",
    arcHeight: 3.4,
    spreadX: 10,
    spreadZ: 7,
    followsPlayer: false,
    trailGlow: 1.0,
    kind: "arc",
    knockback: 0.3,
    barrierIntervalMs: 0,
    barrierDurationMs: 0,
  },
  blizzard: {
    intervalMs: 2500,
    warningMs: 1400,
    damage: 84,
    radius: 1.7,
    projectileColor: "#dff8ff",
    arcHeight: 3.0,
    spreadX: 12,
    spreadZ: 8,
    followsPlayer: false,
    trailGlow: 1.6,
    kind: "arc",
    knockback: 0.8,
    barrierIntervalMs: 0,
    barrierDurationMs: 0,
  },
  typhoon: {
    intervalMs: 1500,
    warningMs: 1000,
    damage: 112,
    radius: 2.0,
    projectileColor: "#f9fbff",
    arcHeight: 0,
    spreadX: 16,
    spreadZ: 10,
    followsPlayer: true,
    trailGlow: 2.2,
    kind: "linear",
    knockback: 1.4,
    barrierIntervalMs: 14000,
    barrierDurationMs: 2400,
  },
};

// === Minion configuration =================================================
//
// Two layers, both swappable:
//   `minionTypes`   — what a minion *is* (stats, visuals borrowed from a
//                     WeatherEnemy, attack pattern). Add new species here.
//   `bossMinionConfig` — *which* boss summons *which* type, when, and how
//                     many per difficulty. Reassign the type field to swap
//                     a boss's summon without touching engine code.
export const minionTypes: Record<MinionTypeId, MinionType> = {
  stratus: {
    id: "stratus",
    baseEnemyId: "cloudy",
    maxHp: 60,
    attackIntervalMs: 2400,
    attackWarningMs: 900,
    attackDamage: 22,
    attackRadius: 1.5,
    scale: 1.08,
    hoverY: 1.3,
    hoverAmp: 0.16,
    bossDamageReceivedMul: 0.92,
    bossAttackIntervalMul: 5.0,
    bossStandoffBonus: 13.0,
  },
};

export const bossMinionConfig: Partial<Record<WeatherEnemyId, BossMinionConfig>> = {
  heavyRain: {
    type: "stratus",
    spawnAtRatios: [0.8, 0.5, 0.25],
    maxByDifficulty: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 3 },
    maxTotalSpawnsByDifficulty: { 1: 0, 2: 0, 3: 2, 4: 3, 5: 3 },
  },
  rainySeason: {
    type: "stratus",
    spawnAtRatios: [0.8, 0.5, 0.25],
    maxByDifficulty: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 3 },
    maxTotalSpawnsByDifficulty: { 1: 0, 2: 0, 3: 2, 4: 3, 5: 3 },
  },
};

export const findMinionType = (id: MinionTypeId): MinionType => minionTypes[id];

// Contact reaction: triggered when the player walks into a boss's body.
// Per-enemy so the impact reads as in-character with that weather (rainy
// types soak / slow, blizzard freezes briefly, tornado throws hard, etc.).
// `cooldownMs` prevents spam while still touching.
export type EnemyContactReaction = {
  damage: number;
  knockback: number;
  slowMs?: number;
  cooldownMs: number;
};

export const enemyContactReactions: Record<WeatherEnemyId, EnemyContactReaction> = {
  cloudy: { damage: 15, knockback: 1.4, cooldownMs: 800 },
  heavyRain: { damage: 30, knockback: 2.5, slowMs: 700, cooldownMs: 700 },
  thunderstorm: { damage: 45, knockback: 2.0, cooldownMs: 1000 },
  tornado: { damage: 22, knockback: 5.0, cooldownMs: 500 },
  rainySeason: { damage: 28, knockback: 1.6, slowMs: 1600, cooldownMs: 700 },
  blizzard: { damage: 35, knockback: 2.4, slowMs: 600, cooldownMs: 800 },
  typhoon: { damage: 50, knockback: 4.0, slowMs: 900, cooldownMs: 600 },
};

export const CONTACT_RADIUS = 2.4;

export const initialWeapon: Weapon = weapons[1];

export const findWeapon = (id: Weapon["id"]) =>
  weapons.find((weapon) => weapon.id === id) ?? initialWeapon;

export const findItem = (id: Item["id"]) =>
  items.find((item) => item.id === id);

export const findCharacter = (id: Character["id"]) =>
  characters.find((character) => character.id === id) ?? characters[0];

export const findStage = (id: Stage["id"]) =>
  stages.find((stage) => stage.id === id) ?? stages[0];

export const mvpEnemies = weatherEnemies.filter((enemy) => enemy.playableInMvp);
