# with a WISH — リニューアル提案サンプル

新郎タキシード専門ブランド **with a WISH**（松尾株式会社）フルリプレイス提案の、
実際に操作できるサンプルサイトです。

**公開URL:** https://nvidia9875.github.io/atelieryuka_2_sample/

## 採用案

クライアントFB（2026-07-26）で **A案 Maison Formal「格式のメゾン」**（黒背景）に確定。
リポジトリ直下がその本体です。比較検討に使った3案は `archive/` に残しています。

| | 内容 | パス |
|---|---|---|
| 本体 | A案 Maison Formal「格式のメゾン」 | `/` |
| 記録 | 3案の比較トップ | [`/archive/`](archive/) |
| 記録 | B案 Working Desk | [`/archive/b-desk/`](archive/b-desk/) |
| 記録 | C案 Digital Salon | [`/archive/c-salon/`](archive/c-salon/) |

## 制作の前提

- 商品データは現行サイトの実データ（全125型・品番・色・ライン・サイズ・素材）を使用
- 写真はすべて現行サイトの実写真
- 納期チェッカーは提案用のデモ計算（実システム非連携）
- 価格は現行方針のまま非掲載（売価は各衣裳店さまにて）
- **衣裳店さまログイン（統合ログイン）は提案から削除済み。**
  あわせて衣裳店デスクの4ツール（空き状況チェック・WEB予約登録・デジタルカタログ・
  販促素材ダウンロード）も削除し、衣裳店さま向けは納期チェッカーと連絡先のみ
- デジタルカタログには **Atelier Yuka 2026 カタログを仮置き**。公開時は with a WISH の
  カタログに差し替える

## 構成

```
.
├── index.html          本体（A案）
├── style.css           トークン / ベース / ヘッダー / ヒーロー / コレクション
├── style-b.css         下部セクション / モーダル / レスポンシブ
├── style-c.css         検索ドック / 絞り込みFAB / 比較トレイ・比較ビュー
├── catalog.css         デジタルカタログ（冊子ビューア）
├── script.js           本体の挙動
├── catalog.js          冊子ビューア（window.WWCatalog.open()）
├── assets/
│   ├── data.js         コンテンツデータ（全125型）
│   ├── img/            商品・ヒーロー・アバウト画像
│   └── catalog/        カタログPDFとページ画像（pages/ 58枚・thumbs/ 58枚）
├── data/products.json  商品データ元ファイル
└── archive/            比較検討に使った3案（記録用）
```

ビルド不要の静的サイトです。ローカルで確認する場合:

```bash
python3 -m http.server 8942
# http://localhost:8942/
```

## デジタルカタログの差し替え手順

PDFを入れ替えるときは、ページ画像も作り直します。

```bash
pdftoppm -jpeg -jpegopt quality=92 -r 144 新しいカタログ.pdf raw/pg
for f in raw/pg-*.jpg; do
  n=$(basename "$f" .jpg); n=${n#pg-}
  cwebp -q 76 -m 6 -resize 1200 0 "$f" -o assets/catalog/pages/$n.webp
  cwebp -q 70 -m 6 -resize 220 0 "$f" -o assets/catalog/thumbs/$n.webp
done
```

ページ数が変わる場合は `catalog.js` の `PAGES` と、`index.html` の
`#cat-range` の `max`・「全58ページ」表記を合わせて更新してください。

## 対応環境

SP / PC 両対応。320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920px で横スクロール無しを確認済み。
カタログは SP＝1ページずつスワイプ、PC＝見開き（矢印・左右キー・スライダー・目次）。
拡大はボタン・ダブルタップ・ピンチ・Ctrl+ホイールに対応し、拡大中はドラッグで移動できる。
入口はコレクション章の導線ブロック（`#catalogue`）とヘッダーナビの CATALOGUE。
