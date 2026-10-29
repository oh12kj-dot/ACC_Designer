# other 明示 H/W 108 件の有限 BOX 契約

2026-10-25。**実装済み／102登録・検証済み／6未採用／全体は未完了**。本契約は `.local/setup/other-hw-finite-design-candidates.json`（SHA256 `10838872a673118d9d918d8eabe6a2bd8627a2f1625f0d19964cee5e7153a4e7`）の 108 draft / 108 product / 108 原写真を上限とする。候補の `sourceMeaningReviewed=false`、`originalPhotoReviewed=false`、`processedPhotoReviewed=false` は採用根拠ではない。依頼上の Sol/Medium 指定について、この作業環境から実際の model/effort を確認できないため confirmed Sol 設計とは表示しない。

## 決定と境界

`categoryBoxNominal.ts` の既存 `published-H-W-pair` / `published-W-H-pair` は `charm` 専用のまま維持する。`other` を許す条件変更、既存 recipe `kiwa-own-photo-category-box-v1` の再解釈、既存 key/version/cache/加工 bytes の変更をしない。実装時は **別の finite recipe と別 labelKind**（例 `kiwa-own-photo-other-hw-finite-v1`、`other-finite-H-W-pair` / `other-finite-W-H-pair`）を明示 dispatch する。既存の photo crop/resize 関数は共有できるが、専用の validator、image key version、cache namespace、transform version、processed 承認 record を設ける。旧 recipe の保存済み spec/key/Asset は byte-for-byte 不変。非 charm への一般的な H/W 文法解放を禁止する。

有限 binding は `draftId` をキーに **108 個の明示 record** とし、各 `{productId,variantId,category:'other',objectSha256,photoSha256,rawLabel,sourceUrl,photoUrl}` を候補から固定する。起動時に候補ファイル自体の上記 SHA、固定 registry SHA、workspace、全 draft の `SHA256(JSON.stringify(draft))`、捕捉済み原 bytes SHA、capture の product association と URL を再照合する。source の `name/SKU/tags/description/sizeText/imageUrls[0]` も own draft として照合し、登録済み `sourceDraftId`、minimum-sale group、obsolete/quality/live hold を再確認する。未列挙 ID、変更された object/photo/生 label、別 URL/variant は fail closed。候補ファイルを承認 record として転用しない。

生 label は完全一致で保持し、解析時のみ NFKC と空白除去を許す。許可文法は `^(約)?H(\d+(?:\.\d+)?)×W(\d+(?:\.\d+)?)mm$` と逆順 `W…×H…` のみ。値は正、finite、各 40 mm 以下、既存 1/40 mm 格子を満たす。元数値順・軸 token・approximate を証拠に残し、掲載 H→暫定 BOX height、掲載 W→暫定 BOX width とする。**掲載軸の文字を機械的に割り当てるだけ**で、実物の幅/高さ、写真との軸対応、サイズ別外観、穴位置・接続、厚み・奥行は未確認。`shapeReferenceKind` は own product photographed projection only、`sizeAxisInterpretationVerified=false`、`physicalWidthVerified=false`、`physicalHeightVerified=false`、`variantCutAppearanceVerified=false`、`connectionReady=false`、`connection_points=[]`、`through_holes=[]` を維持する。現候補は全 108 件が H×W であり、W×H は新候補を暗黙追加する権限ではない。

## source と写真の承認条件

登録前に root が各 own description **全文**と size/name/購入単位を読み、掲載 H/W が販売長、内径、適合径、穴/カン、別 component、部分寸法ではなく、採用する単一商品の暫定外形 BOX を示すと判断したものだけ `sourceMeaningReviewed=true` とする。rule は exact family、draft に存在する exact tag、own description の全文一致、意味を確認した BODY prefix、`bodyReviewed=true`、reviewer、時刻、根拠を持つ。注意書きだけ、材質だけ、使用法だけを BODY prefix にしない。既存の BODY 承認条件を弱めない。写真・図・OCR・related product から BODY 寸法を補完しない。迷うものは理由付き個別 hold とし、新設計または別証拠まで登録しない。

候補内の具体的な誤読例：ジョイントパーツ星 No.1 (`kiwa:8712030224676:46972818260260`) の `カンのサイズは約0.8×3mm` と `線径1.2mm以下`、カラビナ星 (`kiwa:8714020323620:46995505119524`) の開閉部分 `線径4mm以下` は BODY H/W ではない。ツイストバチカン アーチ (`kiwa:8712778875172:46974953095460`) の `16mm以上` は適合パーツ条件。タイタック キャッチ (`kiwa:8713116844324:46976796229924`) の `約1mmの通し穴` は穴径で、別売り針を BOX に含めない。レジンフレームの `カンのサイズは約1×4mm`、エッチングパーツの厚さ `約0.3mm` も BOX へ流用しない。キーホルダー回転カンの仕様変更告知や、トイ・ストーリー名でも draft.category=`other` のものは、名称やタグで自動分類・自動承認しない。キャッチ/回転カン/ケース/ポーチなどは写真で単体全体の境界が判然としない場合に hold する。

原写真は capture bytes を native decode して実ピクセル寸法と hash を確認し、**各 108 source の own gallery association** を検証する。原画像ごとに単一個体、全外周、付属物/別 component、pose、整数 crop `{left,top,width,height}`、座標規約 `unrotated-decoded-raster-integer-pixels`、rotation 0 のみと理由（90はcanonical後の承認差分を防ぐため拒否）を目視記録する。重なり、切れ、assort/別色、対象同定不能は hold。加工後も各採用 key の full/high/medium/thumbnail の bytes/hash と見た目を個別目視し、元写真の輪郭・姿勢・穴の見かけを失っていないことを reviewer/time/key 付きで承認する。capture status `pending_dimension_region_review`、生成済み cache、contact sheet の存在だけでは承認しない。写真を実寸の証拠にしない。原 bytes は original Asset として保存する。

## 実装・検証・採用手順

1. root が 108 全 object hash と写真 hash、現在の registry/remaining/SQL sourceDraftId、minimum-sale/obsolete/quality/live hold を照合し、既存全 Part/Asset、registry、全 design aggregate の baseline を保存する。live lock を奪わず、保留を解除しない。実 design が 0 件なら非空 design 保全を実証したとは書かない。
2. source 意味と原/加工写真の審査を完了した ID だけ exact finite manifest と別 review record に追加する。未承認・不一致・曖昧な ID は個別 hold。manifest hash、reviewer/time、source/photo/processed key を登録 evidence に束縛する。既存 category BOX manifest を自動生成・拡張しない。
3. 専用 recipe の準備/登録を既存 single-worker lock、atomic checkpoint、保存直後 SQL read-back で実行する。category は `other` を明示し、`bead/gem` fallback 禁止。旧 recipe と新 recipe の選択は `sourceDraftId` に対し排他的にし、既登録仕様不一致・重複・registry/workspace drift は停止。中断後は SQL spec/Asset を照合して回収し、再実行追加 0 を確認する。cloud writes 0。
4. **最低限の拒否試験**：108 外 ID、object/photo/rawLabel drift、category/tag/name/description/BODY prefix 不一致、review/processed 承認欠落、source-gallery association 不一致、live hold/minimum-sale/obsolete、H/W 逆転、単位/3軸/40超/格子外、適合径・穴径・販売長・部分寸法の BODY 転用を拒否する。旧 charm H/W と既存 other scalar/pair/特殊 kind の spec・recipe・image key・加工 bytes を golden snapshot と比較する。新採用品は empty connections、unknown flags、原/全加工 Asset hash と API bytes、一覧/保存/reload、全旧 Part/Asset/registry/design 不変を確認する。

実装後の証拠は .ai/evidence/nominal-20261025-other-hw-summary.json。4rendition SHAとfinalImageKeyを承認へ束縛し、登録前後と再実行/回収時にSQL Asset/API bytesを照合する。実装review指摘とroot修正/実登録による確認、14tests、実行上の逸脱も同まとめに保存。元設計が採用した境界は維持する。

この文書だけで写真採用を証明しない。108 は候補上限であり、採用件数は source と画像の個別審査後に決まる。登録成功は実 SQL read-back、写真承認、保全証拠でのみ判定する。
