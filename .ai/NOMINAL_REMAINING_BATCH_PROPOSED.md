# 残件の連続 own-photo BOX — 提案契約

2026-10-10。PROPOSED / 未実装 / 未登録。指定されたSol設計作業として作成したが、この子agentの実model/effortを確認するruntime情報は返されていないため、confirmed Sol reviewとは呼ばない。

## 目的・境界

全件対応の掲載サイズ承認を、カテゴリを保持した大きな連続バッチへ展開する。一つの契約・有限rule manifest・source別画像reviewを使い、familyごとの設計呼出し/サーバ再起動を不要とする。27,046件すべての採用は保証しない。固定registry、既存Part/Asset/寸法図47件、既存recipe/cache/写真判断、ユーザーデザインは不変。local SQL/RPC/immutable Assetのみ。Supabase書込0、穴/接続生成0、connectionReady=0。

根拠は `.ai/ALL_VARIANT_MAPPING_CONTRACT.md`、`.ai/NOMINAL_ACRYLIC_BOX_CONTRACT.md`、`src/server/acrylicBoxNominal.ts`、`scripts/register-nominal-parts.mjs` と、固定 `.local/parts/parts.json` の各draft自身のname/tags/description/sizeText/imageUrls。OCRやrelated-product本文はBODY根拠にしない。

## 現在値と候補上限

`.local/calibration/nominal/remaining.json` は2026-10-09T22:48:18.399Z、registry SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`、workspace `af3aed9f-240b-4021-a01e-40521f03adb6`。登録10,838/残16,208、1,090は**作業グループ数**。`catalog:charm:チャーム` はexact形状familyではなく名前先頭tokenのスケジューラ分類である。

| 初回作業グループ | 残variant/商品 | サイズ文法・40mm/格子を通る上限 | 未採用境界 |
|---|---:|---:|---|
| catalog:other:アクリル | 242/199 | 220/180商品＝scalar122＋無軸pair98 | 22件＝文法12＋範囲/格子10。既存写真品質/assort判断も再利用しholdを勝手に解除しない |
| catalog:charm:チャーム | 1,091/1,025 | 1,028variant＝scalar148＋無軸pair246＋H×W630＋W×H4 | 63件。旧文法だけなら394/338商品。追加634件のlabel軸branchは本提案の新しい有限拡張 |

計1,248件は**size-parser候補上限**でありown BODY採用・写真採用数ではない。rootの discovery-only `scripts/plan-nominal-photo-batches.mjs` と `.local/calibration/nominal/remaining-photo-batch-candidates.json` はconsidered1,333/candidate1,248/distinct原hash1,145/hold85（Parts変更0）を記録する。candidateはexact labelとown gallery associationの検査でありBODY/写真採用を証明しない。画像未レビューの登録可能確定数は0。チャーム1,028の重複を除いた商品数はここでは算定していない。SQL sourceDraftIdと新しいremainingを起動時に再照合して差分を確定する。

## 受入文法とown BODY

- labelはNFKC/空白除去だけ。既存scalar `^(約)?(\d+(?:\.\d+)?)mm$`、無軸pair `^(約)?(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)mm$`。正/finite/40mm以下、1/40mm格子（既存許容誤差）を維持。
- 新branchはチャームの `^(約)?H(\d+(?:\.\d+)?)×W(\d+(?:\.\d+)?)mm$` または `^(約)?W(\d+(?:\.\d+)?)×H(\d+(?:\.\d+)?)mm$` のみ。掲載H/Wの生label、原数値順序、軸tokens、W→BOX幅/H→BOX高さの割当てを保存する。掲載軸情報があることと実寸/写真軸検証を区別し、物理幅高さ・写真対応は未確認。無軸pairは従来どおり原第1値→幅/第2値→高さ、scalarは正方形。diameterへ格納しない。
- `H12×9mm`、3軸、`x`、範囲、slash、括弧サイズ、単位不足、cm、販売長/線径/内径/穴径/適合石/適合丸玉は自動補正せず保留。この契約ではアクリルのx11件を×へ置換しない。
- exact familyはNFKCした商品名の ` / ` 前から、**実在する色/finish suffixを有限表で除いた値**。汎用「最後のtoken削除」だけで未知名を受け入れない。letters/No./カン数/形状番号を残す。tagは当該draftに実在する完全一致値をruleへ列挙。
- finite rule manifestに `{exactFamily, exactTags, bodyPrefixes, labelKind, outputCategory, sourceProductIds}` を保存。各draftはown descriptionのexact許可prefix、description SHA256、name/SKU/variant/product associationを照合する。prefixが注意書きだけ/厚さだけ/使用説明だけの場合、本文後段の本体説明をsourceごとのexact文/hashで追加し、本体寸法と適合寸法の区別を記録する。generic `includes('チャーム')`、prefix一致によるfamily拡大、notice自動削除は禁止。
- 同一exact prefix/descriptionは一度意味レビューして各own sourceへの完全一致チェックを再利用できる。異なるsourceからのdescription引用やfamily代表から未一致descriptionへの流用は禁止。登録前manifestを固定しhashで入力を束縛する。既知カテゴリ内のmanifest追加は同一契約内で進め、未知サイズ意味/新geometryの場合だけ設計へ戻す。

### すぐにまとめられるown BODY表（写真採用前）

アクリルは下表の11 exact family、79variant。family列は「アクリル ドイツ製 」を前置する。tagは記載どおり完全一致。すべてregistry `other` を維持し、新Partも `other` とする。既存154 `bead` Partを変更しない。

| exact family末尾 | exact tag | own BODY exact prefix | 候補 |
|---|---|---|---:|
| カボション ラウンド1 | ドイツ製カボションラウンド1 | 底が平らになっている通し穴のないパーツです。 | 15 |
| チアフルフラワー | ドイツ製チアフルフラワー | 内側と外側にカラーが施されたフラットなフラワー形のパーツです。 | 14 |
| スズマル | ドイツ製スズマル | ころんとした丸みのあるフォルムのパーツです。 | 8 |
| オーバル2穴 | ドイツ製オーバル2穴 | オーバル形のパーツで、穴が2つ空いています。 | 9 |
| 花17 | ドイツ製花17 | 中央に穴が開いている5弁花です。 | 5 |
| 花19 | ドイツ製花19 | 中央に穴が開いている3弁花です。 | 6 |
| 花12 | ドイツ製花12 | 中央に穴が開いている3弁花です。 | 5 |
| 花13 | ドイツ製花13 | 中央に穴が開いている5弁花です。 | 4 |
| カボション ハート | ドイツ製カボションハート | ヴィンテージ風の底が平らになっている通し穴のないハート形のパーツです。 | 4 |
| カボションローズ | ドイツ製カボションローズ | 底が平らになっているカボションタイプのパーツです。 | 3 |
| 花びら | ドイツ製花びら | 緩やかなカーブの花びら形のパーツです。 | 6 |

チャームは以下のown BODY群で**旧scalar/無軸pair文法を通る**96variant。H/Wbranch対象はこの96へ暗黙追加しない。すべてexact tag `チャーム`、registry/新Part `charm`。群名で受理せず次の有限exact family集合とsource product照合をmanifestへ展開する。

| exact family集合 | own BODY exact prefix | 候補 |
|---|---|---:|
| チャーム メタルボール | カンが付いた丸玉のメタルチャームです。 | 10 |
| チャーム イニシャルベーシック＋M/K/S/Y/R/A/H/N/T/E/J/C/I/D/W/B/V（各文字を別familyとして完全一致） | ベーシックなデザインのイニシャルチャームです。 | 34 |
| チャーム ガールズ＋カメリア/リップスティック/リップマーク/ハート/リボン/カメリア 2カン/チェリー/ネイルボトル | 可愛らしいモチーフのガールズチャームです。 | 36 |
| チャーム 6弁花フラット 1カン/2カン | シンプルな6弁花モチーフのフラットなチャームです。 | 8 |
| チャーム 5弁花フラット 1カン/2カン | シンプルな5弁花モチーフのフラットなチャームです。 | 8 |

この175件は具体的BODY表の候補。上限との差1,073件はsource別BODY manifestを完成させる必要があり、サイズ文法だけで受け入れない。アクリルの既知細長写真品質fail、キュービックassort、ダブルハート等のholdはそのまま理由付きで保持する。

## 写真reviewと再利用

新recipe `kiwa-own-photo-category-box-v1` と独立cache namespaceを用い、既存アクリル/Czech version/key/transformを一切変えない。own gallery URL association、原bytes SHA256、decode dimensionsを照合。原/加工reviewは全**distinct**入力/出力単位で行い、同一原hash・整数crop・rotation・出力BOX・加工versionの画像はレビューを再利用できる。ただし各sourceのgallery association/BODY/サイズ/カテゴリ照合は全件行う。同じ見た目だけでは再利用しない。

原decode未回転矩形 `{left,top,width,height}`、座標規約 `unrotated-decoded-raster-integer-pixels`、reviewedBy/At、family/sourceURL/hash、単独個体・見かけ姿勢、明示rotation0/90と理由を記録。複数物体は完全で分離可能な一個体だけを手動review crop。接触/重なり/切れ/同定不可/assortのvariant対応不明は拒否。自動cropやサンプル12枚を全件reviewとみなさない。原/加工contact sheetを複数sourceまとめてreviewしてよい。

既存extractReviewedCzechCrop/prepareBodyBox相当のhash/範囲/品質・aspect-contain/透明余白方式を共有。extractはtrim/rotation/resizeより先。原bytesをoriginalとして保存。stretch/mirror/生成輪郭/穴補完/厚み推定なし。穴・カンが写真/本文にあってもthrough_holes/connection_pointsは空。画像加工/輪郭/サイズ別外観/物理軸/接続は一覧・編集・配置で未確認表示する。

## 連続実行・保全・検証

1. 起動一回でregistry/remaining/workspace/manifest hashとSQL重複sourceDraftIdを照合、既存Part/Assetと全design aggregateのbaselineを保存。実design0件なら非空実design保全の実証とは呼ばない。source review準備と画像処理は有限並列、SQL書込は既存single worker lock下で逐次。
2. 79 acrylic＋96 charmを初回連続batchとし、残exact manifestは同じworkerへ追加した次batchで処理する。familyごとに再起動・全10,838件再画像検証・Sol呼出しを繰り返さない。1batchは100–250新Part程度、family途中のcheckpoint可。25新Part/終了時の既存atomic checkpointを維持。各save直後SQL read-back。Part保存済/manifest未保存の中断もSQL sourceDraftId/仕様/Asset一致で回収する。
3. 確定済Partの仕様不一致/重複/registry変化/workspace違いは停止。単一候補の文法/BODY/写真不採用は理由付きholdとして残し他候補を継続。例外を成功へ数えない。再実行追加0。live lockを奪わない。
4. 各batchは追加全Partのcategory/own identity/BOX/unknown flags/空接続、全distinct新Assetのoriginal/full加工hashとAPI bytes、増分一覧を検証。既存Part/Asset/デザイン不変をbaselineへ照合。category bead/gemへdefault fallbackしない。最後の統合境界で一回restart/read-back、代表acrylic-other/charmの自由配置/保存/reload/未確認表示・カテゴリ検索を確認。候補/採用/保留/既登録を排他的集計しremainingを再生成。

## 最小実装箇所と受入判定

- 新 `src/server/categoryBoxNominal.ts`：有限rule manifest＋own BODY＋3 label branch＋explicit category/pose検証。既存44アクリルfamilyの出力/判定を変更しない。
- 新wrapper（例 `scripts/prepare-category-box.mjs`）：既存pixel pipeline呼出し、専用namespace/transform/key。キーに原hash/crop/rotation/BOX/versionを含める。
- `scripts/register-nominal-parts.mjs`：別scope/review読込、新recipe限定分岐、categoryを**新branchだけ** `spec.category` から取得、増分集計。既存recipe category/仕様不変。永続categoryはenumにある `other`/`charm` を使い新enum不要。
- 新manifest＋増分record/verification：scope/rules/BODY evidence/source review/promotions/holdsをsourceDraftIdで対応、原固定registryを編集しない。既存promotions/remainingは既存atomic方式を使う。
- targeted tests：wrong family/tag/BODY/source association、H/W取り違え、unlabeled H拒否、3軸/適合径/販売長拒否、40境界/grid、カテゴリ保持、空接続、専用cache分離、中断再開/再実行0。既存共有crop/nominal検証を維持しtypecheck/buildを統合時に実行。

承認対象はこのbounded contractであり1,248件の採用保証ではない。完了は実SQL/read-back/画像review/保全証拠で確定する。新しいgeometry・未知サイズ意味・categoryを変える必要が発生したものは個別holdとして残し、同契約の通常batchを止めない。
