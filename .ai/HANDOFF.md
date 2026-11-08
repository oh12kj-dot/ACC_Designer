<!-- STORAGE_CLEANUP -->
## 精査資料の整理後配置（2026-11-08）

精査資料は `C:\AI\App_Dev\ACC_Designer_ReviewArchive\20261108\review-evidence-audited.zip` に保管。旧全件ZIPと展開済み原本は整理済み。SHA一致の同一資料はalias化、実DBで読み戻した画像の重複コピー・同一情報を含むOCR cache・未審査生成シート・準備専用cacheを除外。固有根拠、保留/negative、審査済み画像と現在検証の入力は保持。再開時は `.local/storage-cleanup-20261108/audit/restore-evidence.ps1` でCurrentReviewを復元する（標準Expand-Archiveだけではaliasを復元できない）。実DB・registry・catalog・通常動作用校正データは保持。精査完了を意味しない。判断の詳細と検証結果は同auditフォルダ。画像API照合・実DB全体検証後、専用serverのDB close/lock解放を確認済み。
<!-- /STORAGE_CLEANUP -->
# 現在の引継ぎ（2026-11-07 JST）

## 指示と正本

全19,611有効Partの精査を最後まで続行。時間/任意件数で停止・続行確認しない。メーカー/販売元の公式資料を取得し、他社商品の実測資料をユーザーへ要求しない。未実施の目視と、調査しても不足/矛盾する資料を区別する。

正本: `.local/setup/all-parts-review-20261106/review-ledger.json` / `current-verification.json`。契約は [全件精査](ALL_PARTS_REVIEW_CONTRACT.md)、[実施計画](REGISTRATION_REVIEW_PLAN.md)。最新全体検証は2026-11-07 09:11 JST。全Part19,647／有効19,611／Asset20,585／Design3、登録対象未登録0。

## 完了・確認済み

更新したPartは重複を除いて1,753件。工程別（工程間の重複あり）は、形状解釈訂正75、メーカー寸法545、仕入先寸法185（チェーン幅114/部分39/パイプ内径幅32）、穴サイズ参考値311（単一文300/サイズ別表11）、接続材料案内215、チェーン原文サイズラベル415、工具系カテゴリ訂正9。写真/穴座標/実接続や物理校正を捏造しない。各有限scopeのfirst/正式rerun0/読戻し/対象外行・旧Asset・全Design/原registry/catalog/販売方針保全を確認。購入UUID440のみ再生成、業務値は不変。

旧chain-gaugeの線材径断定399件を撤回し、415件を意味未確定の原文参照へ訂正済み。旧native線径の物理値としての利用も停止する読取ガードあり。旧scope再起動禁止。[契約](CHAIN_GAUGE_LABEL_CONTRACT.md)。穴サイズ300件は前作業の掲載再結合が未実施だったため、今回のサイズ別表11件と非重複/同一元manifest/全承認差分を検証し、証拠を残して合成。現在は全19,611の掲載束縛一致、警告952/購入計算保留833を維持。

全元資料/写真/価格購入/ガイド結合、69,476画像bytesの機械検査は最終問題0。過去写真審査の原/全出力483・highのみ94を現在source/spec/key/hashへ再結合済み。新規写真比較は最新台帳3,525 Part（接触解像度での比較を含む）。過去審査の再結合とは別工程。

掲載照合証拠のbackup自動同梱を実装。証拠ありはv3、なしはv2、旧v1/v2読込維持。220ファイル/183,802,569 decoded bytesを隔離先へ保存し、元registryに頼らずPart19,611/source27,046束縛を読取検証、domain writes0。[契約・検証範囲](PORTABLE_SUPPLIER_REVIEW_CONTRACT.md)。公式DBの復元/通常操作に必要な従来の非公開registry/catalog/販売方針の要件は維持し、sidecarで迂回しない。

## 残作業・未受入

- 原/加工写真の今回比較未実施16,086件（最新台帳）。過去審査の厳密再利用分を活かし、variant/サイズ/対象領域/外形/背景/向きを確認する。全件机上・目視完了0、fullReviewComplete=falseを維持。
- 寸法/穴/接続/購入意味の不足を独立公式資料で商品群単位に調査し、根拠成立分だけ新baseline/new scopeで反映する。チェーン415件の数値の物理的意味は未確定。警告952/購入保留833は重複を含み合算しない。
- TOHO3件のサイズ欄/本文外径の矛盾は2026-11-07に正しいproduct/variant/SKUの公式商品APIを再取得しても継続。`.local/setup/toho-conflicts-20261107/review.json`。メーカー系列表だけで当該SKUの矛盾を解消したと扱わず、native値の推測訂正をしない。
- 独立物理校正0。実物精度/製作適合、実cloud/別実端末、電源断/強制終了、実保存先へのライブラリ復元は未受入。Supabase書込0。ローカル試験・buildはこれらの代替ではない。
- 作業ツリーに以前からの多数の変更/未追跡ファイルがある。今回のバックアップ変更と全件精査を含め未commit/未push。無関係変更を消去・一括公開しない。

## 進行中の写真精査

`.local/setup/all-part-visual-review-20261107/queue.json` は原/highの同一bytes対で固定した13,057群。生成シートを承認として数えない。`scripts/prepare-all-part-visual-review.mjs <開始sheet> <枚数最大64> [tools]` は既存APIの読取だけで作る。通常0000〜0207と工具90群の6シートは生成済み、0208以降を生成中。rootが実際に比較して記録したのは通常0000〜0203＋工具6シート（group1重複除外）。最新記録はreview-0200-0203.json。台帳検証後の追加分は次のcheckerで反映。次の未実施は0204。元/high 232px比較の限界、集合/単粒crop/複数方向/背景/variant尺度を明記し、fullReviewComplete=falseを維持。画像再加工・旧negative再試行0。

工具系105 Part中9件のカテゴリ誤分類を訂正。現在商品APIのproduct/variant/SKU/sizeと用途明示文が一致、Design参照0。新scope `.local/setup/supplier-dimensions-20261107/tool-category` のfirst9/正式rerun0/readback/旧行・Asset・全Design・原資料保全と掲載再結合済み。[契約](TOOL_CATEGORY_REVIEW_CONTRACT.md)。同一transactionの参照拒否ガード、将来取込の公式区分優先、キーワードだけの除外禁止を回帰。型/build成功。未計測の全体suiteで旧復元renameのEPERMを再度観測し、診断付き全体suiteは3回とも133 files/611 tests成功・4 skip。このscopeも消費済みで再起動しない。

## 再開方法・禁止事項

127.0.0.1:3000は今回既存のnpm dev経路で起動済み。実DBを別processで開かず、既存APIだけ利用。単一writer/CAS・全旧行/Asset/archive/全Design/原資料/販売方針を保持。旧worker/自動監視はPAUSED維持、許可済み手動精査のみ継続する。全体read-only検証は `node scripts/check-all-part-review-current.mjs`。旧有限writerは後続変更でbefore失効しているので再実行しない。

旧negative/意味hold/失敗cropを保持。mirrorball3/4mm、metal8/natural68/pearl20/official3の意味hold、旧TOHO/Delica52等の失敗入力を同原/crop/seed/閾値変更で再試行しない。写真合格・寸法参考値だけでholdを解除しない。有限保存の契約はFINITE_NEW_INPUT_COHORT_SCALE_CONTRACT.md、撤回証拠はevidence/cohort013-source-meaning-revocation.json。

作成導線は①長さ→②紐・留め具→③配置→④完成確認。複製は全参照新ID/PartAsset共有/元不変。既存導線・保存・Mirror保全を維持。[契約](GUIDED_COMPLETION_CONTRACT.md)。起動はACC_Designer.bat、Chrome専用窓closeで保存drain→DB close/lock解放→終了。新buildの専用画面反映には保存して閉じてBAT再起動する。通常デスクトップを今回操作・終了したとは報告しない。

## 今回の検証証拠

`.local/setup/portable-review-20261107/verification.json`（実sidecar隔離読戻し）、`full-tests-serial.log` / `build.log`、`.local/setup/all-parts-review-20261106/current-verification.json`。最新の診断付き全体試験は3回とも133 files/611 tests成功・4明示skip。型検査/build・対象回帰成功。旧JSON復元renameのEPERMは並行build時と単一worker時の計2回観測、未解決。隔離stageの同一renameを計測する診断hookでは未再現・回復イベント0であり、推測の本番retryは未導入。証拠は `.local/setup/restore-rename-diagnostic-20261107/`。バックアップ独立レビューP2修正済み、書込失敗・commit失敗後の再試行も回帰成功。Sol Medium明示依頼、actual runtime model/effortの確認情報なし。

