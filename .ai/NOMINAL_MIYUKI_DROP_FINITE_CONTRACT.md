# MIYUKI ドロップビーズ8件 — 有限 own BODY / 写真 BOX 契約

2026-10-25。実装・検証済み: 8件中5件を登録、3件は画像品質保留。初回保存→再実行0・増分画像/read-back/既存保全は evidence/nominal-20261025-miyuki-drop-verification.json。 設計時点の要件は以下に保持する。以下は登録前に定めた設計要件。現在の採用・登録結果は冒頭と増分証拠を参照。対象は `.local/setup/next-bead-body-source.json` の8件だけ。source file SHA256 `f438999d521c22f5189457c0cd479cb6a14cc4691e530103fea5e5ac623261eb`、照合用 `.local/setup/miyuki-drop-source-review.json` SHA256 `6a283a9774f27c5f10de3c18b6417cb15859fcaaf9ebfcf99e5f388fb929456b`、registry `.local/parts/parts.json` SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`。後者reviewの各draftは前者の対応する完全objectと同一だった。全8件の現snapshotは `sale.allowed=true`, `held=false` だが、登録直前に現行の最小販売単位・廃番・品質・重複guardを再評価する。

## 対象と不変の原情報

完全object SHA256は UTF-8 `JSON.stringify(draft)` に対する値。`id` だけではなく原object全体を照合し、productId/variantId/SKU/name/sourceUrl/category/tags/description/sizeText/purchase/imageUrls を変えた場合は拒否する。すべて `category=bead`、exact tags `made in JAPAN`, `MIYUKIドロップビーズ`, `シードビーズ`、own `sizeText=約3.4mm`。表の capture SHA256 は各own先頭gallery URL の既存captureに対応し、captureの `productIds` に自身の productId があることを必須とする。各captureは450×450、原bytesは保存済みbytesのSHA256で再照合する。

| DP / SKU | sourceDraftId | 完全object SHA256 | own先頭gallery capture SHA256 |
|---|---|---|---|
| DP250 / 10213 | `kiwa:8711216103716:46970130432292` | `569a432fbf77b4e5bf94d7b79be47e8ffbcbc88868a3e351a42682a26f52385b` | `d0c5b73fc3c0a53faf94c1801a2fa695c95767bf226cc74ba0e917bc212c6373` |
| DP528 / 10101 | `kiwa:8711215481124:46970128564516` | `8e28501dc4d8930e8202eac43254557593d1e90abffb662d7e307374ba2974c4` | `f6fc91cd19c677545dfd55b716cc97ec841c0b1b67cc8d05c2d4d4fde9c0467d` |
| DP19 / 10097 | `kiwa:8711213646116:46970124075300` | `62894870cf79c792270b9beb09528bea5c6f4fb6019be5edce579347b450d7ae` | `d310a0ef37b2943f5de7725ca83751665638124aa7e6b365a9482a5ce3153784` |
| DP401 / 10099 | `kiwa:8711214530852:46970125910308` | `0dad31cd6bab57d04065b958c0833f065fdedfccf58f43dc52702e67fd761cc8` | `e185edd5c18067dff13da58ed25577903d66f6614588fc8e9ac3d22a76b11585` |
| DP6 / 10102 | `kiwa:8711215841572:46970129383716` | `87cdd27674bcf1ef9e14faf2e8afff986663d8885714199227e23819b82377f5` | `3ea8c96b557d470ede2e5c8c3f0bac6c8c0d337bda91fa1c1941867084ea56e9` |
| DP140 / 10096 | `kiwa:8711213285668:46970122404132` | `580c425cbfc84436e6e5cd5d5f91546dc0d4eafdf8ba1da22296637d2dadc834` | `f90372999efb3a0df8973f7933bb439965d00c99c563935a333162cf943851fb` |
| DP3 / 10098 | `kiwa:8711214072100:46970124927268` | `d24a127faf4caa4690d1998f260cad3efab904c1b7ee146630af2b60b1af41ab` | `e4524117c72bea1ffe3d863e469221e908ec38c52ce5c3fe93b079b51341387c` |
| DP402 / 10100 | `kiwa:8711215055140:46970127384868` | `93851b5d8269893be6a4ff68c5a057ec18dca9605e5b13fe8895c54764489ad8` | `77c4d4704e01322254356d2361f54ae4ef65defb9d9f1a757b05f498152620aa` |

own BODYの全文は次の2種類だけで、各draftとの完全一致を必須とする。DP250/DP19/DP6/DP3 は `外径約3.4mmで穴の位置が中心からずれた、しずくのような形をしたビーズです。ビーズの穴に銀箔加工が施してあります。`、他4件は `外径約3.4mmで穴の位置が中心からずれた、しずくのような形をしたビーズです。`。前者の銀箔文は仕上げの説明。`外径約3.4mm` は本体外形の概寸であり、穴径・販売重量・粒数ではない。販売表記 `7g(約126粒)` は購入単位情報にのみ残す。

## 最小実装境界

`src/server/categoryBoxNominal.ts` の既存 `kiwa-own-photo-category-box-v1` に `miyuki-drop-body-scalar` の有限branchを追加する。同じレビュー済crop/姿勢、aspect-contain、透明余白、暫定BOXを使うため新recipeは不要。**category gate はこの完全object SHA256が一致する8件だけ `bead` を許し、従来の `other`/`charm` 判定を変えない。** 既存scalar/pair/H-W/W-H/有限sequinの判定、出力、cache keyは不変。曖昧なカテゴリfallback、名前prefixだけの拡張は禁止。ruleには各行の完全object hash、原寸法文、原BODY全文、category/tags、own gallery URLとcapture hashを束縛し、全条件を同時に検査する。familyは `MIYUKIドロップビーズ　DPxxx` のown名称から各行で完全一致させ、一般的なsuffix削除をしない。

寸法は専用branchの原文 `約3.4mm` とown BODYの `外径約3.4mm` の一致でのみ受理する。掲載値を `widthMm=3.4`, `heightMm=3.4` の**暫定正方形配置枠**へ写す。`diameterMm` や球形recipe/geometryには渡さず、物理幅・高さ、写真の尺度/軸/姿勢、サイズ別外観は未確認を保持する。BODYの「穴の位置が中心からずれた」は穴座標や接続方向を定めない。`through_holes=[]`, `connection_points=[]`, `connectionReady=false` を維持する。

`scripts/register-nominal-parts.mjs` は有限ruleとreviewを現行registry/captureと照合し、既存guard通過後だけこのbranchを選ぶ。Part `category` はこのbranchに限って `spec.category='bead'`、それ以外のdispatchは既存のまま。metadata/source snapshotには原label・BODY意味・完全object hash・review identity・未確認flagを残す。`scripts/prepare-category-box.mjs` は既存のreviewed crop/pose検証を共有し、image keyは既存方式を保持し、prepared cacheのspec全体hash（枝識別子と完全object hashを含む）とimage keyの組合せで束縛する。ただし旧specのkey/transform versionを変更しない。`scripts/prepared-category-cache.mjs` は現行のsource hash/spec binding検証を使い、加工済みbytesの再利用を準備段階に限定する。写真採用承認はcache hitとは別に検証する。画像背景の黒/白に応じた自動mask規則を変更しない。

## 写真承認、拒否、検証

8 own原画像の各々と、採用候補の各加工画像をrootが**別々に目視**する。既存写真には複数の完全で分離可能な個体が写るので、未回転decoded rasterの整数cropを一個体に定め、全外周、同定、姿勢、背景処理を承認した `url,sha256,sourceWidth,sourceHeight,crop,coordinateConvention,reviewedBy,reviewedAt,rotationDegrees,rotationReason,photoPose` を記録する。完全個体を孤立させられない、他個体と接触/重なり/切れがある、白背景pipelineが正しく透明化できない場合はそのsourceを品質holdに残す。**DP250 の黒背景先頭画像は現行白背景pipelineでは保留**し、mask変更や別gallery差替えで黙って登録しない。source reviewの `held=false` は写真採用ではない。

- 正例: exact8のうち原/加工写真と現guardが承認されたものだけ `3.4×3.4 mm` の暫定BOX・`bead`・未確認flag・空穴/空接続で登録可能。
- 拒否: 非列挙draft、完全objectの任意field差、別商品のBODY/先頭URL/capture/product association、別tag/category、`3.4mm` を穴径/球径と解釈する入力、販売重量/粒数からのサイズ生成、軸/穴座標/接続点の推定、未review原/加工写真、黒背景DP250の現pipeline処理。
- 回帰: 旧 `other`/`charm` と両sequin枝の出力/画像keyは一致、bead新枝は旧keyと衝突しない。境界/不正サイズと写真crop不正を拒否する。購入guard・廃番・品質hold対象は書込0。
- 統合: 採用分だけlocal SQLへ逐次保存し直後のaggregate read-back、Part/Asset/API原高画像hash・一覧・空穴/空接続を照合。初回verificationを別保存して再実行追加0、既存Part/Asset/registry/全Design保全、cloudWrites=0を確認する。写真不採用分は理由付きholdとして残し、8件全採用を契約しない。
