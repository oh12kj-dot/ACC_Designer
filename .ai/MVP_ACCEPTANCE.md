# MVP実装・受入マトリクス

2026-11-07 JST更新。詳細設計v1.4 §36/§38と現行契約に基づく。ローカル実装/試験と、実cloud・実端末・実物精度の受入を区別する。設計書本体は改訂しない。

全Part19,647／有効19,611／Asset20,585／Design3、登録対象未登録0。全件精査は未完了。更新1,744件、全19,611の掲載束縛一致、警告952/購入計算保留833。正本は `.local/setup/all-parts-review-20261106/current-verification.json`、全件精査契約はALL_PARTS_REVIEW_CONTRACT.md。旧20,066/残7,883等の件数は現在の残登録件数ではない。

旧worker/自動監視はPAUSED。許可済み手動精査を継続し、旧negative/意味hold/失敗cropの再試行はしない。写真比較は今回158、未実施19,453。寸法参考値の保存を写真校正・実接続・物理製作可へ昇格しない。

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

## 最新の検証と残る受入条件

全件精査のfirst/正式rerun0/読戻し/全対象外行・全旧Asset・全Design/原registry/catalog/販売方針保全はcurrent-verification.json参照。TOHO3件の掲載寸法矛盾は2026-11-07公式API再取得でも継続。物理校正0、全件精査完了0。未実施の写真/意味確認と、調査済みの資料不足/矛盾は区別する。

掲載照合証拠のbackup自動同梱を実装。証拠ありはv3、なしはv2、旧JSON v1/v2の読込を維持。改変/別owner/出典差替え/欠落/業務内容変更を拒否またはunknown/staleへし、保留を解除しない。復元書込/commit失敗時のcleanup・再試行、offline CLI・再export、容量/path/junction/空404証拠を回帰。実sidecar220ファイルを隔離先へ保存し、元registryに頼らない束縛読取を検証したが、公式DB全体の復元には従来の原資料配置要件を維持する。[範囲と証拠](PORTABLE_SUPPLIER_REVIEW_CONTRACT.md)。

今回の型検査/build/runtime/全体試験の結果は `.local/setup/portable-review-20261107/`。ビルドと全体試験の並行実行で旧JSON復元renameにEPERMを1回観測、同じ試験の単独再実行は成功。原因を断定・動作変更せず、単一workerで全体132 files/607 tests成功・4明示skipを再確認した。最終結果は同dirのfull-tests-serial.logを正本とする。

実Supabase/Auth/Storage/並行接続、PC/iPhone cloud往復、iPhone Safari/PWA install、実Kiwa HTML単品候補取込、既知寸法による実物比±3%の実測、電源断/強制終了、実保存先のライブラリ復元は未受入。垂直U/Vは従来の製品規約判断待ちで拒否を維持。cloud接続設定だけで端末データは移行されない。以前のローカル実績はGitと各evidenceに保持し、現在の件数/受入へ転用しない。
