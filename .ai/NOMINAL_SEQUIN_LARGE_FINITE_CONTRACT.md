# 大型ブラジル製シークイン30件 — 有限名目BOX設計契約

2026-10-25。対象は `.local/setup/sequin-pending-source.json` SHA256 `288d38ed4616d7402ab32ef022a6e051ea38cf80ce135acfed17dba9499ff0ab` のうち、下表の `other` **ちょうど30 draft** のみ。既存 `.ai/NOMINAL_SEQUIN_FINITE_LABEL_CONTRACT.md` の48件、既存の一般40mm parser、登録済Part/Asset/cache/outputを変更しない。ADOPTED / IMPLEMENTED / 23 REGISTERED, 7 IMAGE-QUALITY HELD。有限30件の77mm上限だけを実装し、旧40mm branch/既存48件は維持。初回23・再実行0・全原高API hash/read-back/一覧/空接続・原Part/Asset/3Design保全を検証（evidence/nominal-20261025-sequin-large-verification.json）。

## 根拠と境界

- own `name` のサイズ部分と `sizeText` は30件すべて完全一致し、own `description` は「特別に生産されたPVCを使用したハンドメイドのスパンコールです。」で始まる。必須3タグ、先頭gallery URLが全件にある。30商品・30先頭URL。BODYの厚み約0.3mm、販売個数、穴の記述はBOX寸法に使わない。
- 内側は `約{positive decimal}mm` 6件、`約{positive decimal}×{positive decimal}mm` 24件。寸法各値は1/40mm格子で、最大77mm。prefixは raw `1,2,3,4,B1,B2,B4,６` の有限値。`６` は**原文全角のまま照合・保存**し、解析に限りNFKCで`6`として扱う。新しい`6`原文や他の全角prefixを一般許容しない。
- `prepare-body-box.mjs` は40px/mm出力でなく、1/40mm ticksのGCD比から長辺おおむね256pxを出す。30件の候補BOXは長辺195〜256px、短辺24〜256px。最も細い53×6mmも212×24px。`prepare-czech-crop.mjs` のcrop境界と `prepare-category-box.mjs` のreview・cache keyは寸法値に40mm上限を置かない。`canonical-photo.mjs` は90°時に画像とBOX軸を共に反転する。登録経路のDB checkはnodeの正幅・正高さ、Assetの正pixel/scaleを要求するが40mm上限はない。picker/placementも正の有限値を使う。ただしこれらは写真が単一個体・全外周である証明ではない。
- `pearl` の40mm超2件はregistry分類と素材説明の衝突で対象外。壊れた `3(約17mm(mi×))` 4件も対象外。新しい一般上限77mmを認めたわけではない。

## 実装契約

既存 `kiwa-own-photo-category-box-v1` の有限source branchに、**別の`large` bindingか新しいlarge専用labelKind**で上限77mmを閉じ込める。小型48件のbinding、出力、画像key、prepared cacheに変更を加えない。単なる `sequinBinding.maxMm=77` をcallerが任意指定できる形は不可。採用するなら下表の`sourceDraftId -> 完全object SHA256 -> rawLabel -> bound=77`をコード内定数で固定し、caller値を厳密照合する。既存の旧labelKindと小型bindingは40mmのまま。新labelKind方式なら同じ寸法意味でも判定後の既存BOX出力意味を保つ。

各draftはsource registry SHA256、完全object SHA256、id/productId/variantId/SKU/name/category/tags/sourceUrl/description/first image URLで拘束し、原raw labelを先に完全照合する。その後にのみ有限prefixと厳密な括弧1組、`約`、mm、scalar/pairを解析する。scalarは暫定正方形、無軸pairは原第1値を暫定BOX幅・第2値を高さに置く。掲載軸、物理幅高さ、画像尺度、サイズ別外観は未確認のまま。写真からサイズや穴・接続を推定せず、connection points/through holesは空、connectionReady=false。

原画像bytesとreview済crop/姿勢を照合し、原画像と加工画像の**それぞれ**で単一個体、全外周、適切なcrop/姿勢を審査する。既存`BODY_BOX_PHOTO_REVIEW_REQUIRED`や加工失敗は品質保留として記録し、guardを弱めない。画像reviewの再利用は同一原hash・review・crop・rotation・BOXの場合だけ。最小販売単位、廃番、品質保留、既登録sourceDraftIdはrecipe判定より先に評価する。採用分のSQL/local保存は既存workerの原・加工Asset分離、保存直後read-back、再実行追加0、旧Part/Asset/Design/registry不変、`cloudWrites=0`を確認する。

## 固定30件（source順、SHA256は`JSON.stringify(draft)`のUTF-8）

| sourceDraftId | raw sizeText | 完全object SHA256 |
|---|---|---|
| `kiwa:8944998383908:47625652863268` | `B2(約54×36mm)` | `a7fed77bb5d0fce23b8455d1608c8db892a04ccbdf980c79476aac62054cdbcd` |
| `kiwa:8945000251684:47625655845156` | `B2(約70×10mm)` | `2bef63369e1586e7a9831275681923c993399096350ab733184eb273a6795108` |
| `kiwa:8944997630244:47625650438436` | `3(約65×17mm)` | `acea19a0d837c7b872c5463beff7b7643859d2d75685227f3b26a0fce511b478` |
| `kiwa:8945000448292:47625656172836` | `B2(約70×10mm)` | `73a13c04a537e46f5c59e58bd51b7f803775bae58a805addc2e3faf3f10b3791` |
| `kiwa:8944998449444:47625652961572` | `B2(約54×36mm)` | `c30473ce87e9587302101038feb95ef0fec478277253b9b90547e595a82469a3` |
| `kiwa:8944998220068:47625651781924` | `1(約43×12mm)` | `eebb7f5b60450a493026935b9e09b97ebe9bcc630948da4143dbe340e4e4d443` |
| `kiwa:8945000481060:47625656238372` | `B2(約70×10mm)` | `1982173188a3192d1b2235f51fbb95b747823338ce696cfbc9932653bdb9e600` |
| `kiwa:8945000677668:47625656566052` | `3(約61×19mm)` | `55bfc49a9fdcfc28949fc2a17429fd25f6ac905547f2b7d5d61aadc5e853741d` |
| `kiwa:8944998088996:47625651618084` | `1(約43×12mm)` | `4fda7d9cdbbac84aaf5a2b8947ed94e17bd48a8c86083472500ecf62c6286518` |
| `kiwa:8945000710436:47625656631588` | `3(約61×19mm)` | `0b6c308b524a2867f3acf97c1908a21d6dd33dddf3c17465a7528453a2afa55f` |
| `kiwa:8944999629092:47625655025956` | `B1(約60mm)` | `55e35b0e14c803afebdc0c883be0d2267019a4a17d4fdd314b6d44f7be0a371f` |
| `kiwa:8944998154532:47625651716388` | `1(約43×12mm)` | `c3068631ce673186758a788208a596a3ec940fb2fe94f8902076bd3998ae14e4` |
| `kiwa:8944999858468:47625655320868` | `1(約53×6mm)` | `8f01b30eff9bd2ab94fe411841b2184c56749b812c830d461a83ca779ab2c9fc` |
| `kiwa:8944997466404:47625650209060` | `６(約55mm)` | `dfbfa25debccfe232e6e4e325bfbb8f478c09ed57347d9fd1bef90d4a00ac99c` |
| `kiwa:8944999956772:47625655419172` | `1(約53×6mm)` | `5a3df8b79606e9ce7a38b7f3352d60e12707ffdd4bb0e882b5eefd326bd33433` |
| `kiwa:8944998252836:47625652404516` | `1(約43×12mm)` | `f2eea03b85afa48020badc9c6e304f0f0b9a41ac71c5d9f4a41441134e275f3f` |
| `kiwa:8944997859620:47625650635044` | `4(約60×20mm)` | `24e912798bbd30f64f003e3b80118247a9b7109fbe69bd721b682bc84fd7d217` |
| `kiwa:8945000087844:47625655615780` | `2(約57×13mm)` | `8ff4711be0b93af6319d77e9d44478961cb60d37c0a5c46a1ae7ce175b31eded` |
| `kiwa:8945000841508:47625656795428` | `3(約61×19mm)` | `fff64e33a59eca810d21bccce6a08db975c4d5ede98d30e71e74f83133003212` |
| `kiwa:8945000022308:47625655550244` | `1(約53×6mm)` | `9bc775174d32b0436bf0e2f57e9cdad982a4d9ad7954f7941e78f21b4e109692` |
| `kiwa:8945000808740:47625656762660` | `3(約61×19mm)` | `30e8363d9da1e10fe094013fb53a6eca7b5a197fdd9aade6198f840b69213143` |
| `kiwa:8945000120612:47625655648548` | `2(約57×13mm)` | `c9128cc2f03bb25b5f05304ae8e49d42cf8e7f76dcccf3968ee298da21b74137` |
| `kiwa:8944997499172:47625650241828` | `６(約55mm)` | `48d47298581764852651f66cf9be5a4870531fa11a812f8b7eb18fa48dd8462d` |
| `kiwa:8944998646052:47625653289252` | `B2(約54×36mm)` | `12539851172daa5e952b9fb5b39641aa83698234f0555b025d7712cdd394293d` |
| `kiwa:8945001627940:47625658761508` | `B1(約73×25mm)` | `a9c730904ab0ae487efdb1972e02c883297f0e216889b8936e0d79ed9fc87286` |
| `kiwa:8945001169188:47625657221412` | `B4(約77mm)` | `f5faceec8338bc9a986dd60d5ec553728ddbe78e5f8d5399e8924859a9ecb3a3` |
| `kiwa:8945001791780:47625658958116` | `B1(約50mm)` | `76ce1372c412d2a2c9970f5d82bdd8a5710182266fd495a2cb84a87c36b5bdb9` |
| `kiwa:8945000546596:47625656336676` | `B2(約70×10mm)` | `3cfc9154da137784787be5d04dcbabe90fc092ef9be7fccf85cab0a9da094032` |
| `kiwa:8944999792932:47625655288100` | `B1(約60mm)` | `fe0db509ebb2ea07cbd0fad68672c32bb5e37e6750955db0fbe9a3ae8b38bb36` |
| `kiwa:8945001693476:47625658859812` | `B1(約73×25mm)` | `a0a9f0b79c1c4a4beaebef37107bee01a69c0e8dfae454ab3d3bb8ac3aa611d5` |

## 受入・拒否試験

- Positive: 50、77の境界、43×12、53×6、70×10、73×25、全角`６(約55mm)`のraw保持と55×55暫定BOX。30 source hashが一致し、30件すべてがただ一つの有限branchで解析される。原prefix/内側/全文とsource identityを出力し、unknown flags、空穴/接続を保持する。
- Negative: 非列挙ID、同ラベルの別object、`pearl`2件、壊れた4件、78超、0、1/40mm格子外、追加括弧、`x`、範囲、3軸、単位欠落、厚み・販売数量の転用、原文`6(約55mm)`へのすり替え、写真URL/hash/product association差異、未review原・加工写真。既存一般labelKindと小型48 bindingでは41/77を拒否する。
- Integration: 旧48件のspec/cache key/加工bytesと既登録状態を比較する。品質保留はSQL書込0。採用分のみ保存・read-backし、再実行追加0、旧Part/Asset/Design/registry不変、`cloudWrites=0`。実Designが空なら非空Design保全の実証とは記さない。
