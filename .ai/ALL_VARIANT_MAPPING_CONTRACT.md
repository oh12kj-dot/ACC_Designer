# 全件対応・端末登録 — 現行契約

2026-10-25 current policy: user explicitly resumed general registration through completion. Automation acc-designer ACTIVE. Minimum-sale/obsolete/quality rules remain mandatory; all27,046 sources preserved. Current SQL active11,457; placement target20,066 / remaining8,609. Historical pause/count statements below are dated evidence, not current status. Latest HANDOFF and placement-scope.json govern execution.

更新2026-10-13。固定registry27,046variant/13,045商品。ユーザーは掲載サイズで通常配置し、未確認を表示する方式を承認済み。

## 使用可能と情報の確度

- 商品/variant/SKU/掲載サイズ/本文/全画像/原文hashを対応付ける。
- 通常配置は公式掲載サイズを根拠にしたnominal Partでよい。厳密な尺度校正は必須条件ではない。掲載値、概寸範囲、配置の仮定を記録する。
- 画像加工・仮輪郭・サイズ別外観・接続位置・穴径の未確認を内部に保持し、一覧/編集/配置画面で表示する。nominalを校正済み、接続適合確認済み、実測精度確認済みと呼ばない。
- サイズ別写真が未検証ならその外観は未確認と表示。family形状を近似するときは加工を記録する。
- 同じ一覧を使い、通常配置と厳密な校正のために別カタログを選ばせない。
- 根拠のない穴・接続点を生成しない。接続に定義が必要でも自由配置はその確認を待たない。
- 内径/線径/石幅/販売長/他部品の適合径を本体幅・高さと混同しない。意味が不明な値は保留、未確認を公式掲載なしとしない。

## 保存と保全

固定registry不変、nominal recipe/promotionsは別manifest。既存47寸法図PartのID/証拠とユーザーデザインを保持。local SQL/immutable Asset/RPCを使いsourceDraftId重複検査、再実行/read-back/restartを確認。既存Partの意味・画像・穴を自動置換しない。Supabaseを使用しない。

family単位で写真準備をまとめ同一hash/掲載径のAssetを再利用。原bytes/hash/当該商品のgallery associationを確認。gallery57,345URL/OCR29,908画像は完了済みで再実行不要。OCRは候補のみ。

## 現在

使用可能16,679件＝寸法図47＋nominal16,632、残10,367件。全件未完了。 従来寸法部分照合2,899件は保持。接続ready0、cloud書込0。

内訳: ＃5810 774、正面軸1,092、概寸径範囲626、銅玉/コットン丸68、樹脂パール丸679、追加球状324、PP/SS表3,278、＃5000/＃5328配置枠1,157（315/842）、チェコ丸玉70、追加30family配置枠1,780。

追加850件: ＃4120 82、＃4228 261、＃4320 154、＃4428 195、＃4480 158。掲載2値は原順序を暫定配置枠へ割り当て、写真は縦横比を保って透明余白へ収める。実幅/高さ・掲載値の軸・写真との対応は未確認と一覧/編集/配置に表示。diameterへ格納せず穴/接続は生成しない。NOMINAL_BODY_PAIR_CONTRACT.md、nominal/body-box-promotions.json参照。

321unit/72ファイル、写真script8、typecheck、production build、関連20E2E（配置/保存/reload/未確認表示/一覧）成功。再起動後に全8,918nominal・6,126画像bytes/hash/API・一覧対応を検証。画像100.4秒/総296.5秒。E2Eは独立保存先のPC/mobile Chromium/WebKitであり実iPhone/cloudの証明ではない。

既存8,148Part/registry/デザイン表不変、再実行追加0。開始時実デザイン0のため非空実デザイン保全の実証ではない。保留108件の理由はplanへ保持。正資料: mapping/{index,summary,promotions}.json、nominal/{plan,promotions,verification,remaining,crystal-table-promotions,body-size-promotions,round-bead-promotions,body-box-promotions}.json、実SQL、evidence/nominal-body-box-verification.json。各familyの判断は対応するNOMINAL_*_CONTRACTと写真review証拠を参照。

アクリルBOXは44family154件。今回横向きリボン2family10件・動物4family7件、計17件を追加。原13写真と全distinct加工画像を目視、source別に明示clockwise90と配置理由を記録。写真回転と掲載pairの物理軸対応は未確認。legacy137Part/spec/cacheは不変、明示branchのみv2加工key/transformにsource URL・姿勢・理由・review identityを保存。全154Partのown商品/variant/SKU/本文/gallery/hash/crop/BOX/category bead/未知flags、追加17Asset API bytes/full originalと明示姿勢provenance、既存Part/registry/デザイン表不変、再実行追加0を確認。使用可能10,838＝47strict＋10,791nominal、残16,208。nominal画像7,743。340unit/75ファイル（maxWorkers4）・19targeted・crop6・typecheck・明示姿勢4E2E成功。実workspace再起動後read-back成功（204.7秒、全154アクリルPart/新17Asset APIを照合）。nominal-acrylic-orientation-integration.json参照。evidence/nominal-acrylic-ninth-{registration,image-review,verification}.json参照。

最新category BOX5841件（通常recipe5814＝charm1335/other4479、空tag27）。222〜223で8件を登録検証（国産キャストハート/菱形2、plain/stardust丸プレート4、石付きstick2）。own全文89行/原13distinct・採用加工8distinctを審査。全モチーフ外周/原ガラス/見える下カン・plate縁を保持、別post/catch側面を分離。厚さ0.8/裏カン0.8×4.5・0.7×3.5とBODY値を分離し、後方深さ/物理軸/サイズ別外観は未確認。223丸stick1はguard保留で品質245/解除0/元85・213隔離2保全。221magnetclasp1、224hoopconverter2、225reelkey1は突出部含む全体寸法が未確定、ribbon76は幅/販売長から全体BOXを生成せず、計80を有限意味保留。これら保留は登録0。全採用画像view完了→モデル判定→別tool commit、初回verification保存→再実行0→read-back/新原高hash/実一覧/空aggregate/全既存Part・Asset・registry/design/archive保全、cloudWrites0。nominal-category-twohundred{twentysecond,twentythird}-*とcategory-{magnet-clasp-whole-assembly-size,hoop-converter-whole-assembly-size,reel-key-whole-assembly-size,grosgrain-organza-stretch-width-sale}-holds.json参照。

最新source審査83件（softfit24/デザインpin33/内径pipe17/角curvepipe9、全文31種）は部分寸法/内径/ピン線径・全体外形未確定として有限保留。softfit原3distinctを目視、加工0/SQL書込0/品質245不変/解除0。旧ROUND写真待ち3は既存quality holdと照合し再加工しない。nominal-20261015-softfit-pin-pipe-source-review.json参照。

ティアドロップ有限120/74商品はNOMINAL_TEARDROP_RANGE_CONTRACT.mdを採用（実装・ローカル検証済み/登録2/採用済み未登録13、ユーザー指示で登録停止）。H/W掲載範囲の算術中点W9.5/H10.5またはW7/H6.5を暫定BOXに使用する独立recipe。bead保持/原rangeと未確認表示/他recipe range拒否維持。manifest SHA256 3ef7c5db121ae73f3bd628fc6c3a8a682f703c2e27f7194975233707f3d48976、own全object/hash/残件/品質・除外非該当/archived含む既存source重複0を照合。既存capture415URLは写真採用証明ではなく、multiview図の再OCR/個体値転用なし。nominal-teardrop-range-adoption.json参照。
