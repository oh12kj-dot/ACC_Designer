# 天然石113 source — whole-body nominal BOX 有限設計

2026-10-26。**ADOPTED FINITE DESIGN / IMPLEMENTED / 14 REGISTERED-VERIFIED / 99 NOT REGISTERED**。本設計は `.local/setup/natural-stone-next-source-candidates.json` の113 exact sourceDraftId・106商品・own本文58種だけを扱う。固定registry SHA256 は `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`、入力ファイルbytes SHA256 は `8b7e8722b173f87f6c7053842f897aad27967f7690a4a8be3b47f4898aa62ea9`。判定表は `.local/setup/natural-stone-finite-design.json` に113行すべてを保存し、45件を**寸法意味上の候補**、68件を保留とする。8件の既存 `qualityHeld` は全件保留。候補45件の写真採用、加工承認、登録はまだ成立していない。

設計依頼は Sol / Medium を明示しているが、この作業のruntimeから実model/effortの確認情報は得られていない。confirmed Sol reviewとは記録しない。rootが採用する前に、source hash、45/68の判定、特に下記のexact例外を再確認する。

## 掲載値を配置枠にする条件

`ALL_VARIANT_MAPPING_CONTRACT.md` の掲載サイズによる通常配置承認と `NOMINAL_TEARDROP_RANGE_CONTRACT.md` の範囲中点方式を前提とする。`NOMINAL_PEARL_BODY_FINITE_CONTRACT.md` と同様、各sourceの**完全なown商品名・本文**が個体全体の石/ビーズ/ルースを記述し、variantの掲載ラベルがその個体の本体サイズと読める場合だけ候補にする。`name` のサイズ欄だけ、`measurements` の数値だけ、OCRや他商品写真だけでは足りない。全候補のregistry categoryは `other` のまま保持する。天然石だからと `bead`、`pearl`、`charm` へ自動変更しない。

`natural-stone-finite-design.json` の各rowは `draftId`, `eligible`, `reason`, `labelKind`, `rawLabel`, `widthMm`, `heightMm`, `publishedRanges` と原draft全object、全own capture record、object/原name/本文/sizeText hashを含む。原入力bytes hashと各draftの UTF-8 `JSON.stringify(parsed draft)` SHA256 は別の束縛である。実装は再読込したregistry draft全object、ID/商品ID/variant/SKU/原name/tag配列/category/sizeText/本文全文/価格/購入単位/own URL/gallery順序を照合し、異なれば fail closed。first-photo capture の URL、raw bytes SHA256、pixel寸法、`productIds` associationも照合する。既存capture113件は素材所在の証拠にとどまり、原写真の採用判断ではない。

| 有限ラベル群 | 候補数 | 暫定BOXの規則 |
|---|---:|---|
| `約Nmm(32/64面カット)` のexact facet annotation | 9 | N×Nの正方形配置枠。`facetCount` はannotationであり寸法ではない |
| 原文が `約6mm(64面カット(4インチ)` / `約4mm(32面カット(4インチ)` のexact literal | 2 | 先頭の本体6/4mmだけN×N。末尾4インチは販売長で、括弧は補修・一般構文化しない |
| 掲載H/Wの各範囲 | 16 | W両端の算術中点→幅、H両端の算術中点→高さ |
| 掲載H範囲・W単値 | 1 | H中点→高さ、W単値→幅。Wは単値由来と保存 |
| 軸名なしの2範囲 | 15 | 原第1範囲の中点→幅、第2範囲の中点→高さ |
| 軸名なし第1範囲・第2単値 | 2 | 第1中点→幅、第2単値→高さ。単値由来を保存 |

通常のplain scalar/whole-body pairを扱う有限branchを将来追加できるが、今回**非quality-heldで意味が成立する該当行は0**。品質保留の `約3mm`、`約6mm`、`約4mm`、`約3×4mm`、`約8×6mm`、`約10×5mm` を理由なく解放しない。上表のラベルも全113 IDのうちeligible exact ID・raw label・全draft hashに束縛し、自由入力へ適用しない。正・finite・40mm以下・1/40mm格子・範囲min<=maxを要求する。算術中点は配置上の選択であり平均実寸/統計中央値/最大占有寸法ではない。2軸の中点が同一粒で同時に成立する保証もない。

軸名なしpairは既存の掲載順序→暫定BOX順序の契約を**当該45行だけ**に限定して使う。石の実物横/縦方向、販売者の第1/第2値の物理軸、写真の向きとの対応は未確認。H/W表記も掲載軸と写真・実物軸の対応は未確認。scalarを直径・球体へ変換せず、正方形の配置枠にとどめる。すべて `approximate=true` と原raw label/range/orderを保存し、一覧・編集・配置で「掲載概寸から暫定配置枠を選択。天然石の個体差、実寸、掲載軸と写真の対応、画像尺度、サイズ別外観、穴径・接続位置は未確認」を提示する。`physicalWidthVerified=false`, `physicalHeightVerified=false`, `sizeAxisInterpretationVerified=false`, `imageScaleVerified=false`, `variantAppearanceVerified=false`, `connectionReady=false`。

## 保留と非推論境界

- `-` の47件には個体本体サイズがない。販売単位が `1本(約20cm)` や `1ヶ` でも、長さ・価格・他商品の画像から補完しない。`10cm` / `約20cm` の2件も販売長であり本体幅/高さではない。
- 8件の `qualityHeld` は寸法ラベルが読めても全件除外する。解除は本設計の範囲外。
- `大(約4-6mm)` の1件は不定形tumbleの単一範囲で二軸のBOXを特定できない。`約6-10×6×9mm` の6件は三要素の軸意味が未解決。二値だけを抜き取らない。
- `ミックスベリル` 1件と `サザレ` の「ランダムなシェイプがミックス」1件は個体/商品写真対応が未解決で、代表一粒の形状・サイズを自動選択しない。通常の天然石の個体差は前記の範囲不確実性として保持する。
- `フレームストーン 2カン` の2件は石・枠・カンからなる組立品。掲載H/Wがどこまでを含むか本文から確定できず、石単体値を組立品全体へ流用しない。`めがね留めカスタムパーツ` などサイズ `-` の複合品にも寸法を作らない。
- 穴位置/穴径、Tピン適合、販売長、個数、石座へのfit、価格、画像中の物差しをBODYや接続点へ転用しない。購入単位・JPY価格は原draftのまま、粒単価を算出しない。archive/obsolete/minimum-sale/既存qualityは実行前の現行scopeで再確認し、候補との交差があればholdを優先する。

## 採用・実装・写真・登録の独立gate

1. rootがこの設計を採用するまでは実装・写真承認・登録を行わない。新recipe例 `kiwa-own-photo-natural-stone-body-finite-v1`、独立selector/key/cacheを設け、旧teardrop/category BOX/round pearl/metal bead recipeとそのrange拒否を変更しない。`other` categoryをPart保存/read-backで保持する。
2. `prepare-pearl-body-finite.mjs` の全object/capture binding、別原写真審査、別加工画像承認、immutable Asset、SQL read-backの型を使う。natural-stone専用のmanifest/transform versionとkeyに原bytes hash、全draft object hash、manifest bytes hash、integer crop/rotation、BOX、recipe versionを束縛する。画像実bytesをdecodeして寸法・hash照合し、own `productIds` associationを113行で確認。原写真は単独・完全な個体をsource別に目視、原座標crop・姿勢理由を記録する。原raw同一hashでも商品associationをsource別に確認する。重なり・切れ・混合品・対応不明・品質不足はhold。原/加工の全distinct画像を**別々に**表示し、加工のhigh/medium/thumbnail全bytes hashとspec/key hashを承認recordへ束縛する。captureやcontact sheetだけで承認しない。
3. reviewed crop→aspect-contain透明余白の処理だけを使い、stretch/mirror/生成輪郭/穴補完をしない。原画像bytesをoriginalとして保持し、透明/明色石本体や模様を背景として消さない。ガードを緩めて失敗を通さない。写真は撮影投影の仮輪郭であり尺度校正ではない。
4. 登録前に現行minimum-sale、obsolete、quality、archive、sourceDraftId既登録、workspace/manifest hashと既存Part/Asset/design baselineを確認。source別holdを記録し他行を進められるが、契約外/原registry差/同source異仕様既登録は停止。single-worker lockと既存local RPCを使い、cloud書込0。`through_holes=[]`, `connection_points=[]`, `connectionReady=false`。既存Part/Asset/registry/design/archiveを書き換えない。
5. 保存直後と再起動後、全追加Part aggregateでown identity/category=`other`/raw label/ranges/BOX/unknown flags/購入単位と価格/空穴接続を照合。全distinct Assetでoriginal/high/medium/thumbnailの保存pathとAPI read-back full SHA256、transform/key/承認recordを照合。再実行追加0/中断復旧、一覧・編集・自由配置・保存/reload・未確認表示を統合境界で確認する。実designが0なら非空design保全の実証とは呼ばない。

Targeted反例は、113外ID、同ID別full draft・name/本文/label/SKU/tag/URL/category、capture bytes/寸法/association差、未知括弧・facet・suffix、cm販売長、3軸、組立品、mixed/random、8 qualityHeld、0/40超/grid外/逆転range、旧selectorへの漏出、cache衝突、画像hash差、重複既登録、穴・接続/粒単価生成を拒否する。positiveは45 exact IDのsource別意味・掲載値・BOX・category・不確実性と、残68の排他的holdである。

## Root adoption and implementation checkpoint

2026-10-26 JST。Root採用は上記45 exact sourceだけ。画像別審査後14採用/登録、原6sourceと加工4不採用、21写真審査残、68source保留。全18native/18加工specを審査、全14 first実created14→正式rerun0→API4画像/一覧/aggregate/元購入tag snapshot/原PartAssetarchive registry全3Design保全。別recipe/key/cache/範囲選択/個体差unknownとUI注意文を実装。独立review3指摘（注意文/空配列照合、元入力bytes hash照合、共通UI通知）をroot修正、36node/24対象unit/typecheck/build成功。live Part編集画面で注意文をread-only実確認、canvas新規配置保存/reload未実施。初回helperの継承文言finite78/white cream ABはprocessedApprovalのsource-specific補足審査で訂正し、原crop reviewer/time/key/bytesは保持。詳細は evidence/nominal-20261025-natural-stone-summary.json。旧hold解除/単粒価格/穴接続/cloud0、最終独立clean reviewなし。
