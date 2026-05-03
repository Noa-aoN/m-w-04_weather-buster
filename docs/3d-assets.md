# 3D アセット出典

このドキュメントは、`public/models/` に同梱している 3D アセットの出典・ライセンス情報をまとめたものです。

すべて Creative Commons CC0 (Public Domain) ライセンスのため、クレジット表記は必須ではありませんが、敬意とトレース性のためここに残します。

## Quaternius (CC0, アニメ付き人型)

リアル等身寄りのアニメ付きキャラ。`@react-three/drei` の `useFBX` で読み込み、`useAnimations` で idle / walk / punch を再生。クローン時は `three-stdlib` の `SkeletonUtils.clone` を使用してスケルトンを保持する。

| ディレクトリ | 出典パック | 出典 URL | ファイル | 用途 |
| --- | --- | --- | --- | --- |
| `public/models/quaternius-characters/` | Ultimate Animated Character Pack (Nov 2019) | https://opengameart.org/content/animated-characters-pack | `BlueSoldier_Female.fbx` | NOA (IRIS / バランス) |
| 同上 | 同上 | 同上 | `BlueSoldier_Male.fbx` | HALO (重装) |
| 同上 | 同上 | 同上 | `Ninja_Female.fbx` | SAKA (RAIKA / 攻撃) |
| `public/models/quaternius-guns/` | Ultimate Gun Pack (Jul 2019) | https://opengameart.org/content/low-poly-guns-pack | `AssaultRifle_2 / Bullpup_2 / Shotgun_2 / SniperRifle_3 / AssaultRifle2_3 / Pistol_2 / SubmachineGun_3 / Revolver_2` | 5武器スロット + 予備3 |

ライセンスは CC0 1.0 Universal（パック内 `License.txt` 同梱）。Patreon サポート任意。

## Kenney (kenney.nl)

すべて CC0 1.0 Universal。GLB 形式。

| ディレクトリ | パック名 | 出典 URL | ファイル数 |
| --- | --- | --- | --- |
| `public/models/blaster-kit/` | Blaster Kit 2.1 | https://kenney.nl/assets/blaster-kit | 40 |
| `public/models/space-kit/` | Space Kit 1.0 | https://kenney.nl/assets/space-kit | 153 |
| `public/models/space-station-kit/` | Space Station Kit | https://kenney.nl/assets/space-station-kit | 97 |
| `public/models/modular-space-kit/` | Modular Space Kit 1.0 | https://kenney.nl/assets/modular-space-kit | 40 |
| `public/models/factory-kit/` | Factory Kit 3.0 | https://kenney.nl/assets/factory-kit | 143 |
| `public/models/tower-defense-kit/` | Tower Defense Kit | https://kenney.nl/assets/tower-defense-kit | 160 |
| `public/models/prototype-kit/` | Prototype Kit (動物・ボタン・扉・標識・蓄電などにアニメ込み) | https://kenney.nl/assets/prototype-kit | 145 |

各ディレクトリ直下に `License.txt` を同梱しています（CC0 + Kenney からの公開クレジット）。

## 音声 (Kenney CC0)

すべて Creative Commons CC0 1.0 Universal。出典の `License.txt` は `public/audio/sfx/License.txt` に同梱しています。

| ファイル | 元 | 出典パック |
| --- | --- | --- |
| `shoot-1..5.ogg` | digital-audio/laser1,4,6 + sci-fi-sounds/laserRetro_001, laserSmall_002 | https://kenney.nl/assets/digital-audio , https://kenney.nl/assets/sci-fi-sounds |
| `hit-1..3.ogg` | sci-fi-sounds/impactMetal_001/003 + impact-sounds/impactGlass_medium_001 | https://kenney.nl/assets/sci-fi-sounds , https://kenney.nl/assets/impact-sounds |
| `critical-1..2.ogg` | sci-fi-sounds/laserLarge_002 + impact-sounds/impactBell_heavy_002 | 同上 |
| `miss-1.ogg` | sci-fi-sounds/laserSmall_004 | https://kenney.nl/assets/sci-fi-sounds |
| `skill-1..2.ogg` | sci-fi-sounds/forceField_001 + digital-audio/phaseJump1 | 同上 |
| `item-1.ogg` | digital-audio/pepSound2 | https://kenney.nl/assets/digital-audio |
| `marker-spawn.ogg` | digital-audio/lowDown | 同上 |
| `impact-1..2.ogg` | sci-fi-sounds/explosionCrunch_002 + lowFrequency_explosion_001 | https://kenney.nl/assets/sci-fi-sounds |
| `clear-1.ogg` | digital-audio/phaseJump3 | https://kenney.nl/assets/digital-audio |
| `defeat-1.ogg` | digital-audio/lowThreeTone | 同上 |
| `ui-click.ogg` `ui-rollover.ogg` `ui-switch.ogg` | ui-audio/click2, rollover2, switch11 | https://kenney.nl/assets/ui-audio |

`audio.ts` は初回ユーザー操作（pointerdown / keydown）で `loadSamples()` を実行し、Web Audio API で AudioBuffer に decode → 各 SFX 関数は変種からランダム再生する。サンプルが未ロードの場合は既存のオシレータ合成にフォールバックする。

BGM は引き続き 4小節進行のオシレータ合成（Dm → B♭ → F → C）を使用。

## 取り込み判断のルール

- ライセンス: CC0 のみ（CC-BY 等の場合はパック単位で本ファイルに作者・元 URL を残す）
- 形式: `.glb`（テクスチャ込みの単一バイナリ）優先
- リポジトリ容量: 個別パックは ~50MB を上限目安（GitHub の制限以下を維持）
- 用途: ゲーム内で実際に使う / 試す予定があるもののみ取り込む。未使用パックは削除する

## 今後の候補（未取り込み）

Quaternius のパックは公式サイトがブラウザ駆動 DL のためスクリプトから直取りできず、今回は Kenney CC0 のみ取り込み。必要が生じたら以下を OpenGameArt 経由で取得して FBX→glTF 変換するか、ユーザーが手動配置する。

- Animated Mech Pack (Quaternius / CC0): https://opengameart.org/content/animated-mech-pack
- Modular Sci-Fi MegaKit (Quaternius / CC0): https://opengameart.org/content/modular-sci-fi-megakit
- Sci-Fi Essentials Kit (Quaternius / CC0): https://opengameart.org/content/sci-fi-essentials-kit
- Ultimate Space Kit (Quaternius / CC0): https://opengameart.org/content/ultimate-space-kit-by-quaternius
