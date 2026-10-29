# 紐の商品選択・使用長さ

追補: 紐の配置範囲と参考購入額の連動は[制作ワークフロー契約](STUDIO_WORKFLOW_CONTRACT.md)で実装。実材料Path/実接続を作らない境界は維持。

2026-10-24。ユーザー承認: 紐径は使用する商品・サイズの掲載仕様で決め、使用長さは実寸で指定してデザインへ保存する。

- 登録済みsource registryの有限11商品familyから、既存最小販売単位policyのsingleton/resolved canonical/resolved subgroup canonicalだけをread-only選択。現在16 variant。hold・旧品・非最小販売単位は掲載しない。一般Part登録/監視停止は維持。
- テグス、TOHO、MIYUKI、ナイロンコートワイヤー各色、アンタロン系/オペロンのproduct IDをallowlist。ジョイントワイヤー/丸カン線径/平紐幅/販売長から径を推測しない。size原文の単一mm径だけを採用し、号のみ/約範囲等はnull。オペロン範囲は未確認のまま。
- editorConfig.cordSpecification version1にsourceDraftId/title/sizeText/sourceURL/sourceFetchedAt/全source snapshot SHA/diameterMm nullable/purchaseText/availability/usedLengthMmを保存。通常のchange/history/dirty/保存/復旧に連動。既存configキーを保全。
- 使用長さは0超1000000mm以下。mm正準・cm換算。購入包装の販売長とは別。結び代/留め具を含めず指定。画面実物大調整とは独立。
- 商品選択中の直接通し比較は、最新APIのsource hash一致商品から径を導出してreadonly。未確認・失効・API不通なら注意付き選択可。無穴/不足の既存拒否は維持。商品未設定時のみその他の手入力比較が可能（公式径として保存しない）。取り付け意図は既存ブラウザー設定に分離。
- local save境界は現在ownerのDesignをrow lockし、変更specを最新商品リストと完全一致照合。不正な径/出典/長さ/余分fieldを拒否。registry/catalog/policyの実bytes SHAを一覧/変更saveごとに再検査し、プロセス内cacheが古ければfail closed。無変更の保存済みsnapshotは失効時も他編集の保存を阻害しない。再選択時だけ更新。
- 使用長さをガイドに反映する明示ボタン。既存resizeGuideLength（上限10000mm）で幅/下がり同率調整、既存node/Path不変。実材料Path・接続・BOM自動追加は含めないと画面表示。

検証: evidence/cord-product-verification.json。unit53/5 files、Chromium旧取り付け回帰2、実画面PC/mobile2（.23mm・45cm=450mm・readonly・横overflow0・mutation要求0）、typecheck/build成功。isolated SQLでsource-bound保存/再読込と改ざん拒否。現在2Design revision121/2、全Part11335/Asset14333/機能穴接続0の前後完全一致。

Sol Mediumを明示した設計agentへ範囲確認を依頼（runtime model確認情報なし）。同agentの範囲reviewでsource cache失効の指摘を修正し、bytes変更の負例成功。実物通過や実材料Path/BOMは今回の受入ではない。
