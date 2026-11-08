# 商品写真への登録訂正契約（2026-11-03）

前回の全7,001件への同一placeholder利用はユーザー要件を満たさず、完了扱いを撤回する。ユーザーは以前の1万件超と同様の商品写真を使った簡易登録を要求した。

旧snapshotの最多経路は own-photo-category-box 5,215、round-crystal-table 1,684、crystal-body-box 1,042、frontal-axes779、bead-body-size645。実際の商品写真のcrop/姿勢/掲載BODY寸法根拠を持つ経路であり、同一placeholderではなかった。残件にその審査済みspecを無条件流用しない。

今回新規7,001 Partのprimary写真URL/capture/productIds/source object hashを凍結し、全件対応を照合する。distinct product/photo4,932。旧gallery bytesを使い、新規取得や既存失敗cropの再試行はしない。正しい商品写真へ置換することを最優先にする。

有効な旧審査specを持たないものは own-product-photo-reference-v1 として全原画像を縦横比保持でresizeする。crop/白抜き/単体形状採用を捏造しない。これは商品写真付きの簡易登録であり、旧審査済み切抜きと同等の品質とは報告しない。写真・サイズ別外観・背景透過・切抜き・実寸・穴接続は要精査と表示する。表示枠の10mmを実寸/寸法sort/実寸検索/自動間隔に使わない。

新Assetは実productIdと写真hashが一致する場合だけ同一商品のsource間で共有する。異なる商品の共通placeholderに戻さない。original/high/medium/thumbnailとsource provenanceを保存し、通常save_part_successor+expected_part_sha256で今回分だけ更新する。未参照はID維持、参照済みは後継保存で元Designを保持する。全旧12,223 Part/15,221 Assetと全Design/registry/既存関連行を保全する。873販売単位hold/5archiveは維持し、写真があるだけで配置許可へ変えない。

単一writer、100件atomic checkpoint、source別決定的key、再開時live source/写真hash照合。全件置換数、共通placeholder参照残、全4画像API読戻し・原写真/high画像hash、全旧行/Design保全、正式再実行changed0、対象tests/typecheck/build、PC/mobile表示・配置保存再読込を確認する。

Sol Mediumへ新証拠と要件訂正を明示して契約を再依頼し採用。actual runtime modelを独立確認する情報はない。

変更0の正式再実行では、同じscope/Part数/Asset数を照合した上で、直前の全画像検証receiptをSHA256固定で再利用できる。同じ画像の全読戻しを重複実施する必要はない。
