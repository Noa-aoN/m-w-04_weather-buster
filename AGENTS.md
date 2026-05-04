# AGENTS.md / 作業ルール

このファイルは、Codex / Claude などの AI エージェントがこのリポジトリで作業するときに参照する「ローカルな作業ルール」です。
ワークスペース直上の `CLAUDE.md` の方針（コミットメッセージ書式、AI 痕跡禁止、port 規則、絵文字禁止 等）はこのアプリにも適用されます。ここに書くのはそれを補う、このアプリ固有の判断基準です。

## ゲーム全体の方向性

- 「ウェザーバスター 〜CLEAR THE SKY〜」 / 異常気象モンスターを倒して空を晴らす 3D アリーナシューター
- ローポリ + 表情付きの「かわいい / ポップ」寄りの画作り。Quaternius / Kenney 系の CC0 アセットを使う
- 「ゲームが始まったらワクワク」「敵を倒した瞬間が爽快」を最優先で守る。BGM / SFX / フラッシュ / シェイク / コンボ表示のどれかを削る判断をするときは、この優先度に従う

## 触ってよい範囲 / 触る前に止まる範囲

- `src/` 配下、`public/audio/`、`public/models/`、`docs/` は自走で良い
- `package.json` の依存追加は本当に必要な場合のみ。テスト用 (vitest 等) は OK
- `pnpm-lock.yaml` を勝手に書き換える別ツールの導入は禁止（pnpm で完結）
- `public/` 直下の素体 GLB / FBX を別パックに丸ごと差し替える場合は止まる（ライセンス再確認）

## 検証コマンド

変更後は必ず実行する。

```
pnpm typecheck
pnpm build
pnpm test            # vitest 導入後
```

dev サーバの確認は `pnpm dev`（port 3040 / strictPort）。`3040` が他で埋まっていたら **自分側を 3041 等に逃がす**。CLAUDE.md にある通り。

## 戦闘ストア (`src/game/battleStore.ts`) を触るとき

- フィールド追加は `BattleState` 型・`baseLoadout()` の初期化・該当の `set()` の 3 箇所すべてを揃えて更新する。`baseLoadout` から漏れると、battle リスタート時に前回値が残ってバグになる
- ガード節を消さない:
  - `shoot()`: `status !== "battle" || ammo <= 0 || now < reloadingUntil` の早期 return
  - `reload()`: `now < reloadingUntil` / `ammo >= maxAmmo` の早期 return
  - `tick()` / `takeDamageTick()` / `takeMarkerDamage()`: pause 中に止めるための `isPointerLocked` 条件
- localStorage は `weatherbuster-seeds-v1` キーのみ書き込み。スキーマを変えたら旧キーを no-op で migrate する

## 敵 AI を触るとき

`BattleScene.EnemyMotion` (移行先: `src/entities/EnemyAi.ts`) は `AiPhase` を中心に動く。新しいフェーズを足すなら必ず次の 4 箇所を一緒に更新する:

1. `AiPhase` 型に名前を追加
2. `phaseDurations` にデュレーション
3. `next` の遷移マップに「どこから来てどこへ抜けるか」
4. `lerpRate` の分岐に「このフェーズではどれくらい速く動くか」

足したフェーズで `phaseRef` の追加状態（dodgeDir / zigPhase 等）が必要なら `phaseRef.current` の初期化と「フェーズ開始時の再初期化」も忘れない。

被弾系の挙動 (`hitFlinch`) は **早期 return しない**。AI が止まる原因は基本これなので、新しい一時状態を入れるときも「return せず最終位置にジッターを足す」スタイルを踏襲する。

## 武器モデルを差し替えるとき

`src/entities/WeaponModel.tsx` の `WEAPON_MODEL` を変える前に、必ず **bounding box の longest axis を確認する**。

- Quaternius FBX 銃は **barrel が +X 軸方向** なので `rotation: [0, Math.PI / 2, 0]`
- 他パックは未検証 / 違う可能性あり。新規モデルは差し替え前に Node から FBXLoader / GLTFLoader でロードしてサイズを測る

```ts
// 動作確認の最小スクリプト
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Box3, Vector3 } from "three";
// loader.parse(buf, "") → Box3.setFromObject → getSize で longest を判定
```

barrel が +Z なら `[0, Math.PI, 0]`、+X なら `[0, Math.PI / 2, 0]`。

## キャラクター素体を触るとき

- アクセントティント (`tintCharacterMaterials`) の intensity は `0.05〜0.10` の範囲が無難。0.2 を超えると素体の色が破綻する
- `metalness` / `roughness` は **触らない**（Quaternius の素体感を維持するため）

## エフェクト / SFX 追加のルール

- 視覚と音は対で考える。`shoot` / `playShoot` のように、新しい状態には必ず:
  1. ストアの timestamp / flag を 1 つ追加
  2. AudioBridge で subscribe して音を鳴らす
  3. 必要なら HUD コンポーネントを足す
- `audio.ts` の `playXxx` は SFX 用。BGM は `setBgmScene` で 4 シーン (title/battle/victory/defeat) を切り替える
- 新しい BGM シーンを足すなら BgmScene 型・`SCENE_TRACK` の 4 トラック (bass/lead/pad/drums)・AudioBridge の status 監視の 3 点を更新

## 部品配置 / ステージ

- 部品は `src/entities/` 内の薄いコンポーネント、配置は `data.ts` 等のデータで持つ（移行中）
- 「家具を増やしたい」が **配置データ 1〜2 行** で済む状態を維持する
- 1 部品の粒度は「単体で意味が通る最小単位」。雲のパフ・目・口を 1 個ずつ部品化するのではなく、`HeavyRainModel` のように敵 1 体分でまとめる

## 違和感の調査順序

1. **まず原因にあたる**。即値調整（半径・速度・角度）に逃げる前に、座標 / 当たり判定 / フェーズ遷移のどこで決まっているかをログ or デバッグオーバーレイで見る
2. それでも分からなければ最小再現を作る (Node + three の小さいスクリプトで OK)
3. **数値変更は最後**。変えたら必ず spec と AGENTS.md にメモを残す

## ドキュメントの置き場

- `docs/spec.md`: 公開向けの仕様 / 設計判断
- `docs/notes/`: gitignore 対象の個人用ログ
- `AGENTS.md` (このファイル): 次のセッションが思い出すための作業ルール
- 機能を増やしたら spec と AGENTS.md の両方を更新するか、最低限どちらに何を書くかを決めてからコミットする

## PR の出し方

- `develop` で実装 → squash で `main` に PR
- マージ後は `develop` を `origin/main` に追従させる
- CI なし。`pnpm typecheck && pnpm build` (将来的には `pnpm test` も) を手元で通したら緑扱い
- 1 PR = 1 主題。リファクタとロジック変更を同じ PR に混ぜない
