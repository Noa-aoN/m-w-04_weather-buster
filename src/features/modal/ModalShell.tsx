import { useEffect } from "react";
import type { ReactNode } from "react";

// Shared root for every "modal-like" sub-page reachable from the home menu
// (codex, story, loadout, settings, result). Standardises:
//   - shell padding + frame
//   - eyebrow / title / subtitle / inline back button
//   - escape / H to back
// The page-specific layout (codex / paginated / list) lives in the children.
export function ModalShell({
  variant,
  eyebrow,
  title,
  subtitle,
  onBack,
  backLabel = "戻る (ESC)",
  children,
}: {
  variant: "codex" | "paginated" | "settings" | "result";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "h" || event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <main className={`modalShell modalShell--${variant} sceneEnter`}>
      <div className="modalBackdrop" aria-hidden="true" />
      <header className="modalHeader">
        <div className="modalHeaderInfo">
          {eyebrow ? <span className="modalHeaderEyebrow">{eyebrow}</span> : null}
          <h1 className="modalHeaderTitle">{title}</h1>
          {subtitle ? <small className="modalHeaderSub">{subtitle}</small> : null}
        </div>
        <button type="button" className="modalBackButton" onClick={onBack}>
          {backLabel}
        </button>
      </header>
      <section className="modalBody">{children}</section>
    </main>
  );
}
