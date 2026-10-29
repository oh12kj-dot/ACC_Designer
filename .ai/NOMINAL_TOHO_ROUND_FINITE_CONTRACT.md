# TOHO丸小・特小ビーズ — 有限 own BODY / 写真 BOX 契約

2026-10-25。以下の丸小節は設計時の契約。現在の採用・登録結果は引継ぎと増分証拠を参照。後段の特小節は**設計のみ、写真未承認・未登録**。丸小の対象原稿 `.local/setup/toho-round-next-sources.json` は132件、SHA256 `4cb8038440b585a79df1e7a2ca776c3c0b78e0c66fdfe60b989282735739f82d`。照合台帳 `.local/setup/toho-source-review.json` は同じ132 complete draftと各own先頭画像captureを含み、設計時のSHA256は `3b8306811b2fb3fe4983a7287a547ab233ab4e8fa90ca96f05b144de01f4c338`。この契約で受理し得るのは、両ファイルで同一のcomplete draftを持ち、own descriptionが**正確に** `外径約2.0－2.2mmの丸みを帯びたビーズです。` で始まる129件だけ。ID列挙はこの固定ファイルの該当129件から一度生成してコードに固定し、実行時にprefix探索して対象を増やさない。両ファイルのSHAが変われば再審査する。

## 意味の境界

- 129件は `category=bead`、own `sizeText=約2mm`、measurementは `unassigned:[2]`。BODYの `外径約2.0－2.2mm` は本体外径の**概寸範囲**。掲載約2mmは独立した表示値として保持し、既存の暫定配置BOX `widthMm=heightMm=2` にのみ写す。2.1mmの中点、2.2mm上限、範囲から選んだ別の点を配置値や実寸として生成しない。BOXは物理W/H・真円/球・写真の尺度/軸/姿勢を証明しない。
- specとPart metadata/source snapshotに `publishedSizeLabel=約2mm`、`publishedSizeValuesMm=[2]`、`publishedBodyOuterDiameterRangeMm={min:2.0,max:2.2,approximate:true,sourceText:'外径約2.0－2.2mm'}`、原description、complete object SHA、未確認flagを**別field**で残す。`bodySizeMeaning` は本体外径範囲であって穴径ではない旨を表す。`diameterMm` や球形geometryへ渡さない。
- 名称・BODYの「丸」「丸み」は幾何形状の認定ではない。「穴に…加工」は色/仕上げの記述で、穴径・位置・通過軸・接続可能性を定めない。`through_holes=[]`, `connection_points=[]`, `connectionReady=false`、`physicalWidthVerified=false`, `physicalHeightVerified=false`, `sizeAxisInterpretationVerified=false`, `variantCutAppearanceVerified=false`, `imageScaleVerified=false`を維持する。
- 購入欄には重量・粒数だけでなく長さや不明単位もあり、価格も異なる。これらを原値のまま保存し、数量からPartを複製せず、価格・個数・長さから寸法を作らない。最小販売単位、廃番、重複、品質holdは登録直前に既存guardで再評価する。台帳の `sale.allowed=true` / `held=false` は写真採用ではない。

## 三つの意味例外

以下は同じ原稿にあるが有限129件に含めない。**prefixを `径` まで緩めず、BODYと掲載値の衝突も自動解決しない。** 別の根拠と契約が得られるまで品質/意味保留とする。

| No. / sourceDraftId | 原BODY先頭 | 理由 |
|---|---|---|
| 121 / `kiwa:10083108552996:50682685423908` | `外径約3mm、穴のサイズは約1mmです。` | 掲載 `約2mm` と本体外径が矛盾。穴約1mmもgeometry承認ではない。 |
| 88 / `kiwa:8711118520612:46969881362724` | `径約2.0－2.2mmの丸みを帯びたビーズです。` | `外径` がなく、同じ意味へ補正しない。 |
| 42 / `kiwa:10083108520228:50682685391140` | `外径約3mm、穴のサイズは約1mmです。` | No.121と同じ衝突。 |

## 有限束縛と実装

`categoryBoxNominal.ts` の `kiwa-own-photo-category-box-v1` に専用 `toho-round-body-range` branchを追加する。129各行について、`id -> {objectSha256,photoSha256}` を固定列挙する。object SHAはUTF-8 `JSON.stringify(draft)` のSHA256で、台帳の `objectSha256` と再計算値を一致させる。photo SHAはown `imageUrls[0]` に対応する台帳captureのSHA256で、保存原bytesの再計算値、capture URL、`productIds` に自身のproductIdがあることを照合する。ruleにもexact `category`, tags, name/family, description全文, sizeText, own先頭URL、両SHAを束縛し、どれか一つでも変われば拒否する。129行以外の `bead` を通す一般category gateや汎用range parserは作らない。既存 `other`/`charm`、MIYUKI、つぶし玉、sequin、scalar/pairの出力を変えない。

既存のreviewed crop/pose、aspect-contain、透明余白と `categoryBoxImageKey` を再利用する。prepared-category-cacheの **spec全体SHAとimage keyの組合せ**に新branch識別・complete object SHA・BODY範囲を含める。すでに登録済みの画像key、transform version、crop review identity、画像bytesは変更しない。cache hitだけでは写真承認にならない。

## 写真と受入試験

rootが採用候補の各own原画像と各加工画像を**別々に目視**し、商品同定、完全な一個体、外周、他個体との重なり、透過、crop、姿勢を承認する。各採用reviewに `url,sha256,sourceWidth,sourceHeight,crop,coordinateConvention,reviewedBy,reviewedAt,rotationDegrees,rotationReason,photoPose` と実際の審査時刻を記録する。写真が不適切ならその行を理由付き品質holdに残す。写真は物理寸法や穴を証明しない。129件全採用は契約しない。

- 正例: 固定129のうち現行guardと原/加工写真審査を通った行だけ、掲載2×2mmの暫定BOX、BODY範囲の別field、`bead`、空穴/空接続でlocal SQLへ最大1 Part/variant登録できる。
- 拒否: 非列挙ID、上記3例外、object任意fieldの変更、別商品のcapture/review流用、`sizeText`/BODY/prefix/category/tags差、範囲の中点化・上限化、穴/形状/軸の推定、購入数・価格・長さ由来の寸法、未review・切れ/重なり・透過不良の写真。いずれも書込0。
- 回帰/統合: 旧枝specと画像key一致、新枝のspec束縛とsource bytes差でcache不正を拒否。採用分の原/高画像API hash、一覧、aggregate read-back、空穴/空接続を確認。初回verificationを別保存し再実行追加0。既存Part/Asset・registry/source/mapping 27,046・全Designと既存品質holdを保全し、`cloudWrites=0`。完了/校正/Production認定へは昇格しない。

## TOHO特小94件 — 別の有限scalar枝（設計のみ）

原稿 `.local/setup/toho-small-next-sources.json` は95件、SHA256 `fda52e78bf35ae3b72ac2c89c935e6fbd3742543dd5d4549568e75f12b862033`。own capture照合台帳 `.local/setup/toho-small-source-review.json` は同じ95件のcomplete draft・object SHA・own先頭画像captureを持ち、設計時SHA256 `906e3b2d16e50d8b2cf6feb33d713b22c39b600f980273088fdcca145040c3d2`。94件だけがown descriptionの正確な先頭 `外径約1.5mmのとても小さいビーズです。` を持つ。残りの No.109 `kiwa:8711092994340:46969812287780` は掲載 `約1.5mm` に対してBODYが `外径約2.0－2.2mmの丸みを帯びたビーズです。` なので**意味保留**。丸小129件のBODY範囲枝にも移さない。94件のID集合を固定列挙し、実行時のprefix探索では拡張しない。

94件は `category=bead`、measurement `unassigned:[1.5]`。raw `sizeText` は `約1.5mm` が86件、全角数字を含む `約１.5mm` が8件。両者の**原文をそのまま**保持し、完全object hash一致後の数値解釈だけ1.5mmを許す。name、description全文、tags配列、purchase、price、SKU、source URLを含む完全objectの差分を拒否する。tagsには発売日やロイヤルビーズがあり、1件は `made in JAPAN` がない。追加tagの有無から対象を推論せず、各行の原配列を固定する。購入表記は `7g(バラ・約1750粒)` 83件、括弧表記差8件、`1m(約960粒）` 3件。重量/長さ/粒数、価格からサイズ・個体数・形状を作らず、最小販売単位・品質holdなど既存guardを登録直前に再評価する。

`categoryBoxNominal.ts` に丸小とは独立の `toho-small-body-scalar` 有限枝を設ける。各固定IDへ `objectSha256,photoSha256` を束縛し、UTF-8 `JSON.stringify(draft)` の再計算SHA、台帳object SHA、own `imageUrls[0]` とcapture URL、保存原bytesのSHA、capture `productIds` の自身のproductIdを同時照合する。ruleのexact identity/category/tags/name/description/sizeText/先頭URLとreview identityも一致させる。丸小129件のbindings、既存category gate、recipe、transform、画像keyは変更しない。既存 `kiwa-own-photo-category-box-v1` とreviewed crop/pose、prepared cacheのimage key＋spec全体SHAを共有するが、cache hitは写真承認ではない。

採用可能な配置値は掲載1.5mmからの**暫定 `widthMm=heightMm=1.5` BOX**だけ。BODY外径約1.5mmは別field `publishedBodyOuterDiameterMm=1.5` と原 `sourceText` に残す。物理幅/高さ、球形、写真尺度・姿勢・軸、穴径/位置/方向、接続可能性は未確認。`diameterMm` に渡さず、`through_holes=[]`, `connection_points=[]`, `connectionReady=false` と既存の未確認flagを保つ。穴の着色/メッキ記述からgeometryを作らない。

rootが各採用候補の**原画像と加工画像を別々に目視**し、own商品、完全な一個体、外周、重なり、背景透過、crop、姿勢を承認した場合にだけ、実際の審査時刻を含む既存review fieldsを記録する。未確認・不良は理由付き品質hold。正例は固定94のうちguard・写真審査通過分だけlocal SQLへ最大1 Part/variant。拒否試験にはNo.109、未列挙ID、raw `sizeText` の無断正規化・別行への流用、object/写真hash差、category/tag差、購入長・数量からの寸法、穴/形状の推定、未review写真を含め、書込0。回帰は丸小129を含む全旧枝spec・画像key、preparation cache、新枝の境界入力を確認する。登録後は丸小節と同じ増分read-back・画像hash・再実行0・既存Part/Asset/registry/全Design・品質hold保全、`cloudWrites=0` を確認する。94件全採用や実寸校正は契約しない。
