# TOHO丸大・特大38件 — 掲載外径scalarの有限追加

2026-10-25。実装・増分検証済み: 38有限対象中31登録（丸大26＋特大5）、3 source保留（原候補39中）、5画像審査残。evidence/nominal-20261025-toho-large-verification.jsonを参照。以下は登録前に確定した設計要件。既存TOHO seed契約とMIYUKI/crimpの掲載BODY scalar方式を同じまま使う機械的な有限追加。root採用設計。新しい形状/穴/軸/尺度/価格の解釈は追加しない。独立専門家レビューの主張ではない。

原候補39のsource SHA256 709cd454a92c32d455b5abc9de54b38635163c3d498133053cc6f05a6cd1423f、own capture審査台帳 SHA256 5931f402dadb51536441d2caa066654986f9a663e061843e9a15ac712c0ecb09。有限ID/全object/own先頭photo SHA/生label/外径/本文prefixは .local/calibration/nominal/toho-large-finite-manifest.json に列挙（bindings38）。registry27,046と既存Part/Asset/全Design/archiveは不変、販売・廃番・品質guard必須。

生label3mmの33件と5.5mmの5件だけ。3mm own BODYは「外径約3mm、穴のサイズは約1mmです。」、5.5mmは「外径約5.5mmの丸みを帯びたビーズです。」。穴約1mmは原本文に残すだけでBOX/穴geometry/接続に転用しない。publishedSizeLabelと生のapproximateを保持し、BODY外径概寸は別field publishedBodyOuterDiameterMm=3|5.5、publishedBodyOuterDiameterApproximate=trueとして保存。widthMm=heightMm=掲載3|5.5の暫定BOXのみ。diameterMm/球形/物理W/Hを生成せず、未確認flagと空穴/接続を維持。

生label「-」1件（kiwa:8711134478628:46969921700132）はこの追加から除外。本文だけからvariantラベルを補完しない。タグは原配列、購入量・価格は原文のまま。丸小129/特小94の有限集合や既存parserを広げず、独立labelKind toho-large-body-scalar と固定38bindingだけを追加。完全object、own URL/sha/product association、rawLabel、category、原本文prefixの同時一致が必須。既存categoryBoxImageKey不変、fullspec hashと組合せたcacheを使用。

原/加工画像はrootが別々に確認し、完全な一個体/crop/姿勢/背景を承認したものだけ登録。黒背景/assortや輪郭切れ・他個体混入は保留。全38件採用の約束ではない。関連商品画像・架空tag・未承認の画像枠は禁止。

受入: 採用分の原/高API hash/一覧/read-back/空穴接続と原全既存データを検証、初回verification別保存後rerun0。拒否試験: 非列挙ID/任意object変更/3mmを穴1mmへ変更/label欠落・違い/別photo・商品association/未reviewを拒否。既存TOHO丸小/特小/MIYUKI/crimp/sequinの出力を保持。cloudWrites0。
