import type { Ref } from "react";
import { BattleDialog } from "./BattleDialog";
import { ControlsHelp } from "./ControlsHelp";

type PrimaryActionRef = Ref<HTMLButtonElement>;

export type CountdownStep = "3" | "2" | "1" | "GO";

export function CountdownOverlay({ value }: { value: CountdownStep }) {
  return (
    <div className={`countdownOverlay ${value === "GO" ? "go" : ""}`} aria-hidden="true">
      <div key={value} className="countdownNumber">{value}</div>
      <div className="countdownRing" />
    </div>
  );
}

export function ReadyMenu({
  characterCodename,
  enemyName,
  onBack,
  onStart,
  primaryActionRef,
  stageName,
}: {
  characterCodename: string;
  enemyName: string;
  onBack: () => void;
  onStart: () => void;
  primaryActionRef: PrimaryActionRef;
  stageName: string;
}) {
  return (
    <BattleDialog
      titleId="battle-ready-title"
      variant="ready"
      eyebrow={`${stageName} / ${characterCodename}`}
      title={`${enemyName}を撃破する`}
      hint="※ Bキー長押しで気象シールド / ESCキーでマウス操作に戻せます"
      actions={[
        { label: "ホームへ (H)", onClick: onBack },
        { label: "戦闘開始 (Enter)", onClick: onStart, ref: primaryActionRef, tone: "primary" },
      ]}
    >
      <ControlsHelp />
    </BattleDialog>
  );
}

export function PauseMenu({
  onBack,
  onResume,
  primaryActionRef,
}: {
  onBack: () => void;
  onResume: () => void;
  primaryActionRef: PrimaryActionRef;
}) {
  return (
    <BattleDialog
      titleId="battle-pause-title"
      variant="pause"
      eyebrow="マウス操作が解除されています"
      title="一時停止中"
      hint="※ Bキー長押しで気象シールド"
      actions={[
        { label: "撤退してタイトルへ (H)", onClick: onBack },
        { label: "プレイ続行 (Enter)", onClick: onResume, ref: primaryActionRef, tone: "primary" },
      ]}
    >
      <ControlsHelp />
    </BattleDialog>
  );
}

export function ClearMenu({
  onBack,
  onShowResult,
  primaryActionRef,
}: {
  onBack: () => void;
  onShowResult: () => void;
  primaryActionRef: PrimaryActionRef;
}) {
  return (
    <BattleDialog
      titleId="battle-clear-title"
      variant="clear"
      eyebrow="雲が割れ、空が戻った"
      title="CLEAR SKY!"
      hint={(
        <>
          <kbd>ESC</kbd>
          <span>マウス操作に戻す（カーソルを表示）</span>
        </>
      )}
      decor={(
        <>
          <span className="clearBannerSun" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--a" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--b" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--c" aria-hidden="true" />
        </>
      )}
      actions={[
        { label: "ホームへ (H)", onClick: onBack },
        { label: "結果を見る (Enter)", onClick: onShowResult, ref: primaryActionRef, tone: "primary" },
      ]}
    />
  );
}

export function DefeatMenu({
  onBack,
  onShowResult,
  primaryActionRef,
}: {
  onBack: () => void;
  onShowResult: () => void;
  primaryActionRef: PrimaryActionRef;
}) {
  return (
    <BattleDialog
      titleId="battle-defeat-title"
      variant="defeat"
      eyebrow="計測機を失った"
      title="WEATHER OVER"
      actions={[
        { label: "ホームへ (H)", onClick: onBack },
        { label: "結果を見る (Enter)", onClick: onShowResult, ref: primaryActionRef, tone: "primary" },
      ]}
    />
  );
}
