# 3D アセット / 音源

`public/models/` と `public/audio/` に含まれる素材の出典まとめ。各サブフォルダに元配布物の `License.txt` を同梱しています。

すべて Creative Commons CC0 もしくはオリジナル制作物。

## オリジナル(`public/models/custom-*/`)

| ディレクトリ | 内容 |
| --- | --- |
| `custom-characters/` | バスター本体(`noa.glb` / `saka.glb` / `metappi.glb`)。Meshy AI で生成した GLB を手動で微調整 |
| `custom-enemies/` | 天侵体本体(豪雨・落雷・竜巻・梅雨・吹雪)。同上 |
| `custom-weapons/` | 一部固有武器(風切ブレードなど) |

## Quaternius (`quaternius.com`、CC0)

| ディレクトリ | 内容 |
| --- | --- |
| `scifi-guns-q/` | Sci-Fi Gun Pack。各ウェポン(weatherGun / clearSkyGun / 梅雨キラー / 雷除けライフル / 凍結カノン)の本体モデル |
| `stylized-nature/` | Stylized Nature MegaKit。ステージ装飾の樹木 / 岩 |

## Kenney (`www.kenney.nl`、CC0)

GLB 中心のローポリパック。

| ディレクトリ | パック | 用途 |
| --- | --- | --- |
| `space-kit/` | Space Kit | ステージ装飾(衛星 / 機械 / 構造物) |
| `space-station-kit/` | Space Station Kit | 装飾 |
| `modular-space-kit/` | Modular Space Kit | 装飾 |
| `tower-defense-kit/` | Tower Defense Kit | ホーム背景の警報塔 |
| `factory-kit/` | Factory Kit | 装飾 |
| `blaster-kit/` | Blaster Kit | 装飾 / 予備 |
| `prototype-kit/` | Prototype Kit | 動物 / ギミック |
| `modular-men/` | Modular Men | 旧バスター素体(現在は custom-characters に置換済み) |

## ステージ床テクスチャ(AmbientCG、CC0)

`public/textures/field/<stage>/` に Color / Normal / Roughness / AO の 4 マップを同梱。1024px JPG にリサイズ済み。

| ステージ | 元セット | 用途 |
| --- | --- | --- |
| lab | Tiles107 | 整備された金属タイル |
| ruins | Ground103 | コンクリ / 土床 |
| highland | Rock063 | 岩肌 |

ライセンス記録は `public/textures/field/NOTICE.txt`。

## 音源

| ディレクトリ | 出典 |
| --- | --- |
| `public/audio/sfx/` | プロジェクト用にシンセ収録 / オープン素材 |
| `public/audio/sfx-kenney/` | Kenney Sci-Fi Sounds(CC0) |

BGM はランタイム合成(`src/features/audio/audio.ts` の Web Audio API シーンプレイヤ)。
