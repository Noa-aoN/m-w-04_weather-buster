import type { ReactNode } from "react";
import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// Prev/Next overlay rendered on top of the 3D preview canvas. Lets the user
// flip through codex entries without taking their hands off the preview area
// (mouse stays over the canvas for orbit). Skips locked entries.
function CodexPreviewNav<T extends string>({
  entries,
  selectedId,
  onSelect,
}: {
  entries: CodexEntry<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
}) {
  const playable = entries.filter((entry) => !entry.locked);
  const currentIdx = playable.findIndex((entry) => entry.id === selectedId);
  const safeIdx = currentIdx < 0 ? 0 : currentIdx;
  const prev = playable[(safeIdx - 1 + playable.length) % playable.length];
  const next = playable[(safeIdx + 1) % playable.length];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (prev) onSelect(prev.id);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (next) onSelect(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onSelect]);

  if (playable.length <= 1) return null;
  return (
    <>
      <button
        type="button"
        className="codexPreviewNav codexPreviewNav--prev"
        onClick={() => prev && onSelect(prev.id)}
        aria-label={`前へ: ${prev?.name ?? ""}`}
      >
        ◀
      </button>
      <button
        type="button"
        className="codexPreviewNav codexPreviewNav--next"
        onClick={() => next && onSelect(next.id)}
        aria-label={`次へ: ${next?.name ?? ""}`}
      >
        ▶
      </button>
      <span className="codexPreviewIndex" aria-hidden="true">
        {safeIdx + 1} / {playable.length}
      </span>
    </>
  );
}

// Generic codex page: list on the left, big 3D preview + description block
// on the right. The preview scene is supplied as a render prop so each codex
// (敵 / バスター / 装備 / 戦域) plugs in its own model. Drag rotates and
// scroll zooms via drei's OrbitControls.

export type CodexEntry<T extends string> = {
  id: T;
  index?: string;
  name: string;
  trait?: string;
  description?: string;
  locked?: boolean;
  lockedLabel?: string;
};

export function CodexLayout<T extends string>({
  entries,
  selectedId,
  onSelect,
  renderPreview,
  detailHeader,
  detailBody,
  cameraDistance = 4.4,
  cameraPosition,
  cameraTarget = [0, 0.2, 0],
  fov = 38,
}: {
  entries: CodexEntry<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  renderPreview: (id: T) => ReactNode;
  detailHeader?: ReactNode;
  detailBody?: ReactNode;
  cameraDistance?: number;
  /** Override the default `[0, 0.4, cameraDistance]` framing. */
  cameraPosition?: [number, number, number];
  /** OrbitControls target — point of interest the camera orbits around. */
  cameraTarget?: [number, number, number];
  fov?: number;
}) {
  const camPos = cameraPosition ?? ([cameraTarget[0], cameraTarget[1] + 0.1, cameraDistance] as [number, number, number]);
  return (
    <div className="codexLayout">
      <aside className="codexList">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={[
              "codexListItem",
              selectedId === entry.id ? "is-selected" : "",
              entry.locked ? "is-locked" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => !entry.locked && onSelect(entry.id)}
            aria-pressed={selectedId === entry.id}
            aria-disabled={entry.locked}
            disabled={entry.locked}
          >
            {entry.index ? <span className="codexListIndex">{entry.index}</span> : null}
            <span className="codexListName">{entry.name}</span>
            {entry.trait ? <em className="codexListTrait">{entry.trait}</em> : null}
            {entry.locked ? <b className="codexListLock">{entry.lockedLabel ?? "準備中"}</b> : null}
          </button>
        ))}
      </aside>

      <div className="codexPreview">
        <div className="codexPreviewCanvas">
          <Canvas
            camera={{ position: camPos, fov }}
            dpr={[1, 1.25]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <color attach="background" args={["#06121d"]} />
            <ambientLight intensity={0.7} />
            <hemisphereLight args={["#bdeeff", "#1c2a36", 0.6]} />
            <directionalLight position={[3, 4, 3]} intensity={1.8} />
            <pointLight position={[-2, 1, 1]} intensity={1.2} color="#27d9ff" />
            <fog attach="fog" args={["#06121d", cameraDistance + 2, cameraDistance + 9]} />
            {renderPreview(selectedId)}
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              minDistance={cameraDistance * 0.55}
              maxDistance={cameraDistance * 1.85}
              target={cameraTarget}
            />
          </Canvas>
          <CodexPreviewNav
            entries={entries}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <p className="codexPreviewHint">ドラッグで回転 / ホイールで拡大縮小</p>
        </div>
        {detailHeader || detailBody ? (
          <div className="codexDetail">
            {detailHeader ? <header className="codexDetailHeader">{detailHeader}</header> : null}
            {detailBody ? <div className="codexDetailBody">{detailBody}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
