# ACC Designer 引継ぎ

ユーザー指示で一時停止中。登録・加工workerなしを確認。明示的な再開指示まで登録/加工を開始しない。

## 作成手順・完成前チェック・複製（2026-10-31 JST）

操作可能な①長さ→②紐・留め具→③配置→④完成確認へ統一。長さカードを独立した最上部から①内へ移動。新規で長さ選択済みは②、配置済みは③、未設定は①。ピアスは配置/確認。紐設定は②へ集約し、留め具/チェーン検索はカテゴリを切替。目標長さは既存JSON/backup保持、ガイド記憶/紐配置範囲優先。Part移動/実接続自動生成なし。

完成前チェックは現在の編集内容から既存適合/構造検証/BOM/cordBudgetを再利用し、問題と要確認を分離、対象node/pathを選択・中央表示。必要量/購入単位を表示、在庫不足/物理製作可を捏造しない。保存制限の追加なし。一覧は必要Part/画像のみ遅延読取し共通rendererでサムネイル生成。複製は全entity/mirror/配列/表示グループ参照を新IDへ付替え、Part/Asset共有・元不変・expected0/forceなし。既知ID失敗は同じsnapshot/ID再試行、応答消失は全内容照合、owner/離脱後の続行を停止。[契約](GUIDED_COMPLETION_CONTRACT.md)・[最終検証](evidence/guided-completion-verification.json)。一覧検索/保存状態/未保存確認は維持。登録/加工PAUSED・実データ保全を維持。Sol明示要求はthread上限で実施不可。実cloud/実端末/物理受入と全件登録は未完。

全122 files/560 tests、PC/mobile Chromiumの実API隔離E2E12件、型/build成功。起動済み3000は停止せず既存APIから全旧行/archive/全3Design/公式registryと登録PAUSEDを再照合し不変。今回mainの新規起動/終了確認は実施できていない（既存アプリがポート使用中）。新ビルドの画面反映は、ユーザーが保存して専用画面を閉じBAT再起動する。試験で実データの書換え・登録・加工0。

## デスクトップ起動（2026-10-31 JST）

旧build16.3.8/installed Next16.4.3不一致はmain再buildと起動前の版/必須ファイル確認で修正済み。起動失敗IPCは具体的原因を維持。旧devは正常DB close/lock解放→自身のcleanupで終了済み。

ブラウザー起動が全画像audit完了待ちだったため20.4秒。Next listenで専用待機画面を先行表示し、従来の自己probe/PGlite/full audit/global確認が成功してからホームへ移動する。準備中は自己nonce probe以外のアプリ/APIを503で遮断。実データ1回計測でbrowser開始611ms/窓存在確認896ms、DB ready21.8秒。短縮は表示開始までであり、全件検証時間は省略していない。[早期表示契約](DESKTOP_FAST_START_CONTRACT.md)。

desktop11tests成功（初期化中close/probe未接続close/即停止/監査失敗/busy旧writer保持/server先行終了の窓所有を含む）。実Chrome保存途中close→正常DB close/lock解放→再open/Design読戻し成功。mainも正常起動/全旧Part12,219/Asset15,217/全3Design/archive/registry一致→窓closeで正常終了。登録/加工PAUSED維持、domain書込0。独立post-reviewはthread上限により実施不可、設計はSol明示要求・終了競合は実回帰で検証。

## 登録以外の整備（2026-10-29 JST）

GitHub `oh12kj-dot/ACC_Designer` の **mainへ公開済み**。初回セットアップBAT/npm ci/build、通常起動BAT、別端末README/非公開バックアップ移行手順を追加。新規cloneで原資料2ファイルが両ENOENTの時だけ手動専用。片欠落/改変/読込エラーはstrict failure、旧hash/hold/販売/identity維持。原資料由来の手動偽装・snapshot RPC・紐指定Design維持保存/通常・再実行読込・backup2形式を拒否する回帰を追加。独立レビューP1の2経路を修正し回帰成功。全525tests成功（maxWorkers2、通常設定では大原資料I/Oの5秒timeout2件を観測、判定変更なし）。Next16.4.3/undici7.30.1/vite8.3.5へ既存範囲内更新、npm audit 0。クリーン取得先でnpm ci/typecheck/build警告0・portable test・launcher4tests、実Chrome窓close中の保存drain/終了/再open読戻し成功。原資料/DB/画像/Design/.env/作業証拠/backupはGit対象外。登録PAUSED・実データ変更0。

`ACC_Designer.bat` を追加。Chrome専用窓close→処理中HTTP保存drain→PGlite close/lock解放→Next close/IPC ACK→server exit。独立Windows named pipe排他・loopback固定・既存dev/start不変。通常install/build/登録0。Chrome隔離UUIDで保存途中に実窓close→保存成功/再open Design読戻し成功、負例含むlauncher4tests成功。[実機proof](evidence/desktop-launcher-chrome.json)・[使い方](../起動方法.md)。Edge初回案内が終了操作を妨げたためChromeのみ。既存3000devは起動元で終了後BAT利用、他processを強制終了しない。電源断/強制終了は未受入。登録PAUSEDと実Part12,219/Asset15,217/Design3・全旧保全を読取検証、変更0。

オフラインbackup復元の固定runtime依存不足を修正。現行紐/デザイン検証と穴径参照を含む固定19ファイルのみ許可、未知依存拒否/リンク拒否/一時物cleanup保持。隔離先CLI v1/v2復元・強制終了rollback/再開を含む全**112 files/524 tests成功（通常worker設定）**、別途runtime3tests・typecheck・build成功。以前の継続5失敗を解消、追加で観測した5秒timeoutはdisk-backed統合試験の予算だけ30秒へ変更し判定維持。部品一覧テストに販売単位fixtureと同一groupの保存済みsource参照回帰を追加。

ビルドの過大探索警告2件を解消。元の除外設定でもprivate作業データ混入0であり、警告をデータ漏えいとは扱わない。runtime専用pathをbuild探索対象から外す注記だけで、リンク検査等の実行時保全は変更0。19route tracesで.local/.ai/test-results混入0、必要SQL32保持。独立レビュー重大指摘なし（Sol/medium明示要求、実runtime確認不可）。[検証proof](evidence/non-registration-maintenance-verification.json)。

登録/画像加工/実保存先の書戻し・復元/Supabase書込0。使用可能12,183/全Part12,219/Asset15,217/Design3・全旧行/archive/registry/Design不変。登録・加工・自動再開は**PAUSED維持**。既知5失敗の古い記述は今回proofにより更新済み。実機/cloud/実物精度/電源断/実ライブラリ復元は未受入。再開指示までは下記登録工程を実行しない。

## 登録停止時のcheckpoint

2026-10-29T12:19:48.009Z checkpoint。両planner順実行、実SQL **使用可能12,183/20,066、配置残7,883**。公式27,046/除外6,980保持。全Part12,219/Asset15,217/Design3、穴接続0。今回12,178→12,183実5、再開後884。未完・ユーザー指示で登録/自動再開PAUSED。[今回summary](evidence/heartbeat-20261029-cohort014-summary.json)。

最新実delta **2026-10-29T12:15:33.496Z** [cohort014実5検証](evidence/finite-v3-cohort014-verification.json)。MOPラウンド2/3/4/6/8mmのown全文「粒の大きさ」/原ラベル/購入長・数量/primary/native原/加工を別審査、全予定crop/BOX/seedを加工前凍結。prepared5/distinct高画像1/採用5/実保存5。未知approximate strand購入原文とoffer価格保持、購入spec/粒単価生成0。first28440/lock一致、終了2026-10-29T12:14:51.480Z→created5別保存→rerun0/終了2026-10-29T12:15:10.920Z→4画像API hash/fullPart/source/価格tag購入/一覧/全旧PartAssetarchive registry全3Design保全。監督37904/wrapper3836、rerun PID未観測、全終了0。prep13472終了0。33204はseed境界validationのみ失敗、scope/catalog/binding/pixels前の未公開座標を修正、native再試行0。

## 再開指示を受けた場合の次の実作業

**天然石ラウンドカット MOP2mm** kiwa:8710255575332:55235236266276、own別原 **9dbcae8c47ca094a80325523f6b9a330b9a61bfad23ab4ddd212b278ee5ce139**。[source audit](../.local/setup/mother-pearl-cut-next-source-audit.json)。本文は「小粒の天然石」「細かなカットが入ったラウンド形のビーズ」、穴0.4mmと購入約19cm/約85ヶをBODY2mmから分離。primary/native800原は確認済。**写真対応・opaque方式適合・孤立全体輪郭の審査未完、準備/採用0、cohort015未作成**。audit内の他4チャームは対象外（石/組立寸法を流用しない）。現99 finite/quality/販売/SQL/negative/全prepared交差→原の対応・全体輪郭・方法内の材質が成立した分だけ全共有予定crop/BOX/seedを凍結→初回加工→別審査。透過/隣片/欠損なら加工せず別候補へ移る。

MOPナチュラル3のbracelet別原bb945...は、primaryが黄金色・別原の選択粒が白色でexact仕上げ対応未立証。加工/採用0、恒久holdにはしない。[対応保留記録](../.local/setup/mother-pearl-natural-correspondence-pending.json)。gallery association/天然の個体差だけで合格にせず、この写真調査を反復しない。登録済MOP014原e25d...を再加工しない。

## 有限保留と凍結

**mirrorball3/4mmを次sourceへ戻さない。** 旧metal意味保留を見落とした011/013のBODY審査は無効。013写真合格1もsource意味不成立で未登録採用を撤回、元8masterへCAS復元した後、今回の有効5だけ追記した。013 source/Asset SQL0、scope/plan/output/reviewer/key/cache/画像を証拠保持、再利用禁止。[判断](evidence/cohort-legacy-dispatch-contract.md)・[撤回receipt](evidence/cohort013-source-meaning-revocation.json)。

freeze/preflight/bridge採用/registrarがpinned exact hold metal8/natural68/pearl20/official3＝99を拒否。family一般化・旧fixture変更0、写真合格/unit所属では解除しない。回帰3修正前失敗→24対象tests成功、共通/旧V3のheld CLI負例も画像0/SQL0。今回active13の意味hold混入0、意味hold対象5tests再成功。[guard proof](evidence/finite-source-meaning-hold-correction-proof.json)。Sol明示要求・actual runtime確認不可。旧recipe採用pendingを共通routeで自動skipしない。

cohort011 native ROI1、012胡粉native MULTIPLE_COMPONENTS1→alias1停止、013写真1/意味hold、010opal3native失敗、008紫2輪郭欠け、007blue native失敗、005petal native失敗、004baroque不採用、001/002/003失敗を凍結。negativeは旧単調prefix維持。同原/crop/BOX/seed/time変更で再試行禁止。V4white37実1、自然石旧失敗群/TOHO/Delica52も再試行しない。catch6全体BODY/shell2透け感は範囲未確定で加工0。

## 保存経路・保全条件

[共通契約](FINITE_NEW_INPUT_COHORT_SCALE_CONTRACT.md)。catalog15 entriesは追記証拠、採用許可ではない。新mode alternate-background-cohort-v3、schema2 campaign-new-cohort-adopted-v3.json / new-cohort-work-state-v3.jsonは**採用13/verified13、未登録採用0**。V2新33+旧V3 4+V4 1+新共通13=51、旧campaign48込み99。旧fixed7/master4/journal/画像key/reviewer/time保持。

queue: node scripts/queue-finite-cohort-work.mjs <new-dir> → node scripts/run-campaign-finite-cohort.mjs run-registration-queue <queue> <evidence-dir> → verify-registration-batch <config>。採用分だけsingle writer最大250chunk。初回終了後実created別保存→rerun0→増分4API/fullPart/source/購入価格tag/一覧/全旧PartAssetarchive registry全Design→journal CAS。session終了を待って依存処理。013 queueと009元失敗queueは再起動禁止。

共有原sibling保存は全意図sourceの事前凍結/加工/審査/採用と、同一manifest/cohort/scope/preparePlan・exact own Part/Asset/key/hash/envelopeのcommit前live照合だけ。foreign/orphan/未採用owner拒否。terminal loaderはnative失敗＋画像なし・別未加工own原/live sourceAsset0/全旧receipt/read-set固定だけ。画像不採用/成功後再開、意味hold解除、同原救済禁止。

localSQLのみ/Supabase0。全旧Part/Asset/archive/registry/全currentDesign保持。品質245以上/元85/TOHO16/全旧hold解除0、空tagItaly27のみ。最小販売単位/終息/旧品/切替待ち除外、名称部分一致工具風charm除外0。販売長/線径/内径/穴径/fit/別部品・組立部分BODY化、穴接続/粒単価/架空tag0。参考写真カード拒否、未加工別原の方法改善だけ。#4809旧保持20新版既登録、再質問不要。Delica DB179/DBC3限定・DB22L1hold/失敗52維持、他有限契約へ一般化禁止。全suite旧5失敗は上記非登録整備で解消、524tests再検証済。build/restart/galleryOCR再取得/既登録再加工0。全20,066使用可＋全27,046公式対応＋既存保全実証時だけ完了。
