# 残件 7,934 の代替 own 写真・公式 BODY 図の有限設計契約

2026-10-27追記：ユーザーが「合格基準を維持して処理方法を改善する」と明示承認したため、新規・未加工別写真の方法制限だけは [NOMINAL_NEW_INPUT_CUTOUT_CONTRACT.md](NOMINAL_NEW_INPUT_CUTOUT_CONTRACT.md) に置き換える。以下の旧 renderer 固定・新mask/閾値禁止は旧 lane に維持するが、新しい finite seeded-GrabCut lane には適用しない。寸法/原・加工審査/全旧hold/販売/退避/既知失敗/既登録画像保全は引き続き必須。

2026-10-27 JST。**設計のみ。候補・採用・登録を混同しない。** 対象は現時点の local SQL で未登録と照合された exact 7,934 `sourceDraftId` と、凍結済み 7,982-source plan に属する当該 ID の交差集合。再開前に SQL、plan、registry、workspace と後記 inventory hash を照合し、集合が変われば再計算または停止する。旧 plan、ledger、登録済 Part/Asset/Design/archive を書き換えない。目的は、最初の写真で失敗した source について、**既に保存済みの同一商品 gallery の別原写真**と、既存の公式図・OCR を、新たな審査候補として扱うこと。千件単位のキューを維持するが、千件採用や完了は保証しない。参照写真カードへの退避は対象外。写真付き nominal BODY 配置を要求する。

## 現況と着手判断

- live SQL で active 使用可能 12,132、残 7,934。旧九経路の selector に合う残件は 11、販売・写真失敗 guard をすべて通るものは 0（`.ai/evidence/remaining-existing-routes-20261027-v2.json`）。したがって旧経路を繰り返すだけでは今回の目標に届かない。
- `.ai/evidence/remaining-alternate-evidence-20261027.json`（明細 SHA256 `f329cd36a02ecf17de828f3767f9e27a9cb5224484e5b2da9b5a12b173f6ad88`）では、最初の写真と**異なる保存済み原 hash**を持つ source が 7,569、異なる代替原 hash は 8,412。数値 OCR の提案がある source は 2,723、そのうち inventory 時点で restriction がないものは 2,085。元 bytes は照合済みだが、source/BODY/写真承認はすべて 0、画像加工 0、SQL 書込 0。gallery/OCR 再取得も 0。これらは重なる集合であり、採用可能件数ではない。
- 新実装前に、inventory から **同じ寸法意味・画像 pose・購入意味**を持つ最大の exact source 群を一つ選び、代表の異なる原 hash を原寸で観察する。own gallery の別 hash、whole BODY 寸法根拠、crop/透過品質、販売許可が揃う source が一定のまとまりを作らなければ、この lane の renderer/worker を作らず、理由別 hold を保存する。URL 数や OCR 文字数だけを規模の根拠にしない。

**次の有限観察**: 数値 OCR の単一画像最大群は 32 source の outdoor cord 関連図だが、表示はコードキャップ 3/6 mm 等の適合・部品情報で、コード本体の whole BODY 寸法を示した証拠ではない。28 source の oval jump ring 図も線径・内径・複数サイズ混在であり、OCR の大きな群をそのまま採用しない。代替写真を実見する最初の候補は、restriction なし・共通 own description の **KYOTO OPAL 21 source / 21 product / 31 代替原 hash 群**（`.local/setup/remaining-alternate-evidence-20261027.json` の `category=pearl`、`descriptionSha256=49033a05a847666504c2b6b168a30b84470e59e83e701fe2791754c8f1ca5778` の交差）とする。oval `約8×6mm` と round `約6mm` などの形・label は混在するため、形別に分けて寸法意味と pose を審査する。まず各 source の raw label が完成粒の外周を指すかを own 本文・公式図の native 表示で審査し、保存済み別原 hash のうち一個体の全外周・色・サイズが正確に対応するものを探す。群の 21 は審査候補数で、承認数ではない。そこで有効なまとまりが得られなければ、原画像共有の大きさだけを理由に実装へ進めない。

## 固定 source と二重 binding

凍結 plan の `sourceBinding` は `sourceObjectSha256`、`descriptionSha256`、product/variant/SKU/category、raw label、**最初の** `photoUrl/photoSha256/width/height` を含む。既存 `registration-work.mjs` の `assertReviewEnvelope` もこの最初の hash を要求する。従って既存 row を代替 URL へ上書きしたり、旧承認を流用したりしない。新しい sidecar row を exact ID と旧 plan/job/ledger row revision に結び、`frozenFirstPhotoBindingSha256` と `sourceObjectSha256` を固定する。さらに `alternatePhotoBinding` に gallery URL、final URL、原 bytes SHA、decoded width/height、capture timestamp、product association、draft `imageUrls` 内の位置、variant/色/finish 対応審査を記録する。別 hash は本当に別の原 bytes として照合する。URL だけ異なり hash が同じなら同一失敗入力として扱う。

sidecar は現行 cohort の有限 manifest とし、`candidate → source_reviewed → original_reviewed → processed_reviewed → adopted → queued → saved → verified` を revision/CAS で進める。既存 ledger の immutable fields、review/time/spec/key/cache と保存済み state は動かさない。新経路の `adopted` を旧 ledger の `adopted` と偽装しない。旧 queue からは新 recipe の exact dispatch だけを追加し、同一 source の旧・新経路二重保存を SQL の archived 含む全 source 検索で拒否する。既存 hold 行は新候補があっても hold のまま。

## BODY 寸法証拠

OCR は候補抽出と図・本文の位置指定に限り、値・軸・意味を自動承認しない。各 source の own description/生 size label、保存済み公式図の native bytes を人が読み、**完成商品全体の外周**を表す scalar/無軸 pair/H×W/W×H または明示された図の whole-body 軸だけを採用する。図は当該 product gallery の URL/hash、図中の型番・サイズ・variant 対応、測定端点、軸方向を記録する。別 variant の図、隣接商品の値、図中の wire/inner/hole/fit/石座/販売長/部分寸法を転用しない。図の寸法が写真の尺度・物理軸・色やサイズ別外観を証明したとは扱わない。

旧 BODY bridge の 40 mm 以下、比 4 以下、正で有限、1/40 mm grid、rotation 0 と原順序の意味を維持する。無軸 pair は原第1値→暫定幅・第2値→暫定高さ、scalar は暫定正方形。明示 H/W または図の whole-body 端点を根拠にした時だけ、その軸を保存する。実測・写真軸・画像尺度が未検証なら unknown flag を維持する。wire/inner/hole/fit/販売量、部分組立体、用途説明、OCR の推測補完しかない source は個別 hold。空 tag の既存 Italy 27 境界、MIYUKI Delica 未承認意味、TOHO 16 と品質 245 以上の保留を拡張・解除しない。

## 原写真、crop、加工の審査

候補画像は保存済み own gallery record/原 bytes を再読する。外部画像・gallery 再取得・OCR 再実行・写真生成・新 mask/閾値/alpha 救済はしない。原寸目視で単独個体、全外周（カン等を含む）、正面または寸法に矛盾しない pose、重なり/切れなし、当該 variant の色・形・finish 対応を確認する。共有画像の pixel review は hash/crop/pose が一致する範囲で再利用できるが、各 source の対応審査は個別に残す。複数個体からの選択は完全に分離した一個体を手動の未回転整数 crop で指定できる時だけ。既知失敗 crop の同一原 hash・矩形・処理入力は旧 negative ledger と突合し再試行しない。別原 hash でも断片・支持台・輪郭切れなら不採用。

既存 `prepareCzechCrop` → `prepareBodyBox` / `prepareReviewedCached` の**処理関数を変更せず**、新 recipe/version と cache namespace で新しい spec/key を作る。旧 recipe・旧出力 bytes は不変。spec は両 binding、source 全文 hash、寸法引用と図 hash、native review、crop/pose、BOX、unknown flags を含む。原と加工の review は別時刻・別判定とする。processed review は `original/high/medium/thumbnail` 四つの実 bytes SHA と表示結果を確認し、原 review・意味 review より後に承認する。cache hit も spec/key/四 bytes を照合する。renderer key は同一 pixel 処理の再利用に限り、source 固有 Asset key は両 binding、rule、review envelope hash を含める。異なる source が同じ pixel を使っても Asset 承認を共有しない。

## 保存、有限 dispatch、検証

実装する場合は固定 plan の exact ID と新 manifest の `adopted` 行だけを専用 recipe へ dispatch する。旧九 selector を一般化せず、13件程度の小 family ごとに recipe を増やさない。worker は既存 single writer、内部 250 以下、25 件 checkpoint、atomic resume を使う。各 commit 直前に plan/ledger/registry/workspace/source full object/選択 capture/図/manifest/negative ledger の hash、販売最小単位・廃番・quality/archive・SQL 重複を再照合する。失敗は理由別 hold とし次 source へ進めるが、全体 provenance 変更や既存保存物の不一致は停止する。価格・通貨・購入 unit/数量・category/tag は own source の値を保持し、欠落を補わない。`connection_points=[]`、`through_holes=[]`、`connectionReady=false`、未確認の実軸・尺度・variant 外観を保存表示する。

保存した行は Part、source snapshot、source 固有 Asset と四画像の API bytes、一覧、archive 含む重複、全既存 Part/Asset/Design/registry 保全を read-back する。中断回収は同じ recipe/spec/evidence/Asset 四 bytes の完全一致だけ。再実行 `created=0` を要求し、登録済・採用済・画像審査済・意味審査済・hold を排他的に集計する。targeted 負例は旧最初の binding 改変、別 product/variant gallery、同 hash URL 替え、旧失敗 crop、部分寸法/誤軸、OCR だけの値、加工未承認、旧 recipe key 差異、archived source、販売/hold 変更、cache bytes 改変。実保存の後に restart/read-back と代表の一覧・配置・保存/reload を確認する。これらの検証が揃うまでは使用可能件数へ算入しない。

