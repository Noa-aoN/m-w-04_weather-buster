import type { WeatherEnemy, Weapon } from "./types";

export const weatherEnemies: WeatherEnemy[] = [
  {
    id: "cloudy",
    name: "曇り",
    maxHp: 80,
    color: "#aeb7bf",
    accentColor: "#e7edf2",
    description: "練習用の曇天訓練。まずは空を晴らす感覚を掴む。",
  },
  {
    id: "heavyRain",
    name: "豪雨",
    maxHp: 120,
    color: "#1f8ac0",
    accentColor: "#7dd8ff",
    description: "雨弾と視界妨害を使う基本敵。水たまりの鈍足が厄介。",
  },
  {
    id: "thunderstorm",
    name: "多雷",
    maxHp: 140,
    color: "#f2c94c",
    accentColor: "#fff2a6",
    description: "落雷予兆から高威力攻撃を狙う敵。位置取りが重要。",
  },
];

export const initialWeapon: Weapon = {
  name: "ウェザーガン",
  damage: 12,
  skillName: "前線押し戻し",
};
