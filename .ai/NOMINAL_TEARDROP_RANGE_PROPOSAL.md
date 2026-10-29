# ティアドロップ120件 — 掲載H/W範囲によるnominal BOX提案

2026-10-16。**PROPOSED / NOT APPROVED / NOT IMPLEMENTED / NOT REGISTERED**。設計支援は `gpt-6.1-sol / medium` を明示要求した単一bounded assignment。runtimeは実model/effort確認情報を返していないためconfirmed Sol reviewとは呼ばない。

## 有限入力と既存承認の解釈

`ALL_VARIANT_MAPPING_CONTRACT.md` の「掲載値、概寸範囲、配置の仮定を記録する」通常配置承認、および `nominalPlacement.ts:nominalDiameterRange` / `crystalTableNominal.ts` の範囲中点選択を設計上の先例とする。今回のH/Wはown variantラベルに明記され、本文13種はいずれもトップホールのハンドメイド・ガラスビーズを記述する。掲載本体範囲の軸別中点を**配置上の仮定として明示する**選択はこの承認内で推論できる。新しい非推論可能な商品判断や追加ユーザー許可は必要ない。ただし、この文書の作成自体を新recipeの採用・実装・写真採用と扱わず、rootが契約採用と実装を判断する。

有限inventoryは `.local/calibration/nominal/teardrop-range-candidate-manifest.json`。`remaining.json` のexact group `catalog:bead:ティアドロップビーズ` の120 IDだけを列挙。74商品、original46 / mini74、完全一致本文13種、tag配列3種、own gallery URL415。既存capture415/415、欠落0。ただしcapture存在は写真採用の証明ではない。registry全体原bytes SHA256、remaining原bytes SHA256、各original registry object全フィールド、object JSON SHA256、重要raw field SHA256、own gallery各URL・原bytes hash・capture record・商品associationを保存した。JSON object hashはUTF-8 `JSON.stringify(parsed original object)`、原文fieldはUTF-8原文字列を対象とし、原ファイルbytes hashと区別する。

入力を変更せず、variant ID/商品ID/SKU/name/sizeText/tags/本文全文/URL順序/全gallery associationを全件再照合する。グループ名・`includes('ティアドロップ')` だけでscopeを広げない。registry categoryと新Partはともに **bead**。既存category BOXのother/charm/range拒否を緩めず、新recipe `kiwa-teardrop-published-hw-range-box-v1` と独立dispatch/namespaceを設ける。

## サイズ規則

| 完全一致rawラベル | 件数 | 保存する掲載H/W mm | 暫定BOX width/height mm |
|---|---:|---|---|
| オリジナル(約H8-13×W8-11mm) | 46 | H[8,13], W[8,11] | 9.5 / 10.5 |
| ミニ(約H6-7×W7mm) | 74 | H[6,7], W[7,7] | 7 / 6.5 |

raw文字列の完全一致2値を有限tableへ対応付ける。汎用range regex、dash/x正規化、未知括弧/suffix削除は追加しない。全endpointをpositive finite・40mm以下・min<=max・1/40mm格子で確認。`widthMm=(Wmin+Wmax)/2`, `heightMm=(Hmin+Hmax)/2`。算術中点であり平均実測値/統計中央値を推定しない。両出力は既存1/40mm格子上。写真比率やillustration中の個体値で変更しない。

将来Part metadataへrawラベル、`publishedBodyHeightRangeMm`、`publishedBodyWidthRangeMm`（approximate=true、miniのWはpublished scalar由来の退化区間と明示）、`layoutSizeChoice='published-H-W-range-axis-midpoints-for-layout-only'`、source H→height/W→width、own identityと原文hashを保存。diameter/sphere/円輪郭へ転用しない。これは占有範囲の最大値保証・実物の外接幅高さ・範囲内全個体の安全クリアランス保証ではない。独立H/W中点が一つの実個体で同時に成立するとも主張しない。

一覧・編集・配置の表示要件: 「掲載の概寸範囲（H…、W…）の中点を暫定配置枠に使用しています。実寸・画像尺度・サイズ別の外観・掲載軸と写真の対応・穴径・接続位置は未確認です。」raw範囲と採用BOX値を確認できるようにする。`imageScaleVerified=false`, `variantAppearanceVerified=false`, `physicalWidthVerified=false`, `physicalHeightVerified=false`, `sizeAxisInterpretationVerified=false`, `connectionReady=false`。掲載H/Wラベルが存在する事実と写真/実物の軸検証は別。

## 写真・既存証拠の境界

既存 `.ai/evidence/teardrop-multiview-review.json` SHA256 **70b5433702b4550e44636c98663e8408b4a46bbe3747c8f445043d5d6da87814** は、掲載variant範囲と参考図の個体概寸・穴illustrationを分離する判断として再利用できる。内部のdimension image hash `8287fadf2adfb582ffaafc843ee1dd39beffa00ac7347854044e691e245a4c64` / hole image hash `862186d7c675a5d853e80999b6aec9110e85c77fc141007119ea22937d8fd81e` に限定する。この証拠は商品写真の採用crop/加工後reviewや120variantの物理校正を証明しない。図のfront/bottom/side値をH/W範囲の代わりにせず、穴の数値/形状をPartへ生成しない。

今回写真取得・download・OCR・decode・crop・加工・目視reviewは0。415 captureとown associationはinventory、photo acceptanceは全件 `NOT_DETERMINED_BY_THIS_INVENTORY`。既存の**同一source URL/bytes hash・整数crop・decode dimensions・姿勢/rotation・review identity** を束縛した原画像判断が見つかればその原判断だけを再利用できる。別商品へのassociationは各own商品で再確認する。同じ見た目/代表写真/同じfamilyだけの流用は禁止。既存加工後の目視判断は原hash/crop/rotation/BOX/加工versionがすべて同一のときだけ再利用できる。新しいBOXなら原判断は再利用可能でも加工後判断は必要。今回そのようなcrop採用証拠を新たに認定していない。

実装時は当該商品のgallery内からレビュー済みの正面投影の完全な単独個体を選ぶ。複数なら重なりなく分離可能で完全な一個体に限定し、未回転decode整数pixelのcropを明示する。原姿勢0°または明示clockwise90°と理由をsource別に保存。長い見かけ軸を自動でHとせず、top-holeを上にする向きも写真の目視判断としてのみ記録する。裏面/底面/側面/斜視、多投影比較図、穴図、切れ/接触/重なり/同定不明はこのrecipeへ採用しない。製品別の色混合・加工混合・ランダム配分を本文が記載する場合はその原文を保持し、variantと一個体の対応が未解決ならassort hold。既存assort/品質holdを解除しない。

既存reviewed crop抽出の順序・guardを維持し、aspect-contain＋透明余白でBOXへ収める。stretch/mirror/生成輪郭/穴補完/厚み推測をしない。透明/白いガラス本体や内部highlightを背景として消さず、外側背景のみを処理する。guard失敗を回避する閾値緩和はしない。原bytes/加工hashとtransform/crop/rotation/BOX/versionをAssetへ保持し、cache keyにも束縛する。写真が両サイズで共用でもサイズ別実外観確認済みとしない。

## 拒否・保全・受入証拠

- finite120外、入力hash/ID/SKU/category/tag配列/own本文/ラベル差分、他商品gallery、capture association/hash不一致、未知文法、追加単位/寸法、範囲逆転/非finite/格子外、穴径/販売単位からの補完は拒否。measurement抽出欄にある末尾11mm/7mmだけをBODY値と解釈しない。
- quality245（元85保持）、excluded310と既存holdは外部不変条件。このproposalは件数のlive SQL証明を行わず、解除も行わない。候補120は採用上限であり登録保証ではない。実行前に最新quality/exclusion/既登録集合と交差し、hold優先・既登録仕様差分は停止する。
- 47 strict Part、全既存Part/Asset/registry、design/archive、他recipe/cacheは不変。local immutable Asset/SQL既存single-worker lockとsourceDraftId重複検査を使う。Supabaseなし。穴/connection_points/through_holesは空。現時点の新worker/SQL書込/Parts/Asset生成は0。
- 実装時test: 2 raw label→exact endpoint/中点/軸とcategory bead、raw近似表記保持、mini W退化区間、wrong finiteID/own本文/SKU/tag/URL/category拒否、未知range/suffix/適合径拒否、穴接続空、既存category selectorのrange拒否不変。正面crop保持と非stretch/ガラス内部保持・guard拒否、cache分離、再実行追加0/中断再開を確認。
- 写真採用原/加工の全distinct目視記録後に登録。全追加PartのSQL read-back・own identity/range/中点/unknown flags/category/空接続、全新Asset original/full bytes hashとAPI bytes、一覧/編集/自由配置/保存/reloadの範囲中点と未確認表示を確認。既存Part/Asset/registry/design/archive baseline照合、統合境界でrestart/read-back、採用/品質hold/意味hold/既登録を排他的に集計する。実design0なら非空実design保全の実証とは呼ばない。

**現在のreadiness: 有限source inventoryと設計提案のみ。写真採用確定0、登録可能確定0、実装0、登録0、hold解除0。** 残る作業判断はrootによる提案採用、source別原/加工写真・assort/品質判定、必要な有限実装と上記検証。新しい非推論可能な商品/物理寸法判断が出た候補は理由付きholdとし、残りの通常nominal作業を止めない。
