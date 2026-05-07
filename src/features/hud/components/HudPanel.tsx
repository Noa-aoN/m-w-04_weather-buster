import type { ComponentPropsWithoutRef, ReactNode } from "react";

type HudPanelElement = "div" | "aside";

type HudPanelProps = ComponentPropsWithoutRef<"div"> & {
  as?: HudPanelElement;
  children: ReactNode;
};

export function HudPanel({ as: Element = "div", children, className = "", ...props }: HudPanelProps) {
  return (
    <Element className={`${className} tacticalPanel`.trim()} {...props}>
      {children}
    </Element>
  );
}
