# MVP実装・受入マトリクス

2026-10-29 JST更新。詳細設計v1.4 §36/§38と最新ユーザー判断・採用contractに基づく。以下はローカル実装と検証の範囲。全件登録・実クラウド・実機・実物精度の受入完了は意味しない。設計書本体は改訂しない。

使用可能12,183、配置対象20,066、残7,883、除外6,980。公式対象27,046。全Part12,219/Asset15,217/保存済みDesign3。ユーザー指示で登録・画像加工・自動再開は停止中（PAUSED）。登録以外の不具合修正・検証を進める。最新件数は実SQLと [非登録作業の保全確認](evidence/non-registration-preservation.json) に基づく。寸法なし画像枠方式は未承認。

## §36

2026-10-31 作成導線更新: 初期長さ/基準の選択と保存を保持し、編集は①長さ→②紐・留め具→③配置→④完成確認へ統一。完成前チェック/対象選択と必要量、一覧の遅延サムネイル/元を保持する複製を追加。[現行契約](GUIDED_COMPLETION_CONTRACT.md)・[検証](evidence/guided-completion-verification.json)。一覧検索/保存状態/未保存確認を維持。登録PAUSED・既存データ保全を維持。製品全体/物理精度/実cloudの受入完了とはしない。

|区分|実装とローカル証拠|残る実環境受入|
|---|---|---|
|A 登録/Import|登録・既存画像再編集・crop/透明化/perspective/校正・Point/Hole・購入条件・segment生成・favorite/recent/tag/notes検索。part-registration、perspective-annotation、segment、import-fallback E2E、import/asset/storage/database/part domain tests|実Kiwa HTML単品候補取込、実private Storage upload/download（公開JSON catalog/実画像取込は別途確認済み）|
|B Bead|wire/string Path、Through占有・範囲・長さ不足・並替・寸法判定。throughCommands/arrangeThrough/dragComponent tests、実Editor10beads→Mirror→save/load E2E|実画像の校正精度と実クラウド再読込|
|C Chain|u/v/straight、shallow U preset、全anchor、port容量、追従、長さconstraint/clamp。path geometry/commands/SQL parity tests、segment chain Editor E2E|垂直U/Vは製品規約待ちで拒否。実チェーン外形との照合|
|D Connection/Mirror|方向、剛体移動/回転、単一拘束追従、複数拘束拒否、detach、flip、linked両側同期/1履歴/independent/policy。point/dragComponent/createMirror/syncMirror/validateMirror/completion testsとEditor E2E|実画像を用いた左右構造の目視確認|
|E BOM|piece/pack/length購入量、既知金額と不明件数の分離。purchase/bom tests、Editor/PNG要約|実商品購入単位の照合|
|F Realism|自前Storage画像をKonva/PNGで使用、実寸mm、texture Path追従、zoom>=4でHigh使用。imageGeometry/designExport/segment testsとE2E|実物比±3%の測定。合成画像テストは実物精度の証明ではない|
|G PC/iPhone|responsive詳細sheet、Pointer/Touch/pinch/pan、同一Repository save/load。PC/mobile Chromium/WebKit E2E。Safari向け追加案内、standalone UI、実SWの通信断fallback|iPhone Safari実機・PC↔iPhone cloud往復・PWA install。WebKit native2指は自動化未対応、synthetic pointer別検証|
|H Reliability|100Undo/Redo、save失敗保持、revision/atomic rollback、参照復元、Part/Asset不変性/後継失敗rollback、認証/gesture race回帰。画面非表示/終了時の復旧書込開始・snapshot/Revision同時capture、IndexedDB abort時の前snapshot保持。history、DesignEditor DOM、database/storage/recovery tests|実Supabase複数接続race/Auth/Storage運用。OS強制終了時の非同期書込完了保証|

## §38 全16項目

|番号|機能|主な実装/証拠|
|---|---|---|
|1|実画像登録・正規化|PartRegistration、imageGeometry/perspective、登録E2E。実商品受入はA/F参照|
|2|実寸保持|physicalFields、校正、Part RPC、画像再校正E2E|
|3|制約Path Shape|domain/path/geometry、Part Path spec、Editor。垂直U/V境界はC参照|
|4|Through占有・範囲|throughCommands、arrangeThrough、resolvePoses、SQL幾何検証|
|5|始点/終点/任意位置接続|ConnectionPanel、pathCommands、chain Editor E2E|
|6|Length Constraint|path/geometry、changePath、client/SQL parity tests|
|7|Point方向・拘束・移動/回転・detach|pointCommands、dragComponent、manual角/completion tests|
|8|Mirror継続同期|createMirror/syncMirror、SQL mirror validation、Editor save/load|
|9|寸法3値判定|compatibility/check/settings、Point/Through/position。未知はunknown、既知不足は拒否|
|10|購入単位|purchase/bom、BOM UI/export|
|11|PC/iPhone編集|EditorStage/DesignEditor mobile UI、PC/mobile Chromium/WebKit。実iPhone未検証|
|12|Atomic Save|migrations004/012–016、全snapshot/最後挿入失敗rollback tests|
|13|Part/Asset不変性|successor/Storage reserve/commit/immutable guards、DB/Storage tests|
|14|全構造保存復元|Repository/Atomic RPC、全5Mirror entity DB roundtrip、Editor E2E|
|15|Kiwa候補・差分・fallback|API import/Part source UI、fixture/security/fallback tests。単品HTML候補取込は未検証。公開JSON収集・実画像取込は確認済み|
|16|実画像2.5D編集画面|Konva stage＋shared editorRenderer、実寸画像/texture/影/z順、PNG E2E。実物見え方未受入|

## 最新の再現と測定範囲

2026-10-29 登録停止中の整備：オフライン復元用runtimeの依存不足を修正し、現行の紐・デザイン検証・穴径参照を含む固定19ファイルを読み込む。未許可の相対依存とリンク先への書込みは引き続き拒否する。実際のCLIによる隔離先への旧v1/v2復元、強制終了後の復旧を検証する。部品一覧のテストfixtureを現行の販売単位参照に合わせ、保存済み同一グループ部品の寸法範囲を使う回帰を追加。実データへの登録・加工・復元は実施していない。[独立レビュー](evidence/non-registration-offline-restore-review.md)。通常worker設定で112 files/524 tests成功、runtime3tests・typecheck・production build成功。過大探索警告2件も解消し、private作業データ混入0・必要SQL32保持を確認。[今回の検証記録](evidence/non-registration-maintenance-verification.json)。

以下は過去の検証記録であり、今回再実行した全体テスト・現在のSQL件数とは区別する。

2026-10-19 編集読み込み改善: 配置済みPart先読み・local read-only batch・検索全件/100件ずつ表示・キャンセル/auth境界を実装。対象unit32件（native全bytes hash/画像破損・復元・強制終了・遅延library/auth/refresh競合を含む）、入口回帰8成功、typecheck/build成功。Editor関連E2Eの最終結果は証拠参照。全suiteの再実行結果とは区別する。実測は再起動後初回確認292.9秒→21.1秒、起動後canvas0.323秒、全library5.46秒（単一端末・自動ブラウザーでの観測）。全bytes SHA256をDB内計算し、128行ずつheader/hash/path/mimeのみ取得する。画像をまとめてJS転送する試案は効果がなく撤回。実Part/Asset/Design1の行hash保全。詳細/最終E2E結果はevidence/editor-loading-verification.json参照。

- Vitest81 files/380 tests成功、Playwright全140件中138成功/2明示skip、typecheck/production build成功。別途runtime Node1 test成功。E2Eは隔離workspaceのPC/mobile Chromium/WebKit。skipはWebKit native2指注入で、同engineのsynthetic pointerは別検証。証拠 [workspace-backup-v2-verification.json](evidence/workspace-backup-v2-verification.json) と同prefixのunit/e2e/build.log。
- 全migration001–016をPGliteで検証。非空Design/画像/Part/archive/後継のv1/v2往復、SQL rollback、writer競合、処理強制終了前後のcommit境界・復元再実行を隔離保存先で検証。OS電源断の耐久性保証ではない。
- 新backup v2は全domain libraryを逐次処理。128MiB超・50,000行超、改変/欠損/順序/owner/path/schema拒否、書出しdisk/cancel失敗、復元公開競合を検証。1画像20MiB/1記録32MiB制限は維持。旧JSONも支持し旧上限を維持。raw catalog/候補registry/画像審査sidecarは対象外。手順 [WORKSPACE_BACKUP_SET_USAGE.md](WORKSPACE_BACKUP_SET_USAGE.md)。
- 実保存先は1回再起動後、全Part16,716/Asset13,073/Design0の行hash・archive状態・registry/除外hash不変。登録追加0/実backup作成0/実restore0。画像startup監査は全件確認し、取得の件数/bytesを制限する。証拠 [workspace-backup-v2-real-preservation.json](evidence/workspace-backup-v2-real-preservation.json)。非空実Design保全は未実証。
- ティアドロップ範囲寸法・独立写真crop/姿勢・persistent prepared cache・審査packageの集合identity/原子的公開を実装。初回2件の登録/再実行0/cold read-backは停止前に検証。停止後は実登録せず隔離テスト。詳細HANDOFF/TEARDROP_PREPARATION参照。
- PWA通信断fallback、性能の測定範囲、過去の商品別照合はRECOVERY_PWA_REVIEW.md、evidence/performance-*.json、PART_REGISTRATION_REVIEW.md、ALL_VARIANT_MAPPING_CONTRACT.mdと各family証拠を参照。合成画像・自動ブラウザーを実物精度や実機性能の証明へ昇格しない。

## 残る受入条件

全20,066配置対象の使用可能と全27,046公式対応は未完了。品質hold245以上（元85含む）と各有限契約の保留を維持。画像尺度/サイズ別外観/穴/接続の未確認は明示し、寸法根拠と配置可否を分ける。登録再開は明示指示を待つ。

実Supabase/Auth/Storage/並行接続・PC/iPhone cloud往復、iPhone Safari/PWA install、実Kiwa HTML単品候補取込、既知寸法による実物比±3%の実測、電源断試験、実ライブラリ復元は未受入。垂直U/Vは製品規約判断待ちで拒否を維持。クラウド接続設定だけで端末データは移行されない。
