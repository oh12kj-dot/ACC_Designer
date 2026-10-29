# 保存デザインの削除・名称変更と操作色

2026-10-25。ユーザー承認: 一覧に削除ボタン、削除の確認、デザイン名の変更、編集画面のボタン/選択欄の識別改善。

## 一覧操作

- 端末保存の各カードに編集/名前を変更/削除。削除はnative confirmに対象名と取り消せない旨を表示。キャンセルはRPC0、成功応答trueの後だけ一覧から除く。失敗時はカード保持、revision相違/不存在は一覧再取得して再確認。強制削除なし。
- 名前はカード内formで1〜200文字、空白だけ不可。保存/キャンセルを明示。一覧で選んだrevisionを保持し、全aggregateを読んで同revisionか確認。nameだけ変えた全snapshotを通常saveへ渡し、SQLのrevision row lockも再確認。配置や接続を部分snapshotで消さない。他タブの編集は競合として停止。
- ローカルdelete_design RPCは既存LocalWorkspace transaction内の専用分岐。owner+IDでrow lock、safe revision一致、同owner+IDをdeleteし1件成功を確認。FKでDesign専有のnodes/paths/接続/mirrorだけcascade。Part/Asset/registry/画像bytesを削除しない。
- migration/schemaを増減せず、既存workspace/バックアップのmigration hashを維持。Supabaseデプロイ・書込なし。クラウド接続時は削除ボタンを出さない。
- idempotencyのdelete成功cacheは同IDが復元されていれば再送拒否、消えたままなら既存成功を返す。cached get_design_aggregateも現DBを読み直し、削除前snapshotを返さない。古い別タブのsaveは既存のDESIGN_NOT_FOUNDで拒否。

## 操作の色

主要実行（保存/配置）は深緑、通常操作は緑の塗り/輪郭/影、選択欄は淡青+青枠、入力は白+濃い輪郭、詳細開閉はベージュ、削除は赤。写真候補には「選ぶ」の小ラベル。選択済み色見本・disabled・hover・focus・スマホ44px操作面積を保持。色だけでなく文字/矢印/枠でも操作種を示す。

## 確認

unit64/4files: 確認cancel/成功/失敗/競合、rename cancel/保存、aggregate保全、無効revision、別owner、Part/Asset保全、子node cascade、同ID復元の古いdelete再送拒否、cached read失効。隔離PGliteで実行。

Chromium PC/mobile6: 一覧で新規の試験Designだけrename→再読込→削除cancel→確認削除→再読込。一緒に制作ワークフローとズームを回帰。ユーザー3000では保存/削除を確定しない。actual live test/evidenceはdesign-actions-live.json、最終受入はdesign-actions-verification.json。

独立した範囲コードレビューでブロッキング0。Sol Lowを明示指定したがruntime model確認情報なし。一般Part登録・監視はPAUSEDを維持。
