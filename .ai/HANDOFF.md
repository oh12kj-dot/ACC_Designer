# ACC Designer 引継ぎ

ユーザー指示で一時停止中。登録・加工workerなしを確認。明示的な再開指示まで登録/加工を開始しない。

## 登録以外の整備（2026-10-29 JST）

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
