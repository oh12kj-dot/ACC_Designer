# 全件使用可能登録の実行計画

2026-10-10更新。承認: 掲載サイズで配置し、画像尺度/外観/接続/穴の未確認を表示。厳密校正だけを進める旧方針を置き換える。

1. 27,046variantをfamily/形状/サイズ意味でまとめる。batch planは作業順のためであり同一形状証明ではない。
2. 公式本文/対応済み寸法から幅/高さ/径/全長を選ぶ。線径/内径/販売長/他部品寸法を区別。
3. familyごとにnominal recipeと写真処理を実装。近似尺度/輪郭/サイズ別外観の未確認をmetadataと画面へ明示。概寸範囲を消さない。
4. 色/サイズを一括登録。Assetを同一hash/掲載サイズで再利用。既存Part/デザインを変更しない。
5. read-back/重複なし/registry不変/画像hash/保存/reloadを確認。未知穴を作らず適合証明を発行しない。
6. 未登録と理由を残し次familyへ進む。通常配置のために全件の穴/実測/写真尺度証明を待たない。

使用可能10,838件＝寸法図47＋nominal10,791、残16,208件/1,090作業グループ。全件登録は未完了。

追加850件: ＃4120 82、＃4228 261、＃4320 154、＃4428 195、＃4480 158。掲載2値は原順序を暫定配置枠へ割り当て、写真は縦横比を保って透明余白へ収める。実幅/高さ・掲載値の軸・写真との対応は未確認と一覧/編集/配置に表示。diameterへ格納せず穴/接続は生成しない。NOMINAL_BODY_PAIR_CONTRACT.md、nominal/body-box-promotions.json参照。

次は実クリスタルと石座を分離し＃4162/＃4327/＃4470、チェコ形状family、全長/線径対応済みピンを連続処理する。＃5601斜視105、未知suffix2、tag欠落1を保留し本体寸法を捏造しない。

同一source hash/BOX比/回転で加工再利用し、既登録準備を省略。familyごとの再起動/全画像検証を繰り返さず統合時に確認。gallery/OCR完了済み、再実行不要。25件/終了時checkpoint。全件ETAは残件の確認作業量から判断する。

321unit/72ファイル、写真script8、typecheck、production build、関連20E2E（配置/保存/reload/未確認表示/一覧）成功。再起動後に全8,918nominal・6,126画像bytes/hash/API・一覧対応を検証。画像100.4秒/総296.5秒。E2Eは独立保存先のPC/mobile Chromium/WebKitであり実iPhone/cloudの証明ではない。 証拠evidence/nominal-body-box-verification.json。

アクリルBOXは44family154件。今回横向きリボン2family10件・動物4family7件、計17件を追加。原13写真と全distinct加工画像を目視、source別に明示clockwise90と配置理由を記録。写真回転と掲載pairの物理軸対応は未確認。legacy137Part/spec/cacheは不変、明示branchのみv2加工key/transformにsource URL・姿勢・理由・review identityを保存。全154Partのown商品/variant/SKU/本文/gallery/hash/crop/BOX/category bead/未知flags、追加17Asset API bytes/full originalと明示姿勢provenance、既存Part/registry/デザイン表不変、再実行追加0を確認。使用可能10,838＝47strict＋10,791nominal、残16,208。nominal画像7,743。340unit/75ファイル（maxWorkers4）・19targeted・crop6・typecheck・明示姿勢4E2E成功。実workspace再起動後read-back成功（204.7秒、全154アクリルPart/新17Asset APIを照合）。nominal-acrylic-orientation-integration.json参照。evidence/nominal-acrylic-ninth-{registration,image-review,verification}.json参照。
