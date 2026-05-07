import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export type PaginatedPage = {
  id: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  /** Optional image or 3D / illustration content area shown above body. */
  visual?: ReactNode;
};

export function PaginatedLayout({ pages }: { pages: PaginatedPage[] }) {
  const [index, setIndex] = useState(0);
  const max = pages.length - 1;
  const current = pages[Math.min(index, max)];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      } else if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setIndex((value) => Math.min(max, value + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [max]);

  if (!current) return null;

  return (
    <div className="paginatedLayout">
      <article key={current.id} className="paginatedPage">
        {current.visual ? <div className="paginatedVisual">{current.visual}</div> : null}
        <div className="paginatedContent">
          {current.eyebrow ? <span className="paginatedEyebrow">{current.eyebrow}</span> : null}
          <h2 className="paginatedTitle">{current.title}</h2>
          <div className="paginatedBody">{current.body}</div>
        </div>
      </article>

      <nav className="paginatedNav" aria-label="ページ送り">
        <button
          type="button"
          className="paginatedNavButton"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          aria-label="前へ"
        >
          ◀
        </button>
        <ol className="paginatedDots">
          {pages.map((page, i) => (
            <li key={page.id}>
              <button
                type="button"
                className={`paginatedDot ${i === index ? "is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1} / ${pages.length}`}
                aria-current={i === index}
              >
                <span aria-hidden="true">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="paginatedNavButton"
          onClick={() => setIndex((value) => Math.min(max, value + 1))}
          disabled={index === max}
          aria-label="次へ"
        >
          ▶
        </button>
      </nav>
    </div>
  );
}
