# 3D アセット出典

このドキュメントは、`public/models/` に同梱している 3D アセットの出典・ライセンス情報をまとめたものです。

すべて Creative Commons CC0 (Public Domain) ライセンスのため、クレジット表記は必須ではありませんが、敬意とトレース性のためここに残します。

## Quaternius (CC0, アニメ付き人型)

リアル等身寄りのアニメ付きバスター素体。`@react-three/drei` の `useFBX` で読み込み、`useAnimations` で idle / walk / punch を再生。クローン時は `three-stdlib` の `SkeletonUtils.clone` を使用してスケルトンを保持する。

| ディレクトリ | 出典パック | 出典 URL | ファイル | 用途 |
| --- | --- | --- | --- | --- |
| `public/models/modular-men/` | Ultimate Modular Men (Feb 2022) | https://quaternius.com/packs/ultimatemodularmen.html | `Spacesuit.gltf` | 全バスター共有メッシュ。`SciFi_Light_Accent` マテリアルだけを各バスターの `accentColor` に塗り替えて色違いに（NOA = シアン / SAKA = 黄）。`tintCharacterMaterials` 参照 |
| `public/models/scifi-guns-q/` | Sci-Fi Gun Pack by Quaternius | https://quaternius.com (Patreon 配布) | `Rifle.fbx / LongPistol.fbx / Lightning Gun.fbx / Sniper rifle.fbx / Ray Gun.fbx` | 5 武器スロット（weatherGun / clearSkyGun / rainySeasonKiller / stormwallRifle / frostlance） |
| `public/models/stylized-nature/` | Stylized Nature MegaKit (Standard) | https://quaternius.com/packs/stylizednaturemegakit.html | `DeadTree_1 / DeadTree_3 / TwistedTree_1 / Rock_Medium_1〜3 / CommonTree_4` + bark/leaf textures (downsampled to 512px) | 都市跡(ruins) と 高地(highland) の植生装飾。CommonTree_4 は high mid-mountain、DeadTree / TwistedTree は ruins のシルエット要素。バーク/葉テクスチャは 2K → 512 にリサイズ済み |

**変遷メモ**: もともと FBX (`quaternius-guns/`) → 旧 glTF (`sci-fi-guns/`) → 現在の **`scifi-guns-q/` (Sci-Fi Gun Pack by Quaternius / FBX)** と段階的に置換。最後の Pack は色味のあるローポリ・ポップな造形で、Lightning Gun や Ray Gun 等の SF テイストが既存の Quaternius バスター素体と統一感がある。barrel は **+Z 軸** なので rotation `[0, Math.PI, 0]` で -Z（カメラ前方）にマップ。

**バスター素体変遷**: Soldier / Ninja の Quaternius Animated Character (FBX) → 一時期 `Adventurer / Spacesuit / Punk` の3メッシュ運用 → 現在の **Spacesuit 単一メッシュ + マテリアル塗り分け運用**。各バスターに **24 種のアニメ**（Idle / Idle_Gun / Idle_Gun_Pointing / Walk / Run / Run_Shoot / Gun_Shoot / Punch_Left/Right / Sword_Slash / Death / HitRecieve / Roll / Wave 等）が同梱。`useFBX` → `useGLTF` に統一し、`PlayerView.tsx` / `HomeScene.tsx` / `CharacterModel.tsx` の 3 箇所で同じ glTF パイプラインを使う。Spacesuit の 5 マテリアルのうち `SciFi_Light_Accent` だけがチームカラー用に分離されているため、`tintCharacterMaterials` ではマテリアル名に `accent` を含むスロットだけ `color` を accent に置換し、他は subtle emissive のみで本来のダーク・ティール基調を保持する。`Adventurer.gltf` / `Punk.gltf` は元バスター削除に伴って削除済み（git history からは復元可能）。

MegaKit Props は外部テクスチャ不足で GitHub Pages 上の読み込み警告が出たため、lab 装飾を Kenney / KayKit の自己完結 GLB / glTF に置換し、同梱対象から削除済み。

## ステージ床テクスチャ (AmbientCG / CC0)

3 ステージの床に PBR テクスチャを敷くため、AmbientCG (https://ambientcg.com) から CC0 のセットを 3 種取り込み。各ステージで Color / NormalGL / Roughness / AmbientOcclusion の 4 マップを利用（Displacement / NormalDX は除外）。1024 px JPG quality 80 にリサイズして web 配信用にトリム（合計 3.4 MB）。

| 配置パス | 元セット | ステージ | 用途 |
| --- | --- | --- | --- |
| `public/textures/field/lab/` | Tiles107 2K JPG | lab | 整備された金属タイル床 |
| `public/textures/field/ruins/` | Ground103 2K JPG | ruins | 崩れたコンクリ / 土床 |
| `public/textures/field/highland/` | Rock063 2K JPG | highland | 岩肌の地表 |

`src/entities/StageTerrain.tsx` の `<PbrFloor>` が `useTexture` で 4 マップを読み込み、`RepeatWrapping` + `repeat = textureRepeat`（lab 6 / ruins 9 / highland 10）でタイリング。Color マップだけ sRGB、normal/roughness/AO は linear。`StagePlacement.floor.texture` が未定義のステージは従来通りの単色 `<PlainFloor>` にフォールバック。

ライセンス記録は `public/textures/field/NOTICE.txt` に集約。CC0 1.0 Universal、出典 AmbientCG。

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

## KayKit / Kay Lousberg (CC0)

ローポリ寄りの単一テクスチャ・アトラスで Three.js / WebGL 配信に向く。`.gltf + .bin + spacebits_texture.png` の3点で1パック完結。

| ディレクトリ | パック名 | 出典 URL | 用途 |
| --- | --- | --- | --- |
| `public/models/space-base-bits/` | KayKit Space Base Bits 1.0 | https://kaylousberg.itch.io/space-base-bits | highland 観測拠点（風車・ソーラー・着陸パッド・基地モジュール・ライト）／ lab のカーゴ／ ruins の壊れた建造物 |
| `public/models/forest-nature/` | KayKit Forest Nature Pack 1.0 | https://kaylousberg.itch.io/forest-nature-pack | ruins の植生による街の浸食（裸木 / 茂み / 苔岩 / 若木）／ highland 外周の縦シルエット（高木 Tree_4_B / Tree_2_C） |
| `public/models/resource-bits/` | KayKit Resource Bits 1.0 | https://kaylousberg.itch.io/resource-bits | lab の産業ディテール（燃料樽・パレット・パーツ山・銅鉄バー・ジェリ缶） |

highland では `windturbine_tall / windturbine_low / solarpanel / roofmodule_solarpanels / landingpad_large / landingpad_small` で「気象観測基地」を成立させ、`basemodule_E / basemodule_garage / basemodule_C` で背後を埋めて滑走路の正体を「研究拠点」に固定。`lights.gltf` を着陸パッド両脇に置いて視線誘導。lab では `cargo_A_packed / cargo_B_packed / cargo_A_stacked / containers_A〜C / lights` で旧 MegaKit バレル/クレートを置換し、シルエットを強化。ruins は `cargodepot_C / structure_low / cargo_B_stacked` を `tilt` 付きで配置し、墜落基地の見た目を補強。

Forest Nature Pack は ruins メインで「壊れた街に植物が戻ってきた」ストーリーを支える。`Tree_Bare_*` を石化した街路樹として、`Tree_2_A / Tree_3_A` を瓦礫から伸びる若木として配置。`Bush_*_A/C` と `Rock_*` を `scattered` クラスタで外縁から中央に向かって散布。highland では `Tree_4_B`（高木）と `Tree_2_C` を地平線方向に置いて縦のシルエットを足す。`forest_texture.png` 1枚で全モデルが共有テクスチャ（KayKit のアトラス方式）。

Resource Bits は lab に「整備が継続している現役の研究施設」感を加える。`Pallet_Wood + Fuel_*_Barrels` を組ませて整備パレット、`Iron/Copper_Bars_Stack_*` を中央通路に、`Parts_Pile_*` を左右に置いて作業途中の床ディテールを作る。`resource_bits_texture.png` 1枚共有。

ライセンスはそれぞれ `LICENSE.txt` を各ディレクトリ直下に同梱。

## Kenney Sci-Fi Sounds (追加分 CC0)

`public/audio/sfx-kenney/` に Kenney Sci-Fi Sounds パックから合成のみだったイベントの差し替え用に厳選コピー。`audio.ts` の各関数は curated `sfx/*` サンプルが優先、未該当だった以下のイベントで `sfx-kenney/*` を再生する。

| イベント | サンプル | 既存合成 |
| --- | --- | --- |
| `playEnemyChargeFire` | `lowFrequency_explosion_000/001` + 60Hz サブ | フォールバック維持 |
| `playShieldBlock` | `forceField_000〜002` + 1080Hz square click | フォールバック維持 |
| `playReload` | `doorOpen_000/001` → 0.18s 後 `doorClose_000/001` → 1320Hz triangle | フォールバック維持 |
| `playBlocked` | `impactMetal_000〜002` | フォールバック維持 |
| `playMarkerImpact` | curated `impact` + `explosionCrunch_000〜002` 重ね | 維持 |

ライセンスは `public/audio/sfx-kenney/LICENSE.txt`。

## Kenney Future フォント (CC0)

`public/fonts/kenney/` に Kenney Future Narrow Font Pack の `KenneyFuture.ttf` / `KenneyFutureNarrow.ttf` を同梱。`styles.css` 冒頭で `@font-face` 登録し、HUD の `Bebas Neue / Oswald` スタックの先頭に `"Kenney Future"` を追加（フォールバックは維持）。

ライセンスは `public/fonts/kenney/LICENSE.txt`。

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

Quaternius のパックは公式サイトがブラウザ駆動 DL のためスクリプトから直取りできず、必要分はユーザーが手動配置する運用。`Modular Sci Fi Guns` と `Modular SciFi MegaKit` は手動配置済み。

- Animated Mech Pack (Quaternius / CC0): https://opengameart.org/content/animated-mech-pack
- Sci-Fi Essentials Kit (Quaternius / CC0): https://opengameart.org/content/sci-fi-essentials-kit
- Ultimate Space Kit (Quaternius / CC0): https://opengameart.org/content/ultimate-space-kit-by-quaternius
