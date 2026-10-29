# ティアドロップ画像の準備と再利用

2026-10-16。登録停止中。ここで実装した処理は登録許可・加工画像の採用を与えない。

`npm.cmd run parts:prepare-teardrop -- <raw-review-json> --check-only` は、固定120件のmanifest/registry原bytes、own本文・gallery/capture、明示crop/姿勢、最新の有限hold/除外を照合する。端末APIはPart一覧の読取りだけを使用し、archivedを含む既存source IDを除外する。古いpromotionsだけで登録済み判定をしない。確認のみの実行では画像を加工せず、Part/Assetを書き込まない。

停止中の確認入力は `.local/calibration/nominal/teardrop-paused-raw-reviews.json`。採用済みglobal reviewを変更せず、既存準備記録15件の原画像レビューをまとめたもの。確認結果は登録済み2件をskip、未登録13件が入力審査通過、加工0、SQL書込0、実active Part16,681。

実画像の準備を再開する際は、同コマンドの `--check-only` を外す。これは現在実行していない。新規準備は全rendition/transformを `prepared-teardrop` cacheに保存し、同一入力・全review identityの再実行および後の登録処理で再利用する。破損cacheは再加工で置き換えず拒否する。すでに登録済みの画像は準備しない。旧13件のhigh画像のみの記録は、全rendition/transformを持つ新cacheへの移行済みとは扱わない。

新しい準備結果は `.local/calibration/nominal/review-packages/<package-hash>/` に分離する。package hashは実際の対象ID/順序・spec・画像hash・skip理由・registryを含む。保留対象の変化で同じ番号の画像が別商品へ上書きされない。全画像とmanifestを一時directoryへ書いた後にまとめて公開し、同時実行では完全な既存packageを照合して再利用する。公開済み画像・manifestの改変は拒否し、上書き修復しない。

PNGと原/crop/BOX/加工key・画像hashを持つJSONを出力し、`processedReviewed=false` とする。JSONの画像filenameは同じpackage内の相対名。加工後の別途目視確認を経るまでglobal採用manifestへ反映しない。`--register` は拒否する。登録再開には新しいユーザー指示が必要。

検証: planner5＋persistent cache3＋immutable publication4、合成出力/固定identity入力による12 tests、typecheck成功。publicationは対象変更・画像/manifest改変・同時公開を含む。実画像の加工0、SQL書込0。登録入口での新cache利用は停止中のため実登録未検証。実iPhone/実物精度/cloudの証明ではない。
