import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from "react";

type BattleDialogVariant = "ready" | "pause" | "clear" | "defeat";

type BattleDialogAction = {
  label: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
  tone?: "primary" | "secondary";
};

type BattleDialogProps = {
  titleId: string;
  title: string;
  eyebrow?: string;
  hint?: ReactNode;
  variant: BattleDialogVariant;
  decor?: ReactNode;
  children?: ReactNode;
  actions: BattleDialogAction[];
};

function trapDialogFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") {
    return;
  }
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  if (buttons.length === 0) {
    return;
  }
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  const activeElement = document.activeElement;
  if (!buttons.includes(activeElement as HTMLButtonElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function BattleDialog({
  actions,
  children,
  decor,
  eyebrow,
  hint,
  title,
  titleId,
  variant,
}: BattleDialogProps) {
  return (
    <div
      className="battleMenuOverlay"
      data-battle-menu
      data-variant={variant}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={trapDialogFocus}
    >
      <div className={`battleDialog battleDialog--${variant}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {decor}
        {eyebrow ? <p className="battleDialog__eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId} className="battleDialog__title">{title}</h1>
        {children ? <div className="battleDialog__body">{children}</div> : null}
        {hint ? <p className="battleDialog__hint">{hint}</p> : null}
        <div className="battleDialog__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              ref={action.ref}
              className={action.tone === "primary" ? "primaryMenuButton" : undefined}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
