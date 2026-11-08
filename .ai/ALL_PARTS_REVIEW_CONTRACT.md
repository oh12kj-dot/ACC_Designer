# 全有効Partの精査契約（2026-11-06）

ユーザー「全て精査」の対象は既存7,424件だけでなく、有効19,611 Partすべて。原資料27,046 source、全旧row/Asset/全Design/販売方針/既存hold/negativeを現baselineへ固定する。正本 `.local/setup/all-parts-review-20261106/`。Sol Mediumを明示依頼して採用（actual runtime model/effort情報なし）。

評価軸は source/variant対応、写真と加工、掲載寸法の意味、購入情報、穴/接続/ガイド、物理計測。各軸はunreviewed/supported/partial/unknown/conflict/held/not-applicableを根拠参照・hash・審査者/日時・不足理由とともに記録。機械検査と目視を分離する。画像取得やrecipe名で目視合格へ自動昇格しない。既存の原画像/加工審査は現在のsource・Asset・hash・同一変換へ結合できる場合のみ再利用する。

資料・写真精査の処理済みは全評価軸の判断と必要な目視が済んだ状態で、不足/矛盾/保留を含められるが合格とは呼ばない。資料上の必要項目充足も、独立した実寸校正・製作可能とは別。全件精査完了は全19,611の必要評価/目視の未実施0・根拠失効0・残課題分類済みでのみ報告する。従来fullReviewCompleteの意味とfalse状態は変更しない。

N/Aは積極的資料に基づく場合だけ。穴情報欠落や見えない穴をN/A/無穴へしない。写真開口、表示anchor、回転軸、実ThroughHole/実接続は別。背景maskから物理穴を生成せず、販売長/線径/内径/fitをBODYへ転用しない。独立物理計測がないもののphysical verifiedをtrueにしない。

不足区分は identity-binding、missing-or-unreadable-image、product-photo-association、multi-object-region、variant-size-appearance、crop-or-mask-quality、orientation-or-axis、dimension-semantics、body-dimension-missing、purchase-semantics、connection-applicability、physical-calibration、frozen-negative-or-meaning-hold。歴史的holdの記載と現在の未解決holdを混同せず、後の採用証拠との照合を行う。根拠なしでholdを解除しない。

全画像はAPI読戻し・原hash/高hash/寸法/可視pixelを検査し、これは機械検査だけとして数える。集合丸玉39 source/14商品は目視で集合写真を確認し、サイズ/対象領域対応不足を記録。画像の目視なしの抽出や、旧TOHO/Delica等の不採用crop再試行はしない。

更新はsingle writer・正規RPC/CAS・現在baseline・参照済み後継保存。全旧Asset/Design/対象外row/原資料保全、対象readbackと4画像hash、first/rerun0。時間や任意件数で停止・続行確認せず、根拠が成立する独立対象を継続する。具体的外部資料/実物計測待ちと、未実施の机上/目視作業を分ける。
