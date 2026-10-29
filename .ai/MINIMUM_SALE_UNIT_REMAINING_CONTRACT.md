# 最小販売単位整理 Stage 2 追加契約

2026-10-19。設計追加のみ。親契約 `MINIMUM_SALE_UNIT_CONTRACT.md` の保全・identity・transaction・再登録防止規則を継承する。一般登録/監視はPAUSED。SQL実行、新規登録、再取得、画像加工を本書の作成に含めない。以下は実装可能な限定条件であり、削除承認manifestや整理完了証明ではない。

## 固定入力と残件

ローカル固定資料だけを調べた。入力は次のSHA256へ束縛する。変更時は再観測し、古い対象リストを使わない。

| 入力 | SHA256 |
|---|---|
| `.local/calibration/minimum-sale-unit/held-source-review.json` | `9e511193ce7df9b20cedae9d0fde7053be572029e393ad526e973e07a9068c53` |
| `.local/calibration/minimum-sale-unit/after.json` | `b08fc13068221550f1bf8fed9c38615b521e5c092319bd586adc7a257df07019` |
| `.local/catalog/catalog.json` | `a18dc79933b952a0663c95327df44e27f3bdd4450ab4394c980469a64bd2ad0c` |

現行複数active Part保留546群は数量原文458群、width衝突44群、category衝突44群。先行整理の4,755 delete/1 archiveを再計画せず、その実行証拠は `.ai/evidence/minimum-sale-unit-cleanup.json` に置く。source27,046、Design1、Asset13,073、blob、利用履歴の保全要件を変えない。以下の件数は追加判定候補であり、追加削除数ではない。

## 有限文法の追加

すべてpurchase-optionの一意完全一致、同一productId、同一purchase-option index、全非購入optionの位置・原文完全一致を先に満たす。parentで証明済みのcross-product familyは別経路として維持し、ここで新設しない。実装時manifestは元groupId、全source ID、原文、適用rule、根拠hashを列挙する。下記文法が他の新規sourceにも合うことだけでは自動採用しない。

1. **包装移動markerと限定空白（285群）**。現行保留の`(大袋)_移動`だけを包装管理markerとして解釈できる。根拠はmarkerと独立した上記same-product identity、または既存の証明済みfamily。`_移動`の有無からidentityを作らない。`(大袋)_移動【取寄商品】`、`(大袋)_移動 【取寄商品】`、`(大袋)_移動`を完全一致の有限suffixとし、通常数量の後の` 【取寄商品】`も許す。許す空白はこの位置のASCII space一つだけ（既存NFKC後）。任意空白・括弧・状態語の一括削除は禁止。数量102/86/58/33/4/2群の合計285群。`10ヶ < 1440ヶ`、`20ヶ < 1000ヶ`で選び、同じ1000ヶ二候補は親契約のtie規則を適用する。原文marker/空白/取寄表示は保存する。未証明の別productIdを画像filenameだけで統合しない。
2. **正確な主重量＋slash補助概数（6群）**。現行チェコシードの`5g(約165ヶ)`と`100g/約3300ヶ(大袋)`等、固定6群だけに`<正の正確重量>g/約<正整数>ヶ(大袋)`を追加する。選択は正確重量5g<100g。補助概数はapproximate=trueの別情報に置き、piece換算・正確個数・1個価格へ使わない。主重量の約表記、個数/重量の主従逆転、未知残余はhold。
3. **個別パールの連売包装class（159群）**。既存39商品・159群は公式catalogの`樹脂パール丸`tagと各自のdescription（人工パール、穴の塗装、表面加工等）を持ち、現行member全てが`kiwa-round-pearl-nominal-v1`の個別粒径recipeで同群内width/height一致だった。この組合せを、個々のパールを一つのPartとする包装差の限定根拠とする。recipe名だけを公式根拠にしない。sourceごとにtag/description hash、非購入の粒径原文、recipe/diameter、全aggregateを検証して列挙する。

   許可形は厳密に`1本 約38cm/約?<正整数>ヶ(15インチ)`と`1本 約76cm/約?<正整数>ヶ(30インチ)`の二形だけ。固定ペアでは「15インチ表示包装」を「30インチ表示包装」より先にする有限class順序とし、38/76を正確長や実物の粒数として比較しない。親契約の一般length禁止に対するこの159群だけの例外で、`1本`同士のtieにも扱わない。約のない補助個数も原文のdeclaredApproximateを保存した上で、保証個数/主数量には採用しない。掲載総額は選んだ1本包装の総額。名目連長・インチ表示・補助個数をそのまま示し、1粒価格を算出しない。任意strand、チェーン、連結済み部品、実長自体が物理部品長である商品、tag/個別粒径根拠欠損、粒径/加工不一致には広げない。
4. **機能クラスプのset-count（4群のみ）**。`8716611485988`（石付/G）、`8716611780900`（石付/RC）の7mm、および`8716610732324`・`8716611125540`（No.12/G・RC）の約17×5mmだけ。各自descriptionが磁石式留め金具としての機能・構造を説明し、同一商品/サイズの`1セット`と`10セット(中袋)`を持つ。setは一つの機能クラスプ販売単位として専用unitに置き1<10で比較する。片側だけへ分解、pair/pieceへの換算、組とのaliasはしない。既存Partは現状のaggregateのまま、セット内容の画像/接続適合が確認済みとはしない。他のセット商品へ一般化しない。

## 保留を維持するもの

- オニキス1群：`1本(約20cm/約50ヶ)`と`31ヶ`。元descriptionも連の長さ/個数のばらつきを明示し、異単位の大小を保証できない。概数50>31という推定で選ばない。
- `5ヶ`と`144ヶ【取寄商品】(発売なし)`の1群：発売なしは承認済みの「終息/旧品/切替待ち」と同義に追加しない。残余を削ってparseしない。販売可否だけで状態語を解釈し直さない。
- No.10マグネットクラスプ2群（`8712669790500`・`8712670085412`）：原文は`2セット`/`20セット(中袋)`で、descriptionに在庫次第で仕様・形状変更との明示がある。set数の文法だけでは同一構成/世代を確定できないため、本追加では`SET_COMPOSITION_OR_REVISION_NOT_PROVEN`。同一世代を証明する既存source-bound根拠が別途得られるまで保持する。説明本文の変更注記をoffer除外語へ拡張しない。
- width/category衝突88群はfamily全体のholdを維持する。width例SS29はrange recipeの6.2mm（6.1–6.3）対table recipeの6.23mm（6.14–6.32）、SS39は8.3対8.285。近似値/重なるrangeは同一定義の証明ではない。category例#2201はgemの3.5×8対otherの8×3.5で、軸解釈も違う。categoryだけ無視してはいけない。

## 衝突family内の安全な部分整理

88群すべてに、同一productIdの2 active memberで親契約のphysical全fieldが完全一致しrecipe名も一致するsubgroupがあることは確認した。ただしこれだけで全aggregate互換性は未証明。family全体をresolvedにせず、次の全条件で当該subgroupだけ`resolved-subgroup`にできる。cross-product memberはhold/preservedのまま、familyを一件へ集約したり非表示にしない。

1. subgroupは`parentGroupId + productId + purchase-option index + 全非購入option原文`で決定する。定義を都合よく合わせるための再分割/field省略や、同一product内の不一致memberの除外は禁止。subgroupに属する全eligible sourceと全active Partを入れる。
2. 親契約のphysical fieldをnull/欠損を含めて完全比較する。欠損を他memberの値で補わない。geometry_kind、category、全寸法・材質・色、path/connection/through-hole定義を全件検証する。child row ID/part_id/source ID等のidentity差は明示した比較schemaだけで分離し、それ以外の意味差を無視しない。未知field/child schemaはhold。校正/nominal根拠は各sourceへ正しく束縛され、同じrecipe・粒径/軸/diagram根拠・不確実性flagsで両立すること。写真bytes一致を必須にはしないが、差がある場合は既存許可済みsource-bound根拠を個別記録し、姿勢/切り出し/描画意味が不明ならhold。
3. subgroup外の全memberと衝突理由を明示する。subgroupの最小offerだけを計算し、family全体のcanonicalOfferと誤表示しない。parent canonicalOfferは未解決のままにし、read/register guardは残るhold memberを新規許可へ変えない。
4. strict校正優先→最小offer source優先→Part ID順という既存survivor順位を変えない。retained Partと全childrenをbyte相当のstable hashで固定し、一切更新しない。source/価格/画像/カテゴリ/寸法/根拠の移植や平均化、successor新設、normal/bulkを恣意的に優先する順位を禁止する。非survivorへの参照は既存規則でarchive、未参照だけdelete。参照snapshotは付け替えない。

full aggregate検証で差が残れば、そのsubgroupもhold。width tolerance、axis swap、category rewriteを導入しない。この限定整理が通った場合でも88親familyは未解決であり、残件0とは報告しない。

## 受入・実行条件

実装は現cleanup transaction/row lock/FK/immutability guard/journal/参照再観測の経路をそのまま再利用する。新しいcleanup mutation API、guard緩和、archive復帰、画像削除を作らない。新manifest versionで全27,046 sourceを重複なしにpartitionし、親familyとsubgroupのmembership/actionを二重計上しない。source identity/原文/価格出典は不変。全Part/childrenのbefore aggregate hash、survivorおよび全preserved hash、対象外hash、全Design aggregate/参照、全Asset metadata/blob hash、利用履歴を固定する。提案diffは承認済みfinite対象のarchive/deleteだけに限定する。

検証は少なくとも次を含む。

- 有限原文の正例（285/6/159/4候補）と未証明cross-product、任意suffix、未知空白/状態語、粒径違い、chain/length、約主重量、mixed-unit、No.10、発売なし、オニキスの拒否。有限source list外では新規文法だけで通らないこと。
- strandの15/30 class順と原概数/名目長保持。1本tieや正確個数比較/1粒価格にならないこと。setは独立unitでpiece/pairに混ざらないこと。
- subgroup内1 field差/null差/child意味差/校正矛盾/画像意味不明でhold。subgroup外の寸法/category衝突とPartをそのまま保持。順序入替でも同じsurvivor、strict優先、入力hash/aggregate変化/未知schemaでfail closed。
- 隔離DBで未参照delete、Design/successor/利用履歴参照archive、共有Asset保持、中断再開、二回目変更0。read側はresolved subgroup一件＋未解決memberを保持し、保存guardは新規hold/非canonicalを拒否し続ける。
- 実実行前後にsource27,046、Design1と全参照/内容、Asset13,073と全bytes、利用履歴、survivor/保留のaggregate不変を検証する。監視/一般登録PAUSED、cloud writeなしを維持する。実行数と残件数は生成manifest/現在snapshotから確定し、本書の候補数を実績にしない。

数量458群のうち454群は上記条件付き実装候補、4群は明示hold。別枠88群は全体holdのまま同一product subgroupの最大88件整理候補を持つ。全aggregate検証は実装時の必須gateであり、本設計調査では未実施。実装・検証・finite実行planの確定前に追加live整理へ進まない。
