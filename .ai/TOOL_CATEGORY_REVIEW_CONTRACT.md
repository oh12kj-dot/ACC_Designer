# 工具・収納・包装用品のカテゴリ訂正（2026-11-07）

公式host/https/正規 /products/g-tools-adhesives-cases-* の仕入先区分を商品名キーワードより優先し、将来のcatalog取込と登録フォームでotherへ分類する。従来1引数の推定・他社/偽host/別path・工具モチーフのチャームは変更しない。名称だけの除外/非表示を追加しない。

現在の同区分105 Part中、トレー/マット/収納ケース/ギフト箱の9件がbead/eye_pin/jump_ring/pearlに誤分類。凍結原文と現在の正しいproduct/variant/SKU/size及び用途明示文を両方確認し、現在baselineの新scopeでcategory=otherと出典付きsupplierCategoryReview、partial source snapshotだけ追加する。元registry/catalog/販売方針/旧snapshot/nominal provenanceを保持し、画像/寸法/穴/接続/購入業務値/名称/notes/Design/archiveを変更しない。

Design参照をprepareで確認し、referencedは訂正しない。新しいsupplierCategoryReviewの導入/変更は既存Part row lockと同一transactionでDesign node/path参照を検査し、CATEGORY_CORRECTION_REFERENCED_PARTで保存前に拒否する。通常の既存reviewを保った編集や通常後継保存は維持する。archive・後継生成・Design付替えで解決しない。

single writer/CAS、対象9のfield制限/出典固定、first/正式rerun0/全読戻し/全旧Asset/対象外行/全Design保全。カテゴリ/metadataだけの承認差分で掲載sidecarの対象bindingを再結合し、元codes/本文判定/経済条件/警告/保留を保持する。通常編集の自動承認なし。

Sol Mediumへ限定設計を明示依頼し採用。actual runtime model/effort確認情報なし。回帰は誤分類の修正前失敗→修正後成功、host/pathの負例、元draft保持、参照済み保存が修正前に後継を作る失敗→修正後拒否、既存後継/CAS/再実行を確認。全件写真・実寸・製作適合の完了とはしない。
