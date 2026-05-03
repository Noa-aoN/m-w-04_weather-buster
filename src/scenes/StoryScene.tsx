import { useEffect } from "react";

const chapters = [
  {
    eyebrow: "CHAPTER 01",
    title: "晴天を取り戻す観測機関",
    body: "西暦 20XX 年。地球規模の気候変動により、各地で異常気象が局地的に「個性」を持ち、人々の生活を蝕み始めた。気象観測局はこの現象を「天候性侵害体」と呼称し、観測機 ウェザーバスター を実戦投入する決定を下す。",
  },
  {
    eyebrow: "CHAPTER 02",
    title: "ウェザーブレイカー",
    body: "観測局の精鋭パイロット、通称ウェザーブレイカー。彼らは個別最適化された機体と気象兵器を駆り、出現した天候性侵害体を撃破して空を晴れに戻す任務に就く。撃破時に発生する一瞬の青空（CLEAR SKY）は、市民にとって希望そのものとなった。",
  },
  {
    eyebrow: "CHAPTER 03",
    title: "梅雨だけは、許さない",
    body: "ある観測員は、長く続いた梅雨に父を失った。湿度系侵害体への並外れた執着は、やがて武器「梅雨キラー」として結実する。空を晴らすことは、彼女自身の戦いでもある。",
  },
  {
    eyebrow: "CHAPTER 04",
    title: "そして台風へ",
    body: "観測局が現在最大の脅威として警戒するのは、複合型侵害体「台風」。豪雨・雷・竜巻の性質を併せ持ち、個別の機体では対応が難しい。ウェザーブレイカーの新たなる試練が、そこに待っている。",
  },
];

export function StoryScene({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "h" || key === "escape" || event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <main className="storyShell sceneEnter">
      <div className="gridBackdrop" aria-hidden="true" />
      <header className="screenHeader">
        <div className="screenHeaderInfo">
          <span>PROJECT: WEATHER BUSTER</span>
          <h1>STORY</h1>
          <small>導入ストーリー</small>
        </div>
        <button type="button" className="screenBack" onClick={onBack}>← ホーム (H)</button>
      </header>

      <section className="storyLayout">
        {chapters.map((chapter) => (
          <article key={chapter.eyebrow} className="storyChapter tacticalPanel">
            <span className="storyEyebrow">{chapter.eyebrow}</span>
            <h2>{chapter.title}</h2>
            <p>{chapter.body}</p>
          </article>
        ))}
      </section>

      <footer className="gridFooter">STORY / Press H to back</footer>
    </main>
  );
}
