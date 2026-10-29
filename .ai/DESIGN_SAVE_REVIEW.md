# Design Atomic Save 独立レビュー（2026-10-05）

対象: migration 010–014 の Path/Pose/geometry/Mirror 検証と `save_design_aggregate`、関連する制約・RLS・Part 不変性、`database.test.ts` / Path・Pose SQL tests。契約は詳細設計 v1.4 §25/§29、`MIRROR_CONTRACT.md`、`PATH_CONTRACT.md`。実装は変更していない。

## High: Independent Mirror の左右を跨ぐ Attachment が保存される

`202610050013_mirror_validation.sql` の Attachment 所属導出は、参照先が **linked** group のときだけ `membership` を設定して跨側を検査する（37–49 行）。両 Node が同じ independent group の left/right に属する場合は `membership` が NULL のままなので、`202610050014_complete_design_save.sql` の `_validate_design_snapshot` を通過する。`MIRROR_CONTRACT.md` は Attachment の跨側接続を検証失敗とする。Linked → Independent 後の片側個別編集と再 Linked 化の基準側再生成に、所属をまたぐ接続が混入できる。

PGlite 再現: migration 001–014（Storage を除く）を適用し、所有者の Node Part に中央の ConnectionPoint（`x_norm=.5`, `y_norm=.5`, `max_connections=1`）を作る。同一座標・回転の Node 2 個を independent Mirror group の `left.nodeIds` と `right.nodeIds` に一つずつ置く。両 Node の中央 Point を `orientation_mode='keep_rotation'` の Point Attachment で接続し、`mirror_links=[]` として所有者が `save_design_aggregate(design_id,0,payload,false)` を呼ぶ。**実測: RPC は revision 1 を返し、保存を許可した。** 一時 Vitest 再現ファイルで確認後、そのファイルは削除した。既存の対象 3 test file は 38/38 pass、再現用 test は 1/1 pass。

最小修正: Attachment の各参照について所属を求め、同一 group/side でないものを independent でも拒否する。所属が一部だけある Attachment の扱いも契約どおり明確化して判定する。Linked の MirrorLink 必須判定は現状の linked 限定を維持する。SQL 側と `src/domain/editor/validateMirror.ts` の双方に独立モードの跨側負例を追加する。

## 確認できた境界

- 通常保存は owner の Design 行を `FOR UPDATE` し revision を照合する。`force_overwrite=true` は同 owner の明示 RPC 引数で stale revision を許し、現在 revision から +1 する。クライアント Repository は現在 `false` 固定。
- 新旧参照 Part を UUID 順でロックしてから、所有 Part/CP/Hole、容量、互換性、Pose、Through 占有、Mirror 対応を検証する。6 section の置換と revision 更新は単一関数呼出で、既存テストは最後の MirrorLink 挿入失敗時の全 rollback を確認する。
- 010–013 の検証 helper は `authenticated` 等から EXECUTE を revoke している。テーブル直接書込も revoke/RLS により拒否される。U/V の垂直弦拒否は維持される。

この範囲で上記以外の blocking/high の保存経路は確認できなかった。実 Supabase と real PostgreSQL の同時保存 race は今回未検証。作業ディレクトリに `.git` がなく、Git 状態・差分は確認できなかった。

依頼された specialist: `gpt-6-sol` / medium。spawn 要求は親からそう伝達されたが、この実行環境では実 runtime model/effort の確認手段がなく、Sol 実行の確認はできない。

## 指摘への対応

親実装側でSQL/クライアント双方の所属導出を全modeに拡張。independentでも全参照のgroup/side一致を必須とし、一部だけ所属する接続も拒否する。MirrorLink必須条件はlinked限定を維持した。独立左右の跨側と所属外接続のclient負例、既存の幾何有効Snapshotの片側所属だけを変更するSQL負例を追加。対象29件と全198件のVitest、typecheck/build成功。これは親による修正・検証記録で、独立再レビューは未実施。
Repositoryのforce=false固定はレビュー時点の情報で、現在は競合説明付きの明示UI操作だけtrueを送る。通常/自動保存はfalse。Editor DOMで通常競合→明示Overwrite→最新Revision応答を確認。
