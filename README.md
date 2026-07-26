# with a WISH — リニューアル提案サンプル

新郎タキシード専門ブランド **with a WISH**（松尾株式会社）フルリプレイス提案の、
3つのデザイン方向性を実際に操作できるサンプルサイトです。

**公開URL:** https://nvidia9875.github.io/atelieryuka_2_sample/

## 3案

| 案 | 名称 | コンセプト | パス |
|----|------|-----------|------|
| A | Maison Formal | 格式のメゾン。新郎さま向けブランドサイト | [`/a-maison/`](a-maison/) |
| B | Working Desk | 衣裳店さま専用の業務ファインダー | [`/b-desk/`](b-desk/) |
| C | Digital Salon | 店頭接客ルックブック型デジタルカタログ | [`/c-salon/`](c-salon/) |

## 制作の前提

- 商品データは現行サイトの実データ（全125型・品番・色・ライン・サイズ・素材）を使用
- 写真はすべて現行サイトの実写真
- 空き状況・予約・ログインは提案用のデモ動作（実システム非連携）
- 価格は現行方針のまま非掲載（売価は各衣裳店さまにて）

## 構成

```
.
├── index.html          3案の比較トップ
├── a-maison/           A案 Maison Formal
├── b-desk/             B案 Working Desk
├── c-salon/            C案 Digital Salon
├── assets/
│   ├── data.js         3案共通コンテンツデータ（全125型）
│   └── img/            商品・ヒーロー・アバウト画像
└── data/products.json  商品データ元ファイル
```

ビルド不要の静的サイトです。ローカルで確認する場合:

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

## 対応環境

SP / PC 両対応。320 / 375 / 768 / 1024 / 1440px で横スクロール無しを確認済み。
