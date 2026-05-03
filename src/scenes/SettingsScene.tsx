import { useBattleStore } from "../game/battleStore";

const crosshairPresets: Array<{ id: string; label: string; color: string }> = [
  { id: "white", label: "WHITE", color: "#ffffff" },
  { id: "cyan", label: "CYAN", color: "#28d9ff" },
  { id: "yellow", label: "YELLOW", color: "#ffd84d" },
  { id: "magenta", label: "MAGENTA", color: "#ff5cb1" },
  { id: "lime", label: "LIME", color: "#a8ff60" },
];

export function SettingsScene({ onBack }: { onBack: () => void }) {
  const sensitivity = useBattleStore((state) => state.mouseSensitivity);
  const setSensitivity = useBattleStore((state) => state.setMouseSensitivity);
  const fov = useBattleStore((state) => state.fov);
  const setFov = useBattleStore((state) => state.setFov);
  const cameraMode = useBattleStore((state) => state.cameraMode);
  const setCameraMode = useBattleStore((state) => state.setCameraMode);
  const crosshairColor = useBattleStore((state) => state.crosshairColor);
  const setCrosshairColor = useBattleStore((state) => state.setCrosshairColor);

  return (
    <main className="settingsShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>SETTINGS</h1>
          <small>動作設定 / HUD設定</small>
        </div>
        <button type="button" className="screenBack" onClick={onBack}>← ホーム</button>
      </header>

      <section className="settingsLayout">
        <article className="settingRow tacticalPanel">
          <header>
            <span>感度</span>
            <strong>マウス感度</strong>
          </header>
          <p>視点旋回の倍率。標準は 1.0x。</p>
          <div className="settingControl">
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number.parseFloat(event.target.value))}
            />
            <span className="settingValue">{sensitivity.toFixed(1)}x</span>
          </div>
        </article>

        <article className="settingRow tacticalPanel">
          <header>
            <span>視野</span>
            <strong>FOV</strong>
          </header>
          <p>戦闘カメラの視野角。広いほど周囲を見渡せる。標準 58°。</p>
          <div className="settingControl">
            <input
              type="range"
              min="45"
              max="95"
              step="1"
              value={fov}
              onChange={(event) => setFov(Number.parseInt(event.target.value, 10))}
            />
            <span className="settingValue">{fov}°</span>
          </div>
        </article>

        <article className="settingRow tacticalPanel">
          <header>
            <span>視点</span>
            <strong>戦闘カメラ</strong>
          </header>
          <p>FPS は銃口視点、TPS は選択パイロットの背中越し。</p>
          <div className="cameraModeSwitch" role="radiogroup" aria-label="戦闘カメラ">
            <button
              type="button"
              role="radio"
              aria-checked={cameraMode === "fps"}
              className={cameraMode === "fps" ? "selected" : ""}
              onClick={() => setCameraMode("fps")}
            >
              FPS
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={cameraMode === "tps"}
              className={cameraMode === "tps" ? "selected" : ""}
              onClick={() => setCameraMode("tps")}
            >
              TPS
            </button>
          </div>
        </article>

        <article className="settingRow tacticalPanel">
          <header>
            <span>HUD</span>
            <strong>照準カラー</strong>
          </header>
          <p>レティクル / クロスヘアの色。背景に合わせて選ぶ。</p>
          <div className="crosshairOptions" role="radiogroup" aria-label="照準カラー">
            {crosshairPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={preset.color === crosshairColor}
                className={`crosshairChip ${preset.color === crosshairColor ? "selected" : ""}`}
                onClick={() => setCrosshairColor(preset.color)}
              >
                <span className="crosshairSwatch" style={{ background: preset.color, boxShadow: `0 0 12px ${preset.color}` }} />
                <small>{preset.label}</small>
              </button>
            ))}
          </div>
          <div className="crosshairPreview" aria-hidden="true">
            <div className="crosshairPreviewBox">
              <div className="reticle reticlePreview" style={{ borderColor: crosshairColor, ["--crosshair" as string]: crosshairColor }} />
              <span>PREVIEW</span>
            </div>
          </div>
        </article>

        <article className="settingRow tacticalPanel">
          <header>
            <span>音量</span>
            <strong>マスターボリューム</strong>
          </header>
          <p>BGM・効果音の総音量。MVP では未配線。</p>
          <div className="settingControl">
            <input type="range" min="0" max="100" defaultValue="80" disabled />
            <span className="settingValue">80</span>
          </div>
        </article>
      </section>
    </main>
  );
}
