# 残件登録の処理量契約（提案・未実行）

2026-10-25。対象は現行の配置対象残8,440件を、受入条件を変えずに最短で処理する運用・必要最小限の道具立て。これは写真採用、登録成功、完了時刻の承認ではない。本設計作業ではsource、hold、Part、Asset、Designを変更していない。Sol/Mediumを依頼されたが、この実行環境から実際のmodel/effortを確認できないため、確認済みSol審査とは呼ばない。

## 判定

**現時点で「数時間以内に全件完了」は約束できない。** `placement-scope.json`（SQL確認 2026-10-25T12:45:45.876Z）は公式source27,046を維持し、配置対象20,066、登録11,626、残8,440、対象外6,980。補正済み`.ai/evidence/registration-throughput-blocker-inventory.json`では寸法意味7,022、BODY/recipe477、販売単位identity873、その他68で、合計8,440を照合済み。既存adopted 19manifestの現SQL照合による未登録採用は0。大きい上位30作業グループは計3,294件に過ぎず、残件の約39%。しかも候補数であってBODY・写真採用数ではない。群内には販売長、線径、内径、適合径、非最小販売単位、旧品、複数物体が混在する。例えば`crystal:1088` 223候補の標本は「シングル石座」でSS値を本体BOXにできず、`MIYUKIデリカビーズ`183候補のBODY意味は未承認。TOHO難写真102件も残る。

4時間なら平均35.2件/分、6時間なら23.4件/分の**検証済み純増**が必要。原/加工のdistinct画像審査数、適格BODY数、処理速度、全残件の拒否理由・不足根拠がまだ揃わず、この速度の達成可能性を測れない。SQL書込速度のみの予測は禁止。

## 最短安全ルート

1. **固定snapshotと差分台帳。** 最新SQLのactive/archived `sourceDraftId`、固定registry SHA256、最小販売単位・除外manifest SHA256、既存promotions、既存hold、全Part/Asset/Designのbaselineを一致させる。現時点の補正済み理由台帳は8,440全件を排他的に数えるが、理由は受入可能性ではない。`.local/setup/remaining-product-review-batches.json`は5,608商品、3,829distinct説明、5,607distinct先頭写真URLを列挙し、BODY単語候補436商品は未承認。全27,046sourceと対象外6,980は削除・再分類しない。
2. **既採用分を最初に照合。** source/hash/BODY/原/加工レビューが現入力と完全一致し、hold対象外のものだけ既存recipe・immutable cacheで有限batch化する。現照合で未登録採用0なので、この段階の登録batchは空。過去のティアドロップ採用済み未登録13という記述も現SQL/holdとの一致なしにreadyへ数えない。既登録画像を再加工しない。
3. **大群は意味で割る。** `placement-scope.json`の理由と実draft本文・寸法・galleryを使い、単なる先頭tokenのfamilyを exact product/variant/販売単位/本体寸法意味/既存recipe で分割する。例：chainの販売長はBOXに使わない。石座のSS・適合石径、丸カンの線径・内径、カツラの内径、リボンの幅と販売長は、全体外形の別根拠がない限り保留。MIYUKIデリカ183は既存の別種MIYUKI drop bindingから意味を転用しない。最初の具体的審査batchは、意味解析より写真だけが主障害の`CZECH_SINGLE_OWN_PHOTO_NOT_REVIEWED`12件と`ROUND_BEAD_PHOTO_NOT_REVIEWED`3件を現hold/recipeと再照合して選ぶ。各原/加工が不採用なら即停止して他群へ進む。続いて寸法意味7,022件を正確な商品/説明群に割り、既存recipeで正当に表せるものを先行する。新意味やgeometryが要る群はsourceごとに理由を残す。family件数を承認件数にしない。
4. **審査をまとめ、採用は個体で固定。** 同一のexact BODY文/hashは一度意味判定してよいが、各sourceのproduct/variant/SKU/説明/掲載値/販売単位照合は省略しない。原画像と加工画像を別contact sheetで並べて連続目視し、各distinct `source URL + original SHA256 + crop + rotation + BOX + transform version + processed SHA256` にreviewer/時刻/採否を残す。さらに各sourceのgallery associationとvariant外観を照合する。previewサンプル、OCR、加工成功を採用扱いしない。単独個体の完全性・分離性・輪郭・色/型番対応が不明なら有限理由で不採用。同じ失敗cropを反復せず他sourceへ進み、TOHO102は最後の別キューに置く。
5. **有限batchを書き、増分検証。** 現行single worker lockの下で承認済みIDだけ登録する。100–250新Part程度で区切り、25件ごとのatomic checkpointと各save直後のSQL read-back、再実行追加0を維持。各batchで新Partのsource/BODY/BOX/カテゴリ/unknown flags/空穴接続、原・加工Assetのfull hash/API bytes、購入/価格/タグと実一覧、全既存Part/Asset/Design/archiveおよびregistry不変を照合する。停止条件は重複source、入力hash/manifest変更、workspace違い、既存差分、live lock競合、承認のない写真・寸法。候補単体の拒否は理由を記録して次へ進む。family毎のbuild/サーバ再起動/全画像再検証は行わず、統合境界で一度実施する。cloudWrites=0。
6. **現実的な時間判定。** 最初の大きな同条件batchで、適格率、原/加工distinct審査枚数と所要時間、登録・API検証の実測、残件理由構成を記録する。残8,440すべてに必要な審査/根拠を積み上げた上限時間が残り時間に収まり、人の審査能力も確保できた場合のみ締切を提示する。登録済み件数だけで完了を宣言しない。

## 新たな道具が必要な場合の境界

既存`categoryBoxNominal.ts`は有限rule、BODY一致、own photo SHA/association、画像review、label文法とBOX上限を強制し、`register-nominal-parts.mjs`はsingle lock/read-back/25件checkpointを持つ。一方、現在のpreviewは最大12画像の抽出表示で全画像レビューではない。処理量改善の最小追加は**読取専用の全残件差分台帳と、全distinct原/加工を欠番なく列挙するreview manifest/contact sheet生成**。manifestは候補を採用に昇格させず、`sourceDraftId`、正確な入力hash、拒否理由、review statusを記録する。登録側の新しい入口が必要なら凍結済みmanifestのID/hashだけを読み、未承認・重複・hold・変化したsourceをfail closedにする。写真の自動採否、任意寸法なし画像枠、既存recipeの意味拡張、hold解除は設計対象外。

この追加の実装前に、(a) 20,066対象/11,626登録/8,440残の排他的再計算、(b) groupとsource identityの重複・販売単位混同拒否、(c) 適合径/内径/線径/販売長/MIYUKIデリカのBODY誤採用拒否、(d) original/processed片側レビュー欠落・hash違い・gallery違い拒否、(e) 既存holdと登録済み再加工拒否、(f) checkpoint中断/再開・rerun0・全Design/Asset/Part不変・cloud0をtargeted試験にする。実装・試験合格は写真採用や全件登録の証明ではない。

## 完了条件

同一時点の実SQL/read-backで配置対象20,066件がすべて使用可能、残0、公式source27,046/対象外6,980と全既存Design・Part・Asset/archiveの保全、全採用画像の原/加工identity、各sourceの購入情報と一覧、空穴接続、再実行追加0、cloudWrites0を確認した時だけ「全件完了」。条件を満たせない個体は具体的根拠不足と件数を示し、保留のままにする。保留を残した状態は全件完了ではない。

参照: `.ai/HANDOFF.md`、`.ai/NOMINAL_REMAINING_BATCH_CONTRACT.md`、`.ai/ALL_VARIANT_MAPPING_CONTRACT.md`、`.local/calibration/nominal/placement-scope.json`、`.local/setup/registration-throughput-priority.json`、`src/server/categoryBoxNominal.ts`、`scripts/register-nominal-parts.mjs`。
