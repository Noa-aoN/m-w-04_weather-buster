# AGENTS.md

このファイルは、AI コーディングエージェント(Codex / Claude など)がこのリポジトリで作業するときに参照する、最小限の作業ルールです。

## 方向性

- 「ウェザー・バスターズ 〜CLEAR THE SKY〜」はローポリ調の 3D アリーナアクション。**ゲーム開始時のワクワク** と **撃破時の爽快感** を最優先で守る。
- 演出・SFX・HUD のいずれかを削るときは、上の二つの優先度を基準に判断する。

## 触ってよい範囲

- `src/`、`public/audio/`、`public/models/`、`docs/`:自走で OK。
- `package.json` の依存追加:本当に必要な場合のみ。pnpm に統一(`pnpm-lock.yaml` を別ツールで書き換えない)。
- `public/` 直下のサードパーティ素材を別パックへ丸ごと差し替える場合は、ライセンスを再確認するために一度止まる。

## 検証コマンド

変更後は必ず実行:

```sh
pnpm typecheck
pnpm test
pnpm build
```

dev サーバ:`pnpm dev`(port 3040 / strictPort)。3040 が埋まっていたら自分側を 3041 等に逃がす。

## 戦闘ロジックを触るとき

ピュア関数は `src/game/combatRules.ts` に集約。

1. `combatRules.ts` に純粋関数を追加
2. `combatRules.test.ts` にテスト追加
3. `battleStore.ts` から呼ぶ

の順で進める。store にロジックを直書きしない。

## 戦闘ストア(`src/game/battleStore.ts`)

- フィールド追加は **`BattleState` 型 / `baseLoadout()` の初期化 / 該当 `set()`** の 3 箇所すべてを揃える(`baseLoadout` から漏れるとリスタート時に前回値が残るバグになる)。
- `shoot()` / `reload()` / `tick()` 系のガード節(`status` / `ammo` / `reloadingUntil` / `isPointerLocked`)は消さない。
- localStorage は `weatherbuster-seeds-v1` キーのみ。スキーマ変更時は旧キーを no-op で migrate。

## 敵 AI(`src/entities/EnemyAi.tsx`)

新しい `AiPhase` を足すなら必ず 4 箇所を同時に更新:

1. `AiPhase` 型
2. `phaseDurations`
3. `next` 遷移マップ
4. `lerpRate` 分岐

被弾系の `hitFlinch` は early-return せず、最終位置にジッターを足す形を踏襲する(early-return すると AI が止まる原因になりやすい)。

## エフェクト / SFX 追加

新しい状態には対で:

1. ストアに timestamp / flag を 1 つ追加
2. `AudioBridge` で subscribe して `audio.ts` の `playXxx` を呼ぶ
3. 必要なら HUD コンポーネントを足す

BGM は `setBgmScene` で 4 シーン(title / battle / victory / defeat)を切り替える。

## 違和感の調査順序

1. まず原因を特定する。即値調整(半径・速度・角度)に逃げない。
2. デバッグオーバーレイ(`?debug=motion`)や `?preview=weapon` を活用する。
3. 数値変更は最後。変えたら spec / README に反映する。

## ドキュメント

- `README.md`:公開向け
- `docs/spec.md`:仕様 / 設計判断
- `docs/notes/`:gitignore 対象の個人メモ
- `AGENTS.md`(このファイル):次セッション用の最低限ルール

## ブランチ運用

- `develop` で実装 → squash で `main` に PR
- 1 PR = 1 主題。リファクタとロジック変更を混ぜない
- `pnpm typecheck && pnpm test && pnpm build` を手元で通してから push
