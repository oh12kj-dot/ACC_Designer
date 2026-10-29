# 残り樹脂パール98ソース: whole-body nominal BOX 有限契約

2026-10-26、**実装済み / 写真採用68 / 登録・増分検証68 / 未採用30**。対象は `.local/setup/pearl-remaining-source-audit.json` の98 `sourceDraftId`・53商品・own本文25種。固定registry SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`。`.local/setup/pearl-finite-source-candidates.json` は98個の原draft全object/hashとown gallery captureを固定し、原hashは53種類。ただし capture は写真採用を意味せず、`dimensionEvidence` は全件null。mapping index、own name/tag/sizeText/本文全文を突き合わせた**寸法意味の事前審査**は78件 eligible、20件 hold。写真/加工/SQLの全gateを通った採用数はまだ0。

この文書は98件を一つのcohortとして扱う。`pearl` categoryを保持し、旧 `nominalRoundPearl` の selector・`樹脂パール丸` tag・recipeを変更しない。新しい独立recipe/key/cache（例 `kiwa-own-photo-pearl-body-finite-v1`）を明示dispatchする。名称やtagから球・diameter・底面高・穴径を推定しない。既存のPart/Asset/写真判断/デザインと、別案件のarchived `#4809` 23件には触れない。

## source別の有限意味判定

以下の `productId:variantId` はすべて `kiwa:${productId}:${variantId}` という**exact sourceDraftId**を表す。表にないこのcohortのIDは許可しない。表の値は実装用allowlistの入力であり、変更不能な元draft全object SHA256、原 `sizeText`、name、SKU、URL、tag、own本文SHA256との再照合を省略しない。

| productId | eligible variantId | 件数 |
|---|---|---:|
|10034415141156|50490970505508, 50490970538276|2|
|8710555304228|46968393007396, 46968393040164, 46968393072932, 46968393105700, 46968393138468, 46968393171236, 46968393204004, 46968393269540|8|
|8710555664676|46968394973476, 46968395071780, 46968395104548, 46968395137316, 46968395170084, 46968395202852, 46968395235620, 46968395268388|8|
|8710556090660|46968396218660, 46968396251428, 46968396284196|3|
|8710556483876|46968396939556, 46968396972324, 46968397005092|3|
|8710556942628|46968397693220, 46968397725988, 46968397758756|3|
|8710557204772|46968398348580, 46968398381348|2|
|8710557466916|46968398840100, 46968398872868|2|
|8710557729060|46968400019748, 46968400052516, 46968400085284, 46968400118052|4|
|8710558089508|46968400642340, 46968400675108, 46968400707876, 46968400740644|4|
|8710561300772|46968408736036|1|
|8710561530148|46968409162020|1|
|8710561825060|46968409882916|1|
|8710562185508|46968410439972|1|
|8710562545956|46968410997028|1|
|8710562906404|46968412078372|1|
|8710563299620|46968412864804|1|
|8710563627300|46968413389092|1|
|8710565527844|46968416698660|1|
|8710565855524|46968417714468|1|
|8710566248740|46968418140452|1|
|8710566674724|46968419582244|1|
|8710566936868|46968419975460|1|
|8710567297316|46968420532516|1|
|8710567690532|46968421220644|1|
|8710567952676|46968421712164|1|
|8710572212516|46968432001316|1|
|8710572540196|46968432492836|1|
|8710574637348|46968436850980|1|
|8710575325476|46968438194468|1|
|8710575554852|46968438980900|1|
|8710575915300|46968439308580|1|
|8710576144676|46968439898404|1|
|8710577258788|46968442356004|1|
|8710577488164|46968442847524|1|
|8710579257636|46968447336740, 46968447369508, 46968447435044, 46968447467812, 46968447500580|5|
|8710579650852|46968449237284, 46968449302820, 46968449368356, 46968449401124, 46968449433892|5|
|8710584107300|46968463655204, 46968463687972|2|
|9982890049828|50296488853796, 50296488886564|2|

意味の根拠をfamilyごとに固定する。片穴10件は名称・own本文の「片穴の樹脂パール」、縦穴ツユ16件とトップホールツユ6件は名称・own本文の個体種、スズマル3件は名称・丸みのあるパーツ本文と穴径を**別の値**として説明した本文、ハート2件はハート形の個体本文、カボション2件は平底の個体本文により、`sizeText` を個体の掲載サイズとして限定する。ナツメ12件と唐草2件は名称中の個体mm値と**別の販売単位**「1本 約38cm」を照合し、38cmや本数をBOXに使わない。唐草2件の既存 `樹脂パール丸` tagはそのまま保存し、旧selectorの `約6/8mm` 非該当を新recipeのexact IDでのみ扱う。残るバロック系はown商品名と本文に個体樹脂パールを記述し、サイズが個体側に付き、下表のランダム/範囲例外を除外したものに限る。本文の穴や推奨金具の記述は接続適合の根拠ではない。

**保留20件**。次のIDはallowlistから除外し、理由と原labelをsource別holdへ保存する。

| 理由 | `productId:variantId` |
|---|---|
| 底面値を伴うスリークオーター8件。`8mm(底6mm)`等から前面BOXの両軸を確定しない。形状変更注意もある | `8710582927652:46968459657508,46968459690276,46968459723044,46968459755812`; `8710583320868:46968461033764,46968461066532,46968461099300,46968461132068` |
| ランダムな個体形状・混合で代表写真とvariant形状の対応が未確定4件 | `8710569328932:46968424988964`; `8710564675876:46968415224100`; `8710565101860:46968416010532`; `8710569034020:46968424071460` |
| 単一個体値を持たない概寸範囲8件。中点や端点を自動選択しない | `8710576505124:46968440783140`; `8710576963876:46968441667876`; `8710572867876:46968432787748`; `8710574047524:46968435441956`; `8710573261092:46968433639716`; `8710573621540:46968434262308`; `8710571032868:46968428691748`; `8710570180900:46968427020580` |

## 配置仕様と禁止境界

- eligibleでも、最終の原写真・加工写真・association審査前は登録しない。`sizeText` はNFKC/空白正規化後、exact scalar `^(約)?Nmm$` 又はpair `^(約)?N×Nmm$` の有限ID指定labelだけを受ける。正・finite・40mm以下・1/40mm格子。元label、数値順序、approximate、source意味判定をspecへ保持する。pairは原第1値→BOX幅、第2値→BOX高さ、scalarは掲載値×掲載値の**暫定正方形BOX**。`diameterMm` は使わない。掲載値の物理軸、実幅/高さ、写真尺度・姿勢・サイズ別外観は未確認として一覧/編集/配置で表示する。
- これは個体全体の掲載サイズがある場合だけの配置枠。単位だけの任意frame、穴径・底径・適合金具径・販売長・線径・部分厚みの転用、範囲の中点、ランダムassortの代表選択は認めない。新しい意味を扱う場合はexact sourceごとに別の十分な根拠と設計判断が必要。
- 写真輪郭は暫定のown photographed projection。stretch/mirror/生成輪郭/穴補完/厚み推定をしない。`through_holes=[]`, `connection_points=[]`, `connectionReady=false`、単価を個体価格へ割り戻さない。公開購入単位・価格・通貨は元draftのまま。`category='pearl'` は保存とread-back両方で検査する。

## 写真、承認、登録のgate

1. 実装時に98件のfixed full draft/object hash、registry hash、raw own capture URL/hash/decoded dimensions/`productIds` associationを先に確認。関連商品画像、OCR、代表family画像を当該sourceの証拠として流用しない。原画像は53 distinct hashでも、source↔gallery対応は98件すべてで照合する。
2. eligible78件についてsource別意味rule（exact name/tag/description全文hash、元label、BODY根拠と競合値、reviewer/時刻）をmanifestに固定する。原写真は実際のraw bytesを表示し、単独・完全・同定可能な個体をsource別に原座標integer cropと姿勢/rotation理由でレビューする。複数物体の重なり、切れ、assort、source対応不明、細小品質はhold。原reviewの同一hash再利用はcrop/rotation/associationが同一のときだけ。
3. `prepare-metal-bead-finite.mjs` の最小patternを使い、pearl専用 `prepare-...finite.mjs`、固定manifest、承認record、専用transform version/key/cacheを追加する。原hash・full object hash・manifest hash・crop・rotation・BOX・recipe versionをkeyへ含め、旧roundPearl/metal-beadのkeyと混ざらない。既存のreviewed crop→aspect-contain透明余白のpipelineを利用し、原byteをoriginalとして保持。加工high/medium/thumbnailは**全distinct出力**を表示して別承認し、spec hash/image-key hash/各full SHA256で束縛する。preview/contact sheetは採用証明ではない。
4. minimum-sale/obsolete/quality/archived/source重複gate、現在workspace/manifest hash、既存Part/Asset/design baseline、single-worker lockを既存登録workerと揃える。対象1件の意味/写真holdは理由を記録し他件を続行。契約外、元registry差、workspace差、同sourceの異仕様既登録はfail closed。SQLは承認後にlocalの既存RPCで逐次保存し、cloud書込0。再実行追加0と中断復旧を確認する。
5. 各保存直後と再起動後、**全追加Part aggregate**でown identity/name/SKU/source URL/tags/category=`pearl`/sourceDraftId/spec/元購入単位・価格・通貨/BOX/unknown flags/空穴・接続を照合。**全distinct PartAsset**でasset kind/link/content hash/transform/key/承認record、original/high/medium/thumbnailの保存pathとAPI read-back bytesのfull SHA256を照合する。既存Part/Asset/design/registry/archive baseline差分0を検査。実designが0なら非空design保全の証明とは呼ばない。増分一覧・編集・自由配置・保存/reload・未確認表示を一度統合検証する。

## 最小実装と反例検証

新有限module+manifest+review/approval evidenceを追加し、`scripts/register-nominal-parts.mjs` にpearl recipe限定dispatch/category/read-back分岐だけを入れる。旧 `src/server/nominalPlacement.ts` のroundPearl selector・tag・既存出力は変えない。Next.js側の変更が必要なら、その版の `node_modules/next/dist/docs/` の該当guideを先に読む。

targeted negative: ID外/異なるfull object・本文・label・tag・SKU・own URL・capture association、`底`を全体高へ誤用、穴/推奨丸カン径をBOXへ誤用、38cm販売長と単価割戻し、範囲中点・random assort、`x`/slash/3軸/0/40超/grid外、旧roundPearlへの漏出、cache衝突、画像raw/crop/processed hash差、Part/Asset read-back差、重複再実行を拒否。positive boundaryは78 exact IDsの意味判定と正しい`pearl` BOX・不確実性表示を確認する。写真審査後の採用件数は証拠に従って78以下になる。

この設計依頼は Sol specialist + Medium を明示して行われたが、runtimeは実model/effortを返していないため、**confirmed Sol reviewとは記載しない**。

## 実行checkpoint

2026-10-26 JST。34+16+12+6の68登録、各初回実保存→正式rerun0。全追加の4画像API hash/一覧/aggregate/購入価格・tag・source snapshot/原Part Asset archive registry全3Design保全を確認。独立reviewの保存前後Asset/全Part検証漏れ、enriched evidenceの回収不一致、capture実寸・association固定不足をroot修正し29対象tests成功。最終独立clean reviewなし。39原・77加工specを個別審査、68採用・加工9と原crop1は不採用。意味20は底面8/範囲8/assort4。旧hold解除・新永久hold・単粒価格・穴接続生成0。証拠は evidence/nominal-20261025-pearl-summary.json。新規live canvas保存/reloadは未実施、API/一覧検証と混同しない。frozen helper/review/cacheを再実行しない。
