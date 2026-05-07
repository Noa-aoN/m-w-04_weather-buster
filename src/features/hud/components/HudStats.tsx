import type { ReactNode } from "react";

type HudMeterTone = "cyan" | "yellow" | "shield";

export function HudStatRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="hudStatRow">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function HudMeter({ tone, value }: { tone: HudMeterTone; value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  return (
    <div className={`segmentedMeter ${tone}`}>
      <i style={{ width: `${clampedValue}%` }} />
    </div>
  );
}
