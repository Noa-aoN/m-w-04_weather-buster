import { useEffect } from "react";

const chapters = [
  {
    eyebrow: "CHAPTER 01",
    title: "空が、敵になった日",
    body: "西暦 20XX 年。気候の変動が極限に達し、雨や雷や雪は ただの天気 をやめた。それは意思を持ち、人を狙い、街を呑むようになった。気象観測局は、これを「天候性侵害体（てんこうせいしんがいたい）」と呼ぶ。普通の傘や避難勧告では、もう間に合わない。",
  },
  {
    eyebrow: "CHAPTER 02",
    title: "気象兵器と CLEAR THE SKY 計画",
    body: "観測局は、敵の天候を逆手に取る兵器群を開発した。湿度を撃ち抜く「梅雨キラー」、電界を反射する「雷除けライフル」、低気圧を圧縮する「クリアスカイガン」。撃破した瞬間、その地点だけ青空が戻る。市民はそれを CLEAR SKY と呼んで、雨上がりよりも明るく笑った。",
  },
  {
    eyebrow: "CHAPTER 03",
    title: "ウェザー・バスター",
    body: "兵器を扱えるのは、気象耐圧スーツに適合した一握りの観測員だけ。彼らは ウェザー・バスター と呼ばれ、空を晴らすことだけを任務とする。風に流されず、雷に焼かれず、雨に視界を奪われない。それが、彼らがプロである所以だ。",
  },
  {
    eyebrow: "CHAPTER 04",
    title: "ノアと、長い雨",
    body: "若いバスター、ノアには、長く止まなかった雨の記憶がある。理由を多く語ることはない。ただ、湿度系侵害体の観測ログだけは誰よりも読み込み、梅雨の兆候を見逃さない。クリアスカイガンを構える時、彼は決まって短くつぶやく。「長い雨は、ここで止める」。",
  },
  {
    eyebrow: "CHAPTER 05",
    title: "晴天の種子",
    body: "侵害体を倒すと、空に薄く光る粒子が残る。観測局はこれを 晴天の種子 と名付けた。種子を一定数集めれば、地域の空は永続的に元の青さを取り戻す ―― それが、ウェザー・バスターズ計画の最終ゴールだ。今日の青空は、明日の青空のための一歩でしかない。",
  },
  {
    eyebrow: "CHAPTER 06",
    title: "そして、台風が来る",
    body: "豪雨・落雷・竜巻 ―― 三つの脅威を併せ持つ複合型侵害体「台風」が観測された。単独では討伐困難。それでもウェザー・バスターは出撃する。空が敵になったその日から、誰かは必ず、空を取り戻しに行かねばならない。",
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
          <button type="button" className="screenBack screenInlineBack" onClick={onBack}>戻る (ESC)</button>
        </div>
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
