# 新規・未加工の代替原写真だけに適用する BODY 背景除去契約

2026-10-27 JST。設計契約。実装、画像加工、画像採用、SQL 書込はこの文書では行わない。対象は `.ai/BULK_CUTOUT_METHOD_CHANGE_PROPOSAL.md` で承認された**処理方法の変更**だけであり、寸法・写真・販売・保存の合格基準を変えない。`.ai/NOMINAL_REMAINING_ALTERNATE_EVIDENCE_CONTRACT.md` の sidecar、own 写真、審査、single writer 境界を引き継ぐ。

## 目的と対象

- 固定 7,982-source plan の現時点の残 7,934 ID と、保存済み own gallery にある**最初の写真と bytes SHA256 が異なる未加工の別原写真**の交差だけを候補にする。最初の有限 manifest は最大 1,000 source。manifest 登録、加工、採用、保存を別件数として扱う。再開時には plan、local SQL、registry、workspace、gallery bytes と inventory hash を再照合する。
- 背景に残る淡い灰色、影、外枠を取り除くため、**原寸 crop 上の alpha のみ**を計算する。原 RGB の生成、描き足し、補完、色補正、生成モデル、外部送信を行わない。新しい閾値と背景モデルはこの lane のみ許可された。既存の `prepareBodyBox`、`prepareCzechCrop`、旧 `prepareReviewedCached` 呼出、旧 small23/32 の外側 alpha と保護 ROI、旧 recipe・cache・key・prepared bytes・reviewer/time は編集しない。
- この文書は共通の cutout subsystem 一つを定義する。商品 family ごとに処理器を増やさない。完成 BODY の own 意味、写真 pose、購入意味が揃う群が得られなければ、renderer/worker を増やさず理由別 hold とする。

## 入力と境界

新 sidecar row は `draftId`、plan/job/旧 ledger row revision、`frozenFirstPhotoBindingSha256`、source 全 object/description SHA256、own semantic rule と寸法引用・公式図 hash、`alternatePhotoBinding`、審査済み原寸整数 crop、審査済み protected foreground ROI、処理パラメータ版を含む。`alternatePhotoBinding` は gallery URL/final URL、原 bytes SHA256、decoded 幅・高さ、capture timestamp、`imageUrls` index、product/variant/SKU/色/finish の個別対応審査を固定する。gallery URL だけ違い原 hash が同じ入力は候補にしない。crop は一個体が完全分離し、未回転で四辺が原画像内に収まる場合に限る。原写真は全輪郭、穴、カン、先端を原寸で確認する。

各 source の BODY 値は own 本文・生 label・既保存の公式図の native 表示で人が完成商品全体の値と確認する。OCR は候補検索のみ。旧 bridge と同じ正・有限・40 mm 以下・1/40 mm grid・縦横比 4 以下、rotation 0 を守る。無軸 pair は第 1 値を暫定幅、第 2 値を暫定高さ、scalar は暫定正方形とする。明示 H/W または審査済み whole-body 図以外から軸を決めない。実物軸・画像尺度・variant 外観は確認されるまで `false`、接続配列は空、`connectionReady=false` とする。wire、inner、hole、fit、販売長、部分寸法、別 variant の図、未確認 OCR は拒否する。実寸が不明な写真カードへの退避は行わない。

旧 hold、販売最小単位/廃番、quality 245 以上、Italy 27 の空 tag、MIYUKI Delica、TOHO 16、archived を含む既登録 source の境界は維持する。候補があるだけで hold を解除しない。価格、通貨、数量、購入 unit、category、tag は own source を保持し、欠落を推測補完しない。

## 共通 cutout v2: 原寸の seed 指定 GrabCut

新関数 `prepareNominalNewInputCutout(originalBytes, spec)` を別ファイルに置き、新 recipe/version と専用 cache namespace からのみ呼ぶ。現在の未公開 `nominal-new-input-neutral-background-v1` の tile/flood 実装はこの新入力 lane 内で置き換え、旧 BODY renderer と旧 recipe/cache/bytes は変えない。`sharp` で単一フレーム JPEG/PNG/WebP、最大 16,777,216 pixel、寸法、原 SHA を検査してから、審査済み未回転整数 crop を原寸 RGB(A) として読む。入力に既存 alpha がある場合はその透明領域だけを既知背景として扱い、半透明の被写体候補は自動変更せず拒否する。

1. 原寸 crop に完成個体を全て含み、他個体・定規・支持台・別片を含まない**緩い object ROI** と、確実に個体の不透明な内部だけにある foreground core を審査して固定する。これは手描きの正確な外形 contour ではなく、共通形式の少数点 polygon/矩形 seed である。ROI 外を確定背景、core を確定前景、ROI 内の残りを推定前景として初期化する。原 alpha=0 は確定背景とし、core/ROI と矛盾すれば拒否する。ROI の余白には背景を残し、ROI/core が crop 境界に接する、core が ROI 外、個体の突起・穴・細線が ROI 外、ROI 内に別個体がある、core に背景が混ざる場合は拒否する。ROI と core の座標、原 hash、crop、審査者・時刻を sidecar に固定する。
2. `cv2.grabCut` の mask 初期化モードで RGB 原寸 crop のみを分割する。mask class は ROI 外=`GC_BGD`、core=`GC_FGD`、ROI 内の残り=`GC_PR_FGD`、必要なら審査済みの明確な背景領域=`GC_BGD` とし、被写体上の点を背景 seed にしない。定規や離れた pin が ROI 外にある場合、その領域を確定背景にできる。画像ごとの色閾値、family recipe、精密 contour 描画は加えない。新 `algorithmVersion` は `nominal-new-input-seeded-grabcut-v2` とし、OpenCV の入力は RGB→BGR の明示変換、mask 座標は左上原点・pixel center 判定、RNG seed=0、thread 数=1、反復回数=5、`GC_INIT_WITH_MASK` に固定する。Node からローカル Python 3.10 worker に原寸 RGB と 4-class seed mask を渡し、同一寸法の class mask だけを受け取る。worker は RGB を描画・保存しない。Python/cv2/NumPy と実行バイナリの version・SHA256 を実装時に測って固定し、実行時に照合する。異なる環境で同一結果を仮定せず、同一環境の独立二回実行で native mask/出力 SHA256 が一致しなければ拒否する。外部送信・追加 install は行わない。
3. 確定背景は常に alpha=0、確定前景は常に alpha=255 とし、GrabCut の推定前景 class のみ alpha=255、推定背景 class は alpha=0 にする。原 alpha が 0 の画素は 0 のまま。残る foreground が一つの審査済み個体で、core がその成分に含まれ、ROI/crop 境界に触れず、外部断片・残留背景・消えた細線・穴の塗り潰しがないことを原寸で検査する。v2 の機械的下限は core 9 pixel、foreground は crop の 1% 以上 80% 以下、foreground は 8 連結で core を含む一成分、ROI 外 alpha=0、crop 四辺 alpha=0 とする。これらは目視を代替しない。閉じた穴や反射・透明・白素材などで境界が判別できなければ拒否する。antialias が必要なら別 version と根拠・審査を要し、v2 の alpha は二値とする。
4. 原寸 RGBA の RGB 三 channel は入力から読んだ同位置の値と完全一致を検査する。alpha だけを変更し、透明画素の RGB も書き換えない。審査済み BODY frame への配置と thumbnail は既存と同じ contain/transparent padding、canvas 算式を使うが、新しい加工結果から作り、`high` と `medium` が同一 bytes になる契約を維持する。resample による通常の RGB 補間は transform に明記し、原寸 cutout の RGB 不変検査と区別する。出力は `originalMime, high, medium, thumbnail, width, height, mmPerPx, transform`。元写真 bytes は `original` として別途保持する。

この方式は自動採用器ではない。誤消去と背景残りの双方を原画像と加工結果の原寸比較で見つけ、曖昧なら reject/hold とする。全素材に成功すると仮定しない。seed・反復回数・その他パラメータを source ごとに動かす場合は新しい明示的 algorithm version と審査を要し、失敗入力の再試行を許可する根拠にはしない。

## 失敗入力、spec、cache、承認

- 処理前に旧 negative ledger の **原 hash 単体、原 hash + crop + rotation、原 hash + crop + BODY frame/BOX** と、新 ledger の同等署名を照合する。旧 `campaignBodyInputSignature` は renderer version を含み、新 version では一致しないため、その文字列だけの比較では不足する。旧 `campaignBodyCropSignature` と旧失敗 entry の元情報も使い、hash/crop/BOX を version 非依存の canonical signature に正規化する。旧 negative の crop/BOX 情報を復元できない entry は自動移行せず対象 source を hold にする。原 hash が違う代替写真でも断片、支持台、輪郭欠損を審査で拒否する。
- spec は両写真 binding、semantic rule、寸法引用・図 hash、source と原写真の個別審査、crop/ROI/core/追加確定背景 seed 座標、GrabCut 版・固定パラメータ・runtime/binary hash、BOX と unknown flags を含む。`specSha256` は canonical spec 全体を固定する。renderer pixel key は `algorithmVersion + alternate original SHA + crop + seed 座標 + 固定パラメータ + runtime/binary hash + rotation 0 + BODY frame` に限定する。`prepareReviewedCached` は source hash と key/binding、保存 payload・三加工 bytes を検査できるので、新専用 cache root と新 validate/prepare/key を渡して再利用する。cache hit でも元写真 SHA と processed approval の四 hash を再照合する。
- 旧 `assertReviewEnvelope` と `nominalCampaignBody` は主写真 binding を前提とするため、代替写真を主写真欄へ上書きして通さない。新 validator/entry/transform/asset key は sidecar の両 binding と旧 immutable plan を照合し、source 固有 Asset key に `sourceBindingSha256 + alternatePhotoBindingSha256 + ruleSha256 + reviewEnvelopeSha256 + rendererKeySha256` を含める。同じ pixels を異なる source が使えても Asset と承認は共有しない。
- `candidate → source_reviewed → original_reviewed → processed_reviewed → adopted → queued → saved → verified` を sidecar revision/CAS で進める。原写真 review と加工 review は別時刻・別判定。加工 review は元画像、high、medium、thumbnail の実 bytes SHA256 と原寸表示を照合し、輪郭、穴、色、カン、先端、灰色外枠、影、支持台、断片を確認する。未審査・hash 不一致・時刻逆転・cache bytes 変更は採用不可。旧 ledger の adopted と偽装しない。

## 実装と受入ゲート

1. 有限 manifest と version 非依存 negative 正規化器を作り、旧失敗入力と hold/販売/登録済み source を加工前に排除する。異なる原 hash でも own gallery/variant 対応を各 source で確認する。
2. 上記単一 cutout 関数、新 bridge validator/key/cache、sidecar 状態遷移を実装する。旧コードと旧 bytes は触れない。positive は灰色背景・影・ROI 外の暗い定規/別片がある別原写真、negative は白素材、反射金属、半透明、穴、細線、黒背景、ROI/core の誤指定、隣接個体、別商品、旧失敗 hash/crop/BOX を含める。原寸 RGB 不変、確定背景/core 保護、再実行 bytes 一致、曖昧な境界の拒否、原/加工審査順序と四 bytes hash を検証する。
3. 未加工の有限群で実測し、各 source の原寸目視と新加工四種の目視を完了した行のみ `adopted` にする。加工成功率と処理量、理由別 rejection を記録する。基準未達なら投入せず、同一失敗入力を閾値変更だけで反復しない。重要なデータ整合性について一度だけ独立 review を行う。
4. 保存に進む場合、既存 single writer に新 recipe の exact dispatch のみ追加する。250 以下 chunk、25 件 checkpoint、commit 直前の plan/ledger/registry/workspace/原・図/manifest/negative hash と販売・hold・archived 含む重複確認を維持する。保存後は Part、snapshot、Asset、四画像 API bytes、既存 Part/Asset/全 Design/registry、再実行 `created=0`、restart/read-back を確認する。確認完了までは使用可能件数へ算入しない。

**最初の観察候補:** 青い bear SHA256 `7b2f589b90fc4e2f968da16c89a6b8dba18fedf1e9e0f76c1a7466df00fb460e` は一度 `NEW_CUTOUT_CONTOUR_AMBIGUOUS` で却下され、`.local/setup/new-cutout-blue-bear-rejected.json` に凍結された。同一原 hash/crop/BOX を v2 の検証に再投入しない。新候補は赤い金属光沢のある heart の未加工別原写真 SHA256 `c0ac4a379ba1b27c7c1d6c877e10f2165140637fca200aacc3298c4467c5440e`（804×804）。左=55、上=360、幅=380、高さ=325 の未回転 crop に完成赤 heart が入る。定規と離れた pin は審査した object ROI の外にあるため背景 seed にできるが、heart の一部を seed で消してはならない。source `kiwa:9411230007588:48965489262884` の own 本文の全 acrylic heart 17×21 mm の意味は別途 source review として固定する。これは方法検証の候補であり、加工=0、加工審査=0、採用=0、SQL 書込=0 のまま。最初は不透明で輪郭が判読できる群で検証し、白素材・透明素材・反射金属を成功例として先取りしない。

**着手条件:** 共通の own 寸法意味・写真 pose・購入意味を持つ具体的な新規未加工候補群を原寸観察で確保すること。現 inventory の件数や有限 manifest の 1,000 件は、この条件、処理成功、採用、保存の証拠ではない。

## 同一cohort内の失敗crop停止（2026-10-29）

原/seedを全件freezeしてから逐次加工する場合も、最初のnative原SHA+整数crop+rotation0で機械失敗したら、後続の同一cropをBOX/版/時刻/seed違いで実行しない。新しい準備helperは `scripts/prepare-new-input-cohort.mjs` の `createNewInputCohortPreparer()` をcohort外で一度だけ生成し、全行で共有する。`NEW_INPUT_CROP_PRIOR_FAILURE_NO_RETRY` は `processingExecuted=false` と元の失敗理由を保持し、後続行を加工実行数へ数えない。既存有限gate、永続negative/履歴prefix、原/加工審査、single writerを代替しない。既存frozen helperの改変/再実行、旧renderer/key/cache/成功bytesの変更はしない。

実装の発端はbatch024で、gold0の失敗後に同じ原/cropをBOX違いの4行でも機械実行した逸脱である。全失敗・採用/SQL0、結果は消去せず保持する。[検証記録](evidence/new-input-cohort-guard-verification.json)。追加guardの6testsはsyntheticを含む停止/並行/独立crop/戻り値不変の証拠で、実写真採用の証拠ではない。修正後の実写真加工はこの記録時点で0。
