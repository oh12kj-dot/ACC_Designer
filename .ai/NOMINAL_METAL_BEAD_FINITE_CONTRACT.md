# メタルビーズ57件 — 有限掲載BODY BOX設計契約

2026-10-26。**ADOPTED / IMPLEMENTED / 20 REGISTERED / 37 UNADOPTED**。対象は `.local/setup/metal-bead-finite-design-candidates.json` の57行だけ。ファイルbytes SHA256 `b8eb0d2c948db96cf763b61b35e74b731cc07230a2a640f0bfe3e69c6e8a3fad`、固定registry 27,046件 SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`。候補内の22商品・22 distinct captureについて全57 `objectSha256=SHA256(UTF8(JSON.stringify(draft)))`、`capture.url ∈ draft.imageUrls`、`draft.productId ∈ capture.productIds` を確認した。captureは関連付けの候補であり写真の採用ではない。候補作成時のscopeSummaryは時点snapshotで、実行時のSQL/remaining/guardを再照合する。

## 掲載値の意味と有限採否

下表の `productId` と `variantId` は各行を連結した `kiwa:productId:variantId` **完全ID**。各IDの完全object SHA、own本文、順序付きgallery、capture URL/SHAは上記候補ファイルの**同じ行**に固定する。実装manifestには採用49行のID・完全object SHA・raw label・全文SHA・原capture URL/SHA・product associationを展開し、候補ファイルbytes SHAも固定する。表の集合から外れたID、同名商品、同じラベルの別objectは採用しない。

| 判定 | productId | variantId（完全値） | 数・意味 |
|---|---|---|---|
| 採用候補 | 8711731151140 | 46971933917476, 46971933950244 | 2、5/6コード内BODY pair |
| 採用候補 | 8711731511588 | 46971935293732, 46971935326500 | 2、同上 |
| 採用候補 | 8711732134180 | 46971936932132, 46971936964900 | 2、同上 |
| 採用候補 | 8711731708196 | 46971935752484, 46971935785252 | 2、同上 |
| 採用候補 | 8711732756772 | 46971938996516, 46971939029284 | 2、同上 |
| 採用候補 | 9227452547364 | 48545636942116, 48545636974884, 48545637007652, 48545637040420, 48545637073188, 48545637105956, 48545637138724, 48545637171492, 48545637204260, 48545637237028, 48545637269796, 48545637302564, 48545637335332, 48545637368100, 48545637400868, 48545637433636, 48545637466404, 48545637499172, 48545637531940, 48545637564708, 48545637597476, 48545637630244, 48545637663012, 48545637695780, 48545637728548, 48545637761316, 48545637794084, 48545637826852, 48545637859620 | 29、文字/記号別BODY pair |
| 採用候補 | 8715217338660, 8715217240356, 8715216617764, 8715216519460, 8715216879908, 8715216781604, 8715217600804, 8715217469732, 8715217109284, 8715216978212 | 46983663747364, 46983663649060, 46983662928164, 46983662829860, 46983663190308, 46983663092004, 46983664009508, 46983663878436, 46983663419684, 46983663288612（位置対応） | 10、slash前BODY pair／slash後穴径 |
| 意味保留 | 8711727939876, 8711728103716 | 46971917533476, 46971917664548, 46971918090532, 46971918123300（位置対応、各商品2） | 4、ミラーボールscalar |
| 意味保留 | 8711733149988, 8711733281060, 8711733707044, 8711735836964 | 46971940077860, 46971940405540, 46971941683492, 46971951251748（位置対応） | 4、スクエアエンボス3／No.15667 1のscalar |

採用候補49件＝コード10＋文字29＋BODY/穴slash10。意味保留8件。これは**source意味のみ**の判定で、画像審査・販売guard・SQL重複照合後の登録可能確定数は0。

- コード10：raw labelは厳密に `5(約2×2mm)` 又は `6(約3×3mm)`。own全文には「表面にカットが施されています。素材は真鍮で重厚感があります。」と、別に「穴のサイズは5(約2×2mm)が約1mm、6(約3×3mm)が約1-2mmです。」がある。前者のvariantサイズpairを暫定全体BOX、後者の約1/1–2mmを穴の説明として分離する。色変更などの先行注意書きがある商品も、**各行の完全本文を照合したうえで**この2文を確認する。`5`/`6`はサイズコードでmm値ではない。コードとpairが同じ穴文中に引用されるため、BODYの実測・物理軸・穴位置の証明とは呼ばない。
- 文字29：raw labelは **当該variantに一致する** `B`〜`Z`、`&`、`#`、`ハート`、`スター` のいずれか＋`：約7×8mm`。own全文は「中央に横穴の開いたエポ付きのイニシャルビーズです。」、「穴のサイズは約1.6mm〜1.8mmです。」、「丸みのあるころんとしたフォルムのビーズ」をそれぞれ述べる。7×8は暫定全体BOX、1.6–1.8は穴。文字ラベルと写真のvariant対応を画像審査で個別確認し、共通captureを29variantに無条件転用しない。
- slash10：raw labelは `約11×9mm/φ約1.3mm`（シズク2）、`約11×10mm/φ約1.3mm`（ハート2）、`約14×10mm/φ約1.3mm`（ビーンズ2）、`約13×10mm/φ約1.0mm`（バロックNo.1 2）、`約14.5×7mm/φ約1.0mm`（No.2 2）。own全文がそれぞれトップホールのビーズ/ハート形/縦穴バロック形を述べ、No.1/2は「穴のサイズは約1mmです。」とも述べる。slash前の2値だけを暫定全体BOX、`φ`以降は穴の掲載値として原文保持し、BOX/geometry/connectionへ渡さない。本文中「線径0.6mm以上」は使用するピンの径で本体ではない。
- 意味保留8：raw label `約3mm`/`約4mm`（ミラーボール）、`約1.9mm`（スクエアエンボス）、`約2.5mm`（No.15667）はown本文が主に使用法、メッキ、販売/製造注意を述べ、**何の全体寸法かを明示しない**。商品名だけで外径/BODYと断定せず、この有限recipeでは登録0。穴寸法への読み替えもしない。後日、当該source自身の意味根拠が増えた場合のみ別審査する。

全採用候補のraw labelと全文の同時一致が必須。NFKC/空白除去は**固定raw照合後の解析のみ**。positive finite、各値≤40mm、1/40mm格子、`×`、`約`、`mm`、コード/文字/`φ`の位置を厳密に扱う。pair原第1値→暫定BOX幅、第2値→高さ。掲載軸・実測幅高さ・写真尺度・厚みは未確認。`diameterMm`は生成しない。商品名の「1本 約10cm/約47ヶ」「約24ヶ」等は販売長・数量であり、個体寸法、個体価格、画像尺度には使わない。価格は販売offerの原値のまま。穴/fit/線径/本文の±0.5mm許容差もBOX値へ合算しない。

## 最小実装境界

`src/server/categoryBoxNominal.ts` の現行一般category guardは `bead` をMIYUKI/TOHOの私有bindingだけで許す。そこへ無条件に `bead` を足さない。有限 `metal-bead-code-pair`、`metal-bead-initial-pair`、`metal-bead-body-pair-hole` の3 labelKindを**独立した定数binding表に載る49 IDだけ**許し、既存 `other/charm` と既存bead kindの判定・出力を変えない。bindingには候補file SHA、各完全object SHA、原raw label、全文SHA/完全本文、category=`bead`、順序付きtags（文字商品にある原文の `タルビーズ2階層` も修正しない）、own photo URL/SHA/productIdを含める。一般`draft.tags.includes('メタルビーズ')`、商品名prefix、caller指定bound、汎用`bead`許可で拡張しない。空tagはItaly27専用既存branchのまま。

登録workerは新recipe（例 `kiwa-own-photo-metal-bead-box-v1`）を明示dispatchし、既存承認済みcategory crop rendererのcrop→reviewed rotation→aspect contain/透明余白処理を共有する。専用wrapper/cache namespace/keyはrecipe version、原bytes SHA、own URL、crop整数座標、rotation/理由、暫定BOX、processed transform versionを含める。旧recipe/key/Asset bytesは変更しない。白背景の現行aspect guard **4:1** と最大40mmを維持し、mask/自動分離を拡張しない。単一個体を切り出せない連・集合写真や文字違い写真は品質保留。

`sourceCrop` はown gallery URL＋実原bytes SHAと一致するcaptureで、未回転decode座標、bounds、reviewer/time、単一個体・全外周・姿勢の理由を原画像ごとに記録する。加工後は別のimmutable review identity（加工bytes SHA、transform/key、BOX、crop/rotation、reviewer/time）で全外周、歪み、別個体混入、variant識別を確認する。原reviewを加工reviewへ流用しない。同じ原hashでも各source associationとvariant意味を全件照合し、同じcrop/rotation/BOX/transformかつ同一variant写真と確認できた場合だけ加工review再利用可。レビュー前の `sourceMeaningReviewed`/`originalReviewed`/`processedReviewed=false` を採用済みへ書き換えた扱いにしない。

## 実行ゲート・検証・承認境界

登録前に最小販売単位、廃番、既存quality hold、SQL/archivedを含むsourceDraftId重複、registry/workspace/manifest SHAを再照合し、一件の拒否を他件の成功に数えない。採用分も `bead`/原size label/原順序/unknown flagsを保持、穴・接続点は空、connectionReady=0、cloudWrites=0。既存Part/Asset/3Design/archive、全recipe/key/bytesをbaseline比較して保全する。Design実体が空なら非空Design保全の実証とは書かない。保存直後read-back、原/加工Asset API bytes SHA、実一覧、再実行追加0、統合時restart/read-backで確定する。

Negative checks：49以外のID、同ID別object/hash/本文/タグ/label/source URL/捕捉商品、8 scalarの紛れ込み、他のbead一般受入、コード5/6の穴値転用、文字とvariant不一致、slashの穴径をBOXへ転用、`φ`欠落・追加slash、販売10cm/個数/価格転用、適合径/線径転用、0/40超/格子外/3軸/x/範囲/単位欠落、未review原/加工、集合/混在/切れ写真、別cache衝突を拒否。Positive checks：5/6 pair、文字 `B` と `スター`、slash5値群、既存MIYUKI/TOHO/category/Italy27のspec/key/bytes不変。40mm境界は既存guard試験で維持を確認する。写真品質failはguard保留のままSQL書込0。

本契約はsource意味の有限判定のみ。実装、画像承認、SQL登録、Production/尺度/接続適合の承認ではない。影響は新しい有限bead経路と保存データ完全性に及ぶため、root実装・targeted/統合検証後に**一回の独立Sol reviewを要請**するのが妥当。review実model/effortはruntime証拠で確認し、名前だけでSol認定しない。この子agentへの委任では `gpt-6-sol` / `medium` が明示指定されたが、tool返答はtask_nameのみで実runtime model/effortは未確認のため、confirmed Sol設計とは表記しない。


## 実装・実測 checkpoint

2026-10-26。有限49の意味境界を維持し、独立 scripts/prepare-metal-bead-finite.mjs と専用cache/recipe/登録dispatchへ実装した。旧category selectorは不変。原22distinctとcrop49を目視、非文字20だけ加工別審査・登録、文字29は隣接片等により未採用、意味保留8を維持。独立review（gpt-6-sol/medium明示要求・runtime未確認）3指摘をroot修正し、JSON roundtrip実失敗の再現→optional undefined fieldを省略する修正も行った。対象22tests成功。初回1保存後のreadback比較停止から画像/旧review不変で回収、正常recovery19追加→初回実created19保存→正式rerun0、全20原高/medium/thumbnail API hash・一覧/readback・purchase/source・原PartAsset/archive/registry/全3Design保全。最終独立clean reviewなし。詳細 .ai/evidence/nominal-20261025-metal-bead-summary.json。
