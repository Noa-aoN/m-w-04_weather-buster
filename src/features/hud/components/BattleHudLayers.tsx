import type { ReactNode } from "react";

export function BattleHudLayer({ children }: { children: ReactNode }) {
  return <div className="battleHudLayer">{children}</div>;
}

export function BattleEffectsLayer({ children }: { children: ReactNode }) {
  return <div className="battleEffectsLayer">{children}</div>;
}

export function BattleMenuLayer({ children }: { children: ReactNode }) {
  return <div className="battleMenuLayer">{children}</div>;
}
