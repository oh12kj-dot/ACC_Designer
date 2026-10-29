# Database foundation

`migrations/` のSQLをファイル名順に適用します。既存データのある外部DBにはまだ適用していません。
Supabaseの `auth.users` / `auth.uid()` / `anon` / `authenticated` を前提にしています。

## 新規環境の適用準備

`npm.cmd run db:prepare` で、全migrationをファイル名順にまとめた `.local/setup/supabase-initial.sql` と、各元ファイル・bundleのSHA-256を含む `manifest.json` を生成します。DB接続・SQL実行は行いません。生成SQLはBEGIN/COMMITで一括適用します。新規SupabaseプロジェクトのSQL Editorで実行するためのファイルです。既存環境ではbundleを再実行せず、未適用のmigrationだけを適用してください。

アプリの接続には、プロジェクト直下の `.env.local` に `.env.example` の2変数を設定します。ブラウザー公開用のpublishable keyを使用してください。service_role/secret keyは設定しません。設定後はdevサーバーを再起動し、本番利用では再buildします。Authのemail/passwordアカウントで `/designs` へログインし、作成→編集→保存→再読込、次に画像uploadを伴うPart登録を確認します。実接続での成功は別途記録が必要です。

## 実装済み

- 詳細設計v1.4の15テーブル、数値finite/範囲制約、FK
- 所有者別SELECT RLS、直接書込権限の剥奪
- `create_design` / `save_design_aggregate` / `get_design_aggregate`
- `save_part_successor` / `get_part_aggregate` / `archive_part` / `remove_unreferenced_part`
- Part参照追加と定義変更のPart行ロック
- 参照中Part本体・Purchase/Path/Point/Hole定義保護
- 画像行の不変性、所有者・Asset IDを含むStorage Pathの検証
- 後継Partの従属定義コピー、旧Part archive、favorite引継ぎ

## 現時点の保存境界

`save_design_aggregate` はNode・Path・3種Attachment・MirrorLinkを含む完全SnapshotをAtomicに保存します。
010–016でPath Solver/Pose・所有Part/定義・接続上限/互換性・占有・Mirror所属と左右値を検証します。独立Mirrorでも跨側接続を拒否します。Path derived_geometryはサーバーで再計算します。

通常保存はDesign行ロック後に期待Revisionを照合し、競合を拒否します。競合時の明示Overwriteのみ古い期待Revisionを許容し、ロックした最新Revisionから+1します。UIには他の画面の内容を置換する説明と専用ボタンを表示し、自動保存はOverwriteを使用しません。
最後のMirrorLink挿入失敗でも全行・RevisionがrollbackすることをPGliteで確認しています。独立レビューと修正記録: ../.ai/DESIGN_SAVE_REVIEW.md。実Supabaseの並行接続は未検証です。

Part RPCでは `part` が必須です。所有者・ID・archive状態等はサーバーが決定します。
Spec省略は保持/コピー、明示nullは削除、Point/Hole配列省略は保持/コピー、空配列は削除です。
後継化または定義更新でPoint/HoleのIDは新規発行され、既存Designは旧Partの旧定義を保持します。

## ローカル検証

```powershell
npm.cmd test -- src/services/database.test.ts
```

PGliteのPostgreSQLで全migrationを実行します。テスト専用にauth schemaとユーザー識別関数を用意し、authenticated/anon権限を切り替えています。DB/権限/RPCをmockしていませんが、Supabase AuthのJWT検証は模擬です。

## Storage migration 006

Supabaseの既存storage schemaを使用します。private `part-images` bucketを作成し、20MB、PNG/JPEG/WebPに制限します。
追加の `asset_uploads` は予約ID/所有者/4path/状態を保持します。
予約中だけUpload可、画像行insert時に4objects存在を確認しPartと同一transactionでcommittedへ変更します。
Cleanupは予約行をlockしてcleaningにし、Storage API削除後にcleanedへ確定します。committedはCleanupできません。
同じpathの上書きは禁止です。restrictive policyはpublicに適用し、他の広いpolicyがあっても所有者・状態制限を保ちます。
AssetServiceは保存通信失敗時にCleanupを試し、失敗した予約はDBに残ります。パーツ一覧の整理ボタンでcleaningと24時間以上前のpendingを再試行できます。

SQL検証: `npm.cmd test -- src/services/storage.test.ts`。テスト用storage schemaを簡略再現し、全migrationを実行します。Storage API自体は起動していません。
未検証: 実SupabaseのJWT/API/Storage Upload・Signed URL・削除、複数接続lock/race、実環境のmigration適用。SQL policyテストだけで実Storage保護完了とは扱いません。

`scripts/generate-schema.mjs` は設計書の表を001へ転記する補助ツールです。001に手修正を加える場合は再生成で消さないよう確認してください。002以降は手書きです。

## Compatibility migrations 015–016

015はchain positionの既知内径/開口不足を拒否します。016は `editor_config.compatibility.clearanceMm`（既定0.05mm、有限・0以上）をPoint/Through/Path判定へ適用し、eye_pin/head_pinはpin_diameter_mmを優先します。clientとSQLの境界・rollbackをPGliteで検証しています。link外形が欠けるchain positionは完全適合を保証せず、clientではunknownです。
