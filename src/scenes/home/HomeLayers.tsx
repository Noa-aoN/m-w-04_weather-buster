import type { ReactNode } from "react";

type HomeLayerProps = {
  children: ReactNode;
};

export function HomeBackdropLayer({ children }: HomeLayerProps) {
  return <div className="homeBackdropLayer">{children}</div>;
}

export function HomeHudLayer({ children }: HomeLayerProps) {
  return <div className="homeHudLayer">{children}</div>;
}

export function HomeMenuLayer({ children }: HomeLayerProps) {
  return <div className="homeMenuLayer">{children}</div>;
}
