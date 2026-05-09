import { useBattleStore } from "../../../game/battleStore";

const controlHints: Array<[string, string]> = [
  ["W・A・S・D", "移動 (↑・←・↓・→)"],
  ["マウス", "視点"],
  ["B", "気象シールド"],
  ["スペース", "ジャンプ"],
  ["シフト", "ダッシュ"],
  ["R", "リロード"],
  ["Q", "ウェポンスキル"],
  ["ESC", "ポーズ"],
];

export function ControlsHelp() {
  // Right click swaps function with the blade: blades fire a ranged
  // crescent, every other weapon reloads.
  const isBlade = useBattleStore((state) => state.selectedWeaponId === "windBlade");
  const primaryHints: Array<[string, string]> = isBlade
    ? [
        ["左クリック", "近接斬撃"],
        ["右クリック", "中距離斬撃"],
      ]
    : [
        ["左クリック", "射撃"],
        ["右クリック", "リロード"],
      ];
  return (
    <div className="controlsHelpWrap">
      <p className="controlsHelpHeading">操作方法</p>
      <dl className="controlsHelp controlsHelp--primary">
        {primaryHints.map(([key, label]) => (
          <div key={key}>
            <kbd>{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </dl>
      <dl className="controlsHelp">
        {controlHints.map(([key, label]) => (
          <div key={key}>
            <kbd>{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </dl>
    </div>
  );
}
