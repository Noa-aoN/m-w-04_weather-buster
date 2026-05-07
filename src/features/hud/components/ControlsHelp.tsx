const primaryHints: Array<[string, string]> = [
  ["左クリック", "射撃"],
  ["右クリック", "リロード"],
];

const controlHints: Array<[string, string]> = [
  ["W A S D", "移動"],
  ["マウス", "視点"],
  ["B", "気象シールド"],
  ["スペース", "ジャンプ"],
  ["シフト", "ダッシュ"],
  ["R", "リロード"],
  ["Q", "武器スキル"],
  ["ESC", "ポーズ"],
];

export function ControlsHelp() {
  return (
    <div className="controlsHelpWrap">
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
