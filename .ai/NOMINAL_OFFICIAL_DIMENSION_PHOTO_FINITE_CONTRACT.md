# 公式寸法根拠を持つ単独写真 41 source — 有限設計契約

2026-10-26。**IMPLEMENTED / PHOTO ADOPTION 0 / REGISTERED 0 / ARCHIVED-SOURCE USER DECISION PENDING**。対象は `.local/setup/single-object-finite-next-candidates.json` の **全41 exact source** に限る。snapshot SHA256 `9a27629b98598879be6e1aa4c831202794fed330de2f19aad536c3e85a13e1d4`、registry SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`。41件すべての `draft` 全object、`objectSha256`、`capture`、`dimensionEvidence`、`sale`、`held`、3 review flagをsourceDraftIdで一対一に束縛する。対象集合をfamily名・URL・同じ写真hashで拡張しない。

| 根拠kind / 元category | 全件 | `held=true` | 最大審査対象 |
|---|---:|---:|---:|
| `official-crystal-frontal-axes-only` / `other` | 23 | 3 | 20 |
| `official-ball-diameter-only` / `bead` | 18 | 0 | 18 |
| **計** | **41** | **3** | **38** |

元画像hashは25 distinct、公式図hashは2 distinct。snapshot時点の `sourceMeaningReviewed` / `originalReviewed` / `processedReviewed` は全41件false。**38は上限であり採用数ではない**。既存保留3件 `kiwa:9137772134692:48248811094308`、`kiwa:9890257633572:49958025363748`、`kiwa:9890257568036:49958025298212` はこの契約で解除・写真採用・登録しない。候補生成時の `sale.allowed=true` は実行時の最小販売単位・廃番・品質保留チェックを代替しない。

## 権威と寸法境界

`.ai/ALL_VARIANT_MAPPING_CONTRACT.md` の掲載寸法による暫定配置と未確認表示、`.ai/NOMINAL_REMAINING_BATCH_CONTRACT.md` のown source/画像・保存保全境界を守る。寸法は**各行自身の既存** `dimensionEvidence` だけを使う。`kind`、`sourceDraftId`、`variantId`、`sku`、`sourceUrl`、公式図URL/hash、product capture、label と当該draftのname/sizeText/本文/購入表記を照合する。公式図を各sourceのgallery associationとimmutable bytes SHA256で検証する。OCR、他variant、隣接商品の図から新しい寸法を足さない。

- #4809は `outerWidthMm` / `outerHeightMm` をそのままBOX幅/高さへ置く。掲載 `13×12mm` は図の **W12/H13**、`8×7.5mm` は **W7.5/H8**。掲載順をW/Hへ機械的に転記しない。各sourceの図labelと軸を個別照合し、正・有限・40mm以下・1/40mm格子を要求する。元category `other` を保持し、diameterを作らない。
- 球は `publishedDiameterMm` だけをW=Hの暫定BOXに使い、元category `bead` を保持する。正・有限・40mm以下を要求し、原label・概寸flagを保存する。図の直径根拠が写真の真球形、画像尺度、穴位置を証明したとは扱わない。
- `nominalAxes` は #4809を明示拒否し、`nominalBall` は写真未審査の旧限定selectorである。この拒否・限定を全体から削らず、**snapshot内のexact sourceだけを受ける独立constructor** `nominalOfficialDimensionPhotoFinite`（仮名）を先行dispatchする。旧 `prepareNominalAxes` は `fit:'fill'` で写真を伸ばすため、この経路には使用しない。既存selector/recipe/keys/加工bytes/登録済Partは不変。

rootが既に実見した最初の #4809 元画像 `02f0cdf757dd97c1cebfbc9bdd20b32f7ffd74b25f34cc75a7fccf8fea7198bf` は正面向きの単独ハート、公式図 `35a7bb31a9cfc0c3e3d1c585757af9948246f3b452653c2316ae4c4225782de4` は上記W/H。これは**その1原画像と図の観察**であり、他24原画像や38 sourceの写真・外観採用ではない。共有原画像でも各variantの写真対応・色/finishは未確認として残す。

## ひとつの有限 own-photo 審査と加工recipe

新manifestは41行全部の結論を保持する。最初にexact full-object/hash、registry、gallery URL→bytes/hash/product association、公式図bytes/hash、sourceのサイズ意味、category、販売単位を行ごと検証する。別の `sourceMeaningReview` に正面軸または直径の読み、原label、解釈者/日時/理由を記録する。欠落・不一致・範囲外はsource単位hold。3既存heldは無条件hold。図は寸法reference、商品原画像は形状referenceとして役割を分ける。

各distinct元画像を原寸で実見し、単独個体・全外周・正面姿勢・背景との分離・このsourceのown商品/variant対応を記録する。複数個体なら完全に独立している一個だけを**手動**で選べる場合に限り、未回転decode上の整数crop `{left,top,width,height}`、source URL/hash/幅/高さ、`unrotated-decoded-raster-integer-pixels`、reviewer/時刻/理由を固定する。重なり、切れ、別サイズ・assort同定不能、部品外周に必要な要素が欠ける写真はhold。hashを共有する画像のcrop審査は再利用できるが、各sourceのgallery/variant照合を省略しない。今あるcaptureと図を再利用し、gallery取得・OCR処理を再実行しない。

新recipe/key/cache namespace（例 `kiwa-official-dimension-own-photo-finite-v1`）だけに、既存 `extractReviewedCzechCrop` → `prepareBodyBox` の非伸縮処理を組む。crop後に既存white trim、明示review済rotation、`contain-with-transparent-padding`、透明化を行い、原bytesをoriginal renditionとして保存する。正面軸・直径はBOXの暫定配置値であり、写真の物理端点・尺度ではない。写真内の輪郭を図へ強制変形せず、穴・カン・隠れた面・サイズ別外観を生成しない。aspect/trimガードに失敗した写真は自動救済せずhold。加工後の**新規初回4 rendition（original/high/medium/thumbnail）**を全distinct keyで実見し、外周欠損・誤crop・回転・透過の破損がないことを判断してから別のprocessed approvalを作る。approvalは最終spec SHA、専用image key SHA、4 rendition SHA、reviewer/時刻を束縛し、source/加工reviewより後の時刻にする。準備cacheはapprovalではない。

同じ元hashでも寸法・crop・rotation・source rule・加工versionが異なれば専用keyを分ける。cache hit時もspec/key/payload/bytes hashを検証し、approvalを再照合する。原画像hash、公式図hash、full source object hash、有限manifest hash、registry hash、review/approval hashをPart evidenceとAsset transformへ残す。`imageScaleVerified=false`、`variantAppearanceVerified=false`、`connectionReady=false`、物理軸/穴位置未確認を明記し、`connection_points=[]` / `through_holes=[]`。元category `other`/`bead`、原SKU/値段/購入表記/タグをそのまま保存する。

## 保存・再開・検証の境界

実装時はmetal-bead finiteの**既存 helper の構造**（入力binding、専用cache、processed approval、Asset bytes照合、source重複ガード、二度目bootstrap、直後aggregate readback）を利用してよい。ただしそのbead専用関数をcategory差し替えで直接共用しない。独立finite constructor/validatorと薄い専用adapterを作り、既存登録scriptへ exact source dispatchを最小追加する。既存全selector・既存recipe/key/bytes、固定registry27,046、既存Part/Asset、3 Design、archiveをbaselineと比較して保持する。cloud書込0。

書込直前に最新の最小販売単位・廃番・quality hold・own source写真approvalを再確認する。activeだけでなくarchivedを含むsourceDraftId一致行を全件検索し、他recipe/重複/archivedは自動再利用せず停止またはhold。既にこのrecipeで保存済みの1行だけは、full evidence/Asset 4 bytes/category/購入情報/readbackが完全一致する場合に限り回収する。未保存はsingle-worker lock下の既存local SQL/RPC/immutable Asset経路で逐次保存し、**各Part/Asset直後**にaggregateとAPI画像4 bytesを照合する。起動時workspace IDと承認manifest hashを、commit直前の二度目bootstrap・採用manifest最新bytes SHAと照合する。変更なら停止。既存atomic checkpoint、再実行追加0、warm-cacheと中断回収の同一性、restart後readback、実一覧のcategory/未確認表示を検証する。source単位holdを成功数へ混ぜず、41=登録済/新規採用/未採用hold等の排他的集計を保存する。

最小testは41行・3保留・kind/category/寸法順序、full-object/図/gallery/registry/manifest変造、#4809旧拒否維持、非伸縮/crop境界、4 rendition approvalとcache破損、archived/重複source、二度目workspace/manifest差し替え、commit直後JSON roundtrip readback、再実行0、保存済3 Design/registry/旧Asset保全。境界の新規ロジックは対象test→typecheck/build→統合readbackの順で確かめる。寸法出典と写真同定を結ぶため、実装後の重要な不変条件に**一回の独立したrisk-based review**を行う。設計変更や採用数の保証ではなく、証拠を満たす行だけ登録する。所要時間の希望で審査基準を緩めたり、未確認を合格扱いしたりしない。


## 最新実装・SQL照合

有限constructor/専用非stretch recipe/key/cache/明示登録dispatchを実装。旧selector/fit:fill/既存bytesは変更0。全41 source/photo/図/mapping hashを照合。SQLで#4809全23が旧frontal-axes Partのarchivedと判明し、20品質保留外+3旧holdとも復帰/置換/登録0。残18TOHOはpacked原写真、4crop候補は隣接片または切れで未採用、加工0。新採用は最大18を超えず、20の新版か23除外かはユーザー質問回答待ち。未回答を承認としない。

独立reviewはgpt-6-sol/medium明示要求・runtime未確認。source別の図軸意味/variant-photo review不足、回収Part全aggregate readback不足、Assetのregistry/図/寸法/review hash不足の3blockingと全41結論台帳不足を指摘。rootが別々のsourceMeaningReview/sourceCorrespondenceReview、4renditionと来歴hash、fresh full recovery readback、全41排他的dispositionへ修正。対象41tests成功、registered-only11054再利用/processing0、最終独立clean reviewなし。新経路の実Part/Asset保存は0のため実登録成功とは呼ばない。詳細 .ai/evidence/nominal-20261025-official-dimension-summary.json。
