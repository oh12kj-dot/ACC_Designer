# ブラジル製シークイン有限ラベル — 設計契約

2026-10-25。ユーザーが今回の残件登録を再開した範囲に限る設計。初期48件branchは実装済み・43登録/5品質保留。別の大型有限30件branchで23登録/7品質保留。87全体は66登録/12品質保留/9意味・分類保留。検証は nominal-20261025-sequin{,-large}-verification.json と nominal-20261025-sequin-partition.json。旧 `.ai/NOMINAL_REMAINING_BATCH_CONTRACT.md` と `.ai/ALL_VARIANT_MAPPING_CONTRACT.md` の一般停止記載は今回の明示的再開指示に従う。ただし最小販売単位・廃番・品質保留の判定は解除しない。

## 固定入力と正確な上限

`.local/setup/sequin-pending-source.json` SHA256 `288d38ed4616d7402ab32ef022a6e051ea38cf80ce135acfed17dba9499ff0ab` の87 immutable draft、68商品・68先頭gallery URLを確認した。全87件が `OLブラジル製シークイン`、`SALE商品`、`アウトレット` の3 exact tagを持つ。81件はregistry category `other`、6件は `pearl`。全nameに ` / {own sizeText} / ` がある。own BODYの冒頭は特別生産PVCの手作りスパンコールを説明し、厚み約0.3mmは本体幅・高さとは別値。4件は異形ミックスのアソート説明を持つ。

| 原ラベルの状態 | other | pearl | 計 | 判定 |
|---|---:|---:|---:|---|
| 有限prefix＋概寸scalar/pair、各値0超40mm以下・1/40mm格子 | 48 | 3 | 51 | `other` 48のみサイズ意味の候補上限。scalar25、pair23、41商品・41先頭URL |
| 一つでも40mm超 | 30 | 2 | 32 | 現行40mm境界で保留 |
| `3(約17mm(mi×))` | 3 | 1 | 4 | 壊れた原ラベル、かつアソート。補修・単一形状推定せず保留 |

`pearl` 6件は素材説明とregistry categoryが衝突する。categoryを暗黙に`other`へ変更したり`pearl` Partとして登録したりせず、別途registry分類の根拠を確定するまで保留する。48は**parser・category上限**であり、販売単位、廃番、品質、BODY、原/加工画像review、SQL重複を通った採用数ではない。登録可能確定数は現時点0。

## 最小の実装契約

既存 `kiwa-own-photo-category-box-v1` の `categoryBoxNominal` に**明示的な有限branch**を追加する。同じ正方形/無軸2値の暫定BOX、写真加工、unknown表示、category `other`、空の穴・接続を使うので別recipeは不要。新recipeにすると同じ意味のimage pipeline/dispatch/保存分岐が増える。旧4 `labelKind` と既存rule/出力/cache keyは変更しない。新branchだけ `sequin-prefixed-scalar` / `sequin-prefixed-unlabeled-pair` と source binding を必須にし、`publishedSizeLabel`には原文全体、別fieldに厳密なprefixと抽出した内側の原文を保存する。新branchのimage keyが旧specと衝突しないことを確認する。既存加工versionを一律変更しない。

1. 対象をsourceDraftIdの有限manifestで列挙し、各行に `productId, variantId, sku, name, category, tags, sourceUrl, sizeText, descriptionSha256, imageUrls[0], family, labelKind, exactPrefix, exactInnerLabel, bodyReviewed` を持たせる。registry全体SHA256とmanifest SHA256を起動時照合する。既存ruleの`description`完全一致・own BODY prefix、galleryのURL/原bytes hash/productIds、review identityも維持する。familyは各own nameの` / `以前をexactに固定し、色・仕上げ名を汎用除去しない。source原文を書き換えない。
2. 有限prefixはこのsnapshot内の `1`,`2`,`3`,`4`,`B1`,`B2`,`B3`,`B4` のみ。`６`はNFKC後`6`になっても55mmなので保留。各行の**raw sizeText完全一致**を先に照合し、NFKC/空白処理した値がprefix＋単一括弧＋厳密なscalarまたは`×` pairに合うことを確認する。実際の内側は `約{positive decimal}mm` または `約{positive decimal}×{positive decimal}mm` に限定し、prefixを寸法値として扱わない。`x`、追加括弧、範囲、3軸、単位不足、厚み・販売数量は拒否。抽出値は既存と同じ正/finite/40mm以下/1/40mm格子へ通す。
3. scalarは暫定正方形BOX、無軸pairは原第1値→BOX幅・第2値→BOX高さ。掲載軸、物理幅高さ、画像尺度、サイズ別外観は未確認のまま。写真が縦長に見える等を根拠に値を入れ替えない。`other`以外はこのbranchで拒否する。異形アソートや単一個体の全体サイズが不明な画像から任意の枠を作らない。
4. `scripts/prepare-category-box.mjs` の原画像bytes→レビュー済crop/姿勢→aspect contain/透明余白の既存経路を使う。各draft自身の先頭gallery URLとcapture hash/productIdを照合する。原画像とdistinct加工画像を別々に目視し、単一個体・全外周・姿勢・cropを承認する。41先頭URLの存在は41 distinct bytesや採用写真の証明ではない。同一hash/review/crop/rotation/BOXだけ画像reviewを再利用し、各draftのown associationとラベルは個別照合する。穴位置の説明があってもthrough_holes/connection_pointsは空、connectionReady=false。
5. 登録workerでは最小販売単位guard、廃番除外、既存quality hold、既登録sourceDraftId照合を**recipe判定より先**に維持する。SQL/local immutable Assetのみ。既存Part/Asset/registry/Designをbaselineと照合し、途中再開と再実行追加0、Part/Asset/API bytes・original/processed hash・実一覧・未確認表示・再起動read-backを確認する。原gallery/OCR cacheは既存のものを使用する。

## 必須の受入・拒否試験

- positive: `B1(約9mm)`→9×9、`1(約30×7mm)`→30×7、40境界と1/40mm格子。原prefix/内側/原全文とsource identityが保存され、category `other`、空穴/接続、unknown flagsで出力される。
- negative: 非列挙draft/prefix、raw label・variantId・SKU・name・sourceURL・description hash・tags・category・先頭gallery URL/capture product associationの不一致、別商品のBODY引用、`pearl`へのfallback。
- negative: `B1(約50mm)`、`B2(約70×10mm)`、`3(約17mm(mi×))`、任意の追加括弧、`x`、範囲、厚さ0.3mmの幅転用、内径/販売長/販売個数、異形アソート写真からの単一枠、未review原/加工画像。既存scalar/pair/H/Wと旧加工key/出力の回帰を確認する。
- integration: guard/obsolete/quality対象はSQL書込0。許可済みだけ逐次保存し、保存直後read-back、再実行追加0、既存Part/Asset/Design/registry不変、cloudWrites=0。実Designが0件なら非空Design保全の実証とは呼ばない。

次工程は有限manifestとbranch/test実装→48候補のguard再照合→own原/加工写真review→採用分のみ登録・統合検証。残39件は排他的に、bounded `pearl` 3、40mm超`other` 30、40mm超`pearl` 2、壊れた原ラベル4として理由付き保留する。
