# 3D アセット出典

このドキュメントは、`public/models/` に同梱している 3D アセットの出典・ライセンス情報をまとめたものです。

すべて Creative Commons CC0 (Public Domain) ライセンスのため、クレジット表記は必須ではありませんが、敬意とトレース性のためここに残します。

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

各ディレクトリ直下に `License.txt` を同梱しています（CC0 + Kenney からの公開クレジット）。

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
