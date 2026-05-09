import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

// Shared loading overlay used by every scene that mounts a 3D Canvas.
// Listens to drei's `useProgress` (Three's DefaultLoadingManager) so any
// GLB / texture / FBX request triggers the indicator. Auto-fades when no
// resources are active.
export function SceneLoader({
  label = "天候情報を読み込み中…",
}: {
  label?: string;
}) {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active && progress >= 99.99) {
      const t = window.setTimeout(() => setVisible(false), 380);
      return () => window.clearTimeout(t);
    }
    setVisible(true);
  }, [active, progress]);

  if (!visible) return null;
  return (
    <div className={`homeLoader ${!active ? "is-fading" : ""}`} aria-live="polite">
      <svg className="homeLoaderIcon" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="120 50" strokeOpacity="0.55" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="6" y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="1" strokeOpacity="0.65" />
        <line x1="50" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="1" strokeOpacity="0.65" />
        <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.65" />
        <line x1="32" y1="50" x2="32" y2="58" stroke="currentColor" strokeWidth="1" strokeOpacity="0.65" />
        <circle cx="32" cy="32" r="2.4" fill="currentColor" />
      </svg>
      <p className="homeLoaderText">{label}</p>
      <div className="homeLoaderBar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, Math.max(4, progress))}%` }} />
      </div>
      <small className="homeLoaderProgress">{Math.round(progress)}%</small>
    </div>
  );
}
