# 千件 campaign の BODY bridge 設計契約

Date: 2026-10-27 JST. Status: **実装済み / 実登録検証46件 / 全件未完**。固定plan SHAと有限7,982 source範囲は変更なし。現在の実績と証拠は .ai/evidence/campaign001-body-summary.json と .ai/HANDOFF.md を参照。設計本文の境界は維持する。

## 目的と不変条件

単一の有限 source table bridge `kiwa-campaign-reviewed-body-box-v1` を追加する設計とする。source ごとに人が whole-product BODY の意味、原写真の対象・姿勢・crop、加工結果を実際に判定した行だけを `adopted` に進め、既存の thousand queue に渡す。色・形・カテゴリごとの helper/recipe は増やさない。category は `draft.category` をそのまま保持し、名前や tag から `bead` 等へ再分類しない。既存の全 recipe、仕様、キー、cache、画像バイト、凍結済み BODY table 139 件、natural 45 / pearl 78 / T-pin 103 件、既存 245 件と hold の挙動は変えない。特に旧 `body-table` 139 件の spec/key を移行・再生成しない。共通 bridge の実装には別の manifest、adapter、recipe 分岐を用意し、既存 `prepareCzechCrop` → `prepareBodyBox` と `prepareReviewedCached` は呼び出すだけで変更しない。既存 category-work は binding / per-source Asset の構造だけを参照し、`charm`/`other` 限定の旧 rule または旧 recipe を他カテゴリへ拡張しない。

## source-space と意味判定

入力は fixed plan の exact `draftId` のみ。登録時も同 plan・workspace・registry SHA・source full object SHA、description SHA、product/variant ID、SKU、category、全 tags、raw size label、URL、own-photo SHA/画素/所有 product 対応を再照合する。cohort は同一 description/category/tag/label grammar の**審査を整理する単位**であり、群に入っただけで個々の source は通らない。各 source に審査者・時刻・引用した本文の正確な部分文字列、whole-product BODY と判断した理由、商品/variant と写真の対応理由を保存する。引用は本文に存在することを機械検証し、意味判断そのものは reviewer が行う。`assertSemanticRule` 型の validator は署名・整合性・許容 grammar の確認だけで採用権限を持たない。

有限寸法の入口は scalar、無軸 2 値、`H×W`、`W×H` のみ。各値は正の 1/40 mm grid、各軸 40 mm 以下、比 4 以下、rotation 0。scalar は本文・商品表示から whole BODY の代表寸法と人が判断した時だけ暫定正方形配置枠とし、物理的な縦横実測は主張しない。`H×W` / `W×H` はラベルの軸順を厳密に解釈する。無軸 2 値は既存の承認に従い、原第1値→配置枠幅/第2値→配置枠高さとしてのみ明示的に採用できる。実幅/実高さや写真との軸対応は未確認を維持し、物理軸が判明したとは呼ばない。数値 grammar が通っても、原ラベルや商品名・本文が線径、内径、穴径、販売長、適合寸法、石座の対応石寸法、梱包寸法等を示せば BODY 寸法としては受けない。`other` grammar、40 mm 超、0/非有限値、grid 外、縦横比超、可撓物の販売長も pending / negative とする。空 tag は既存 Italy 27 の専用境界のみで、この bridge では拒否する。MIYUKI Delica 183 の BODY 意味は未承認のままであり、一般的な bead 名称・既存写真・寸法数字を根拠に一括通過させない。TOHO 等で既に失敗した同一 crop は再試行しない。外部 alpha / mask による救済は対象外。

## review と画像境界

entry は `sourceBinding`、source-specific 意味 rule、原画像 review、canonical spec、加工 review envelope、最終 disposition を束ねる。原画像 review は保存済み原 bytes の SHA と画素を確認した上で、**個別画像を目視**し、商品単体/複数個/金具/余白、対象 crop の未回転 decoded raster 整数座標、pose、variant 対応、採否理由を記す。772 distinct hash は再利用可能だが、異なる source/variant の対応判定を省略しない。既失敗の原 crop/加工 key は negative ledger で照合し、入力が同じなら再処理を拒否する。曖昧な対象や不適切な画像は source ごとに `pending` または `rejected` とし、捏造 crop、図、alpha、穴、接続点は作らない。

spec は新 recipe 名、source object / semantic rule / original review の hashes、full source provenance、category、raw label、reviewed width/height、layout-only の根拠、rotation 0、sourceCrop、未確認 flags を含む。原 hash と crop 座標で `prepareCzechCrop`、その出力で `prepareBodyBox` を実行し、`prepareReviewedCached` の新 namespace と新 spec/key で保存する。prepare は自動承認ではない。原と加工のそれぞれについて reviewer、時刻、理由、原 SHA、spec SHA、image key SHA、high/medium/thumbnail の実バイト SHA を記録し、加工目視が原目視より後であることを要求する。自動 trim/白背景処理が商品を消す・複数物体を残す場合は negative とし、同一失敗入力を繰り返さない。`original`, `high`, `medium`, `thumbnail` の表示結果をそれぞれ承認済み hash に照合する。

renderer cache key は画像再利用のためのキー、Asset key は source 固有の承認識別子と分ける。後者は新 recipe/version、renderer key、source binding SHA、意味 rule SHA、review envelope SHA を含める。共有画素であっても別 source の Asset 承認を流用しない。既存 category-work の `categoryWorkAssetKey` / `verifyCategoryWorkAsset` と同じ原理を新 adapter 内で実装し、旧キーの値や bytes は変更しない。`adopted` は意味・原・加工の全 review、現行販売許可/hold/SQL conflict、source と写真の hash 一致がそろった行だけ。`queue` は adopted exact ID だけを選ぶ。

## 保存・検証・再開

保存側の新 recipe 分岐は現行 single writer と 250 件上限/25 件 checkpoint を共用し、`save_part_successor` 前に plan・manifest・workspace・registry・sale policy・hold・既存 SQL source を再検証する。既存 SQL source は上書きせず、同一 source の再実行では保存済み Part/Asset/承認 hash を readback して冪等に扱う。payload は `draft.category`、source ID、full source URL・取得時刻、raw label、本文引用と意味 rule、価格・通貨・販売 unit/数量、original/processed review と hashes、未知 flags を `metadata.nominalPlacement` と source snapshot に保持する。price は source の値と purchase semantics をそのまま使い、欠落時に補わない。notes は暫定配置枠、画像尺度・variant 外観・実寸軸・穴・接続/適合は未確認と明示する。`connection_points=[]`、`through_holes=[]`、path なし、`connectionReady=false` を固定し、PartAssetDesign と既存の SQL/Asset/API 4 面の保存・readback・増分検証を通す。保存済み original/high/medium/thumbnail bytes、Part/Asset 紐付け、source snapshot、価格、category、未確認 flags、再実行 `created=0` を照合する。

再開時は fixed plan と row revision を基点に ledger の compare-and-swap を用い、source-specific 審査 evidence の hash を row に固定する。状態は `evidence_ready → semantic_reviewed → original_reviewed → processed_reviewed → adopted → queued → saved → verified` の順を飛ばさない。negative/pending は理由、source/crop/key/hash、審査者、時刻、次に必要な新証拠を保存し、campaign の 1,000 source 母数から消さない。失敗を全 job 停止へ広げず、次 source へ進む。ただし plan/source hash 変更、workspace 不一致、hold 侵害、既存 SQL conflict、manifest 改変、承認バイト不一致は当該保存を fail closed。job 完了は 1,000 source 全行に採否と保存/検証状態が記録された時だけであり、採用数・保存数・検証数・pending 数を別々に報告する。

## 実装時の最小検証契約

正例は異なる category の exact source で category 保全と `adopted → saved → verified`、同じ画素を共有する別 source の異なる Asset key、worker rerun `created=0` を確認する。負例は無軸ペアの raw 順序配置指定・物理軸未確認 flag の欠落、線/内/穴/販売長/適合の誤読、空 tag、Delica の未承認意味、40 mm/grid/aspect/rotation 違反、写真所有不一致、既失敗 crop の再試行、旧 139 spec/key の差異、加工承認前の保存を必ず拒否する。これらは本設計の acceptance であり、現時点の実装・テスト結果を表さない。
