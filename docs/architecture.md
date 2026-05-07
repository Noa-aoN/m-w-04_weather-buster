# アーキテクチャ

UI / 3D シーン / ゲームルール / 状態 を分離した構成です。

## レイヤー

| ディレクトリ | 役割 |
| --- | --- |
| `src/app/` | アプリ起動点、画面ルーティング |
| `src/scenes/` | 画面コンポーネント(home / battle / 図鑑 / settings / result) |
| `src/entities/` | 3D エンティティ(プレイヤー視点 / 敵 / 子分 / 武器モデル / FX) |
| `src/features/hud/` | 戦闘 HUD(バー / クロスヘア / トーストなど) |
| `src/features/audio/` | SFX / BGM(Web Audio API ベース) |
| `src/features/modal/` | 図鑑系の共通レイアウト(CodexLayout / PaginatedLayout / ModalShell) |
| `src/game/` | 戦闘ルール、ストア、データ |

## 状態管理

- グローバルは Zustand 1 ストア(`src/game/battleStore.ts`)
- 純粋ロジックは `src/game/combatRules.ts` に分離し Vitest で単体テスト
- ローカルストレージは `weatherbuster-seeds-v1` 1 キーのみ

## 3D 描画

- React Three Fiber + drei
- Canvas は各シーン内に閉じ、HUD は外側の React ツリーに配置
- 戦闘空間の小型 HUD(子分 HP バー等)は drei `<Html>` で 3D 座標追従

## オーディオ

- BGM:Web Audio API でシーン別に bass / lead / pad / drums を合成切替
- SFX:Kenney CC0 サンプル + シンセ合成のハイブリッド(`src/features/audio/audio.ts`)

## ファイル追加時の約束

- 戦闘の新ロジック → `combatRules.ts` に純粋関数で書き、テストを足してから store から呼ぶ
- ストアにフィールド追加 → 型 / `baseLoadout()` 初期化 / `set()` の 3 箇所を必ず揃える
- 新しい AI フェーズ → `AiPhase` 型 / `phaseDurations` / `next` 遷移 / `lerpRate` の 4 箇所を一緒に
