# ウェザーバスター 〜CLEAR THE SKY〜

荒れた空を撃ち抜き、晴れを取り戻す3Dアリーナシューターです。  
プレイヤーは「ウェザーブレイカー」として、豪雨・落雷・竜巻・梅雨・台風・吹雪などの異常気象モンスターと戦い、空を晴れに戻します。

敵を倒した瞬間に雲が割れ、青空とともに `CLEAR SKY!` が表示される体験を、このゲームの最優先価値として設計します。

## コンセプト

> 荒れた空を撃ち抜き、晴れを取り戻せ。

このゲームでは、天気そのものではなく、生活や行動を妨げる「クセのある天候現象」を敵として扱います。

- 晴れ: ゴール / 勝利状態
- 曇り: チュートリアル・練習用
- 豪雨・落雷・竜巻・梅雨・台風・吹雪: 敵
- 台風: 将来的なボス候補

## ジャンル

3Dアリーナシューター / FPS寄り

本格的な競技FPSよりも、まずは次の体験を重視します。

- 3D空間を移動する
- 敵の攻撃を避ける
- 天候モンスターを撃つ
- スキルやアイテムを使う
- 倒すと空が晴れる

## コア体験

```txt
敵天候を倒す
  ↓
空が晴れる
  ↓
CLEAR SKY!
```

FPSとしての完成度を追い込む前に、まずは「天候をブレイクして晴れを取り戻した感」を成立させます。

## MVPスコープ

### 初期ステージ

- 実験場

### 初期敵

- 曇り
- 豪雨
- 落雷

### 初期武器

- ウェザーガン
- クリアスカイガン
- 梅雨キラー

### 初期スキル

- キャラ固有スキル
- 武器スキル

### 初期アイテム

- 晴れ薬
- デコイ傘
- 避雷針
- 気圧安定剤

### 結果画面

- 撃破時間
- 命中率
- 被ダメージ率
- 晴天化スコア
- ランク

## スキル設計

スキルは2系統に分けます。

```txt
キャラ固有スキル: 常時発動
武器スキル: 命中でゲージが溜まり、任意発動
```

この構成により、キャラ選択・武器選択・プレイスキルのすべてに意味を持たせます。

## 技術構成案

- Vite
- React
- TypeScript
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/rapier`
- zustand

## ドキュメント

- 開発用詳細: [docs/development-readme.md](docs/development-readme.md)
- 公開仕様: [docs/spec.md](docs/spec.md)
- LP / 紹介文用: [docs/lp-readme.md](docs/lp-readme.md)
- MVP仕様: [docs/mvp-spec.md](docs/mvp-spec.md)
- アーキテクチャ方針: [docs/architecture.md](docs/architecture.md)
- ディレクトリ構成: [docs/project-structure.md](docs/project-structure.md)
- 開発計画: [docs/development-plan.md](docs/development-plan.md)
- 実装手順: [docs/implementation-steps.md](docs/implementation-steps.md)

## 開発コマンド

```sh
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` は `http://localhost:3040` で起動します（兄弟 miniapp とポートを衝突させないため `3040` を固定）。

## 初期ディレクトリ構成

```txt
docs/
public/
src/
tests/
```

実装開始前に、仕様・設計・実装責務の置き場を先に固定します。

## 今回やらないこと

MVPでは以下を対象外とします。

- ログイン
- オンラインランキング
- キャラ育成
- 大量のステージ実装
- 複雑な装備ビルド
- マルチプレイ
- 大量の3Dモデル制作
- 高度な敵AI
- セーブデータ
- 課金要素

## タイトル候補

本命:

```txt
ウェザーバスター 〜CLEAR THE SKY〜
```

英語寄り:

```txt
Weather Buster 〜CLEAR THE SKY〜
```
