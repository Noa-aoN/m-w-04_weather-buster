# ディレクトリ構成

```
.
├── public/                static assets (3D models, textures, audio)
├── src/
│   ├── app/               アプリ起動 / 画面ルーティング
│   ├── scenes/            画面コンポーネント
│   ├── entities/          3D エンティティ(プレイヤー / 敵 / 子分 / 武器 / FX)
│   ├── features/
│   │   ├── audio/         SFX / BGM ブリッジ
│   │   ├── hud/           戦闘 HUD(コンポーネント / フック)
│   │   ├── modal/         図鑑系の共通レイアウト
│   │   └── player/        プレイヤー操作
│   ├── game/              戦闘ルール / ストア / データ
│   └── shared/            アセットURLヘルパ等の小物
└── docs/                  仕様 / アーキ / アセット出典
```

## キーとなるファイル

| ファイル | 役割 |
| --- | --- |
| `src/game/battleStore.ts` | Zustand 単一ストア(戦闘状態 / 進行 / 設定) |
| `src/game/combatRules.ts` | 戦闘の純粋関数群(ダメージ計算ほか)。Vitest で単体テスト |
| `src/game/data.ts` | 天侵体・ウェポン・バスター・ステージ・難易度の静的データ |
| `src/scenes/BattleScene.tsx` | 戦闘シーンの 3D ルート |
| `src/scenes/HomeScene.tsx` | ホーム画面 |
| `src/features/hud/BattleHud.tsx` | 戦闘 HUD コンポーネント群の組み立て |
| `src/features/audio/audio.ts` | SFX 関数 + BGM シーンプレイヤ |
| `src/features/modal/CodexLayout.tsx` | 図鑑系の共通レイアウト(リスト + 3D プレビュー + 説明) |

## アセット配置

| パス | 内容 |
| --- | --- |
| `public/models/custom-*/` | オリジナル GLB(バスター / 天侵体 / 一部武器) |
| `public/models/scifi-guns-q/` | Quaternius のウェポン本体 |
| `public/models/{kenney 系各 kit}/` | ステージ装飾 / 警報塔 / 機械 |
| `public/textures/field/<stage>/` | ステージ床 PBR テクスチャ |
| `public/audio/sfx/` 他 | SFX サンプル(CC0) |
