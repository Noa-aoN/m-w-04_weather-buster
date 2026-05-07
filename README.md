# ウェザー・バスターズ 〜CLEAR THE SKY〜

荒れた天候を撃ち抜き、空を晴らす 3D アリーナアクションです。
プレイヤーは「ウェザー・バスター」として、豪雨・落雷・竜巻・梅雨・吹雪などの天候性侵害体を制圧します。

公開版: https://noa-aon.github.io/m-w-04_weather-buster/

## 見どころ

- 天候モンスターごとに異なる攻撃、色、ステージ演出
- 銃・ライフル・カノン・近接ブレードを切り替える装備選択
- 撃破時に空が晴れる `CLEAR SKY!` 演出
- バスター、武器、戦域、敵、難易度をホーム画面で即変更
- SFX / BGM、GPS連動候補、視点感度などの設定つき

## 遊び方

1. ホーム画面の `MISSION PREVIEW` で敵、武器、バスター、戦域、難易度を選ぶ
2. `ゲーム開始` で出撃
3. 攻撃を避けながら敵HPを削る
4. 気圧ゲージが溜まったら `Q` で武器スキル
5. 敵を倒して `CLEAR SKY!` を目指す

## 操作

| 操作 | 内容 |
| --- | --- |
| W A S D | 移動 |
| Mouse | 視点操作 |
| Left Click | 攻撃 |
| Right Click / R | リロード |
| Q | 武器スキル |
| B | 気象シールド |
| 1-4 | アイテム |
| Space | ジャンプ |
| Shift | ダッシュ |
| Esc | ポーズ |

`風切ブレード` は弾を撃たない近接武器です。敵との間合いに入って正面から斬った時だけダメージが入ります。

## 登場要素

### 敵

- 曇り: 練習向け
- 豪雨: 視界妨害と連続攻撃
- 落雷: 高威力の落雷攻撃
- 竜巻: 吸引と接近圧
- 梅雨: 鈍足を含む状態異常
- 吹雪: 視界と動きを乱す氷雪系
- 台風: Coming soon

### 武器

- ウェザーガン
- クリアスカイガン
- 梅雨キラー
- 雷除けライフル
- 凍結カノン
- 風切ブレード

## 技術構成

- Vite
- React
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei
- Zustand
- Vitest

## 開発

```sh
pnpm install
pnpm dev
```

開発サーバは `http://localhost:3040` で起動します。

## 検証

```sh
pnpm typecheck
pnpm build
pnpm test
```

## デプロイ

GitHub Pages へデプロイします。`main` に反映後、GitHub Actions の Pages workflow が `dist/` を公開します。

## ドキュメント

- 公開仕様: [docs/spec.md](docs/spec.md)
- アーキテクチャ方針: [docs/architecture.md](docs/architecture.md)
- 開発用詳細: [docs/development-readme.md](docs/development-readme.md)
