# 丸カン・Cカンの公式外形寸法と own 写真 — 有限設計契約

2026-10-26。**設計のみ / 意味審査0 / 原写真採用0 / 加工採用0 / 登録0**。対象は `.local/setup/jump-ring-body-candidates.json` の正確な139 source（15商品）のみ。ファイルbytes SHA-256 `18dc26a151eea52c08218ea2e6bc6e9f032e440b5dd93f5c39006084fac2c567`、registry SHA-256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`、workspace ID `af3aed9f-240b-4021-a01e-40521f03adb6` を起点とする。139件は現SQL未登録、候補抽出時の販売許可あり、品質hold外、非空tag。これらは**写真・寸法意味・加工の採用数を意味しない**。実行時の販売/保留/SQL状態は再判定する。ほかの `jump_ring`、他category、類似URL・写真hashへ対象を拡張しない。

| 公式 `dimensionEvidence.kind` | 件数 | BODY nominal 配置枠 | 別保存し配置枠に転用しない値 |
|---|---:|---|---|
| `official-shared-diagram-dimensions-only`（丸カン） | 74 | `width_mm=height_mm=outerDiameterMm` | `wireDiameterMm`、`innerDiameter.valueMm` と `approximate` |
| `official-oval-diagram-dimensions-only`（Cカン） | 65 | `width_mm=outerWidthMm`、`height_mm=outerHeightMm` | `wireDiameterMm`、`approximateInnerHeightMm` |

丸カン代表図 `1178d72215799356b7d249e4167fc0c185754d096d4678492488c5c451aa4814` の `0.6×3` は線径0.6、**外径3**、内径約1.8mm。Cカン代表図 `50cb96645a05352df6d4f585525c11ed869de03ce5a93bf598b3b58bb400ede8` の `0.5×2.2×3` は線径0.5、**外幅2.2 / 外高3**、内高約2mm。これらは代表2図の読みであり、139行すべての個別意味採用ではない。rootは15商品原写真を目視し、各450px画像に単独completeなリングとfull-frame cropを確認済み。これはsource別の色/finish・variant対応reviewや加工採用の代わりではない。開口は**画像上の見え方**であり、穴・接続点・嵌合径を定義しない。

## 固定入力と採用ゲート

`.ai/ALL_VARIANT_MAPPING_CONTRACT.md` の掲載値による暫定配置・未確認表示を維持する。snapshotのexact IDを重複なしで139件、74/65件に分割し、各行の`draft`全objectを現registryと `sourceObjectSha256=SHA256(JSON.stringify(draft))` で照合する。対応するmapping行の `dimensionEvidence` 全objectも照合し、`sourceDraftId`、product/variant/SKU、source URL、元 `sizeText`/name/本文/販売表記、`label`、図URL/hash、商品capture、写真captureを結ぶ。図URLと原写真URLが当該 `draft.imageUrls` にあり、両captureの `productIds` に当該商品IDが含まれ、保存原bytesがそれぞれのSHA-256に一致することを必須とする。共有公式図は行ごとのサイズ領域・labelの証拠であり、ほかのvariant値の移植や写真代用に使わない。

各sourceの**独立した意味review**に、原label、図中の対象領域、kind、外径または外W/H、線径、概寸内径/内高、元図hash、`dimensionEvidence` hash、full source object hash、reviewer/日時/理由を固定する。labelの値と順序を検算する。丸カン `wire×outer diameter`、Cカン `wire×outer width×outer height` として読み、値が正・有限・40mm以下・1/40mm gridであること、図の該当注記と一致することを検証する。Cカンの第2値を高さ、第3値を幅に入れ替えること、および線径・概寸内径をBODYへ使うことを拒否する。曖昧な行はsource単位hold。categoryは全件 `jump_ring` を維持し、原 `purchase`・price・currency・tagsを保つ。重量売りの推定個数からpiece単価を作らない。

各distinct原写真を実見し、商品/variantへの対応、単独の全外周・開口の可視性、正面姿勢、色/仕上げ、背景分離を記録する。共有写真のreviewは原bytesに対して再利用できるが、各sourceのown product/variant/gallery associationは省略しない。単独と断定できない、他個体と重なる、全体が切れる、対象サイズを同定できない場合はhold。必要なcropはreview済みの非回転decoded raster上の整数 `{left,top,width,height}` と原hash/URL/画素/理由を固定し、画像から寸法を測らない。サイズ別外観が確認できなければ `variantAppearanceVerified=false` のままにする。

## 薄い専用adapterと加工承認

139 IDの先行dispatchだけに新recipe/画像key/cache namespace（例 `kiwa-jump-ring-body-own-photo-finite-v1`）を設ける。既存の `prepareCzechCrop` → `prepareBodyBox` を使い、レビュー済crop、既存white trim、明示rotation、`contain-with-transparent-padding`、透明化の順で非伸縮に加工する。`prepareBodyBox` のaspect/trim guardを緩めず、失敗はhold。リングの開口がwhite trim/透明化で閉じる、線が消える、外周が切れる場合もhold。必要なら既存パイプライン自体を変更せず、このcohortの元写真を不採用にする。旧recipe、selector、画像key、cache、加工bytes、既存Part/Assetは変更しない。原bytesをoriginal renditionとして残し、公式図を形状画像に使わない。

adapterはsourceのfull object・図・意味review・原reviewから`spec`を作り、`spec SHA` と専用image key SHAを生成する。既存 `prepared-official-dimension-cache.mjs` と同じ**準備専用**envelope（imageKey、spec binding、sourceHash、payloadHash、加工rendition bytes）を共通化して使用する。originalは別に原bytes SHAで照合する。cache hitでもenvelopeと全rendition bytes hashを検証する。専用familyごとにcache/approval/Asset検証helperを大量複製しない。準備cacheは加工採用を意味しない。加工後の初回 **original/high/medium/thumbnail 4 rendition** をdistinct specごとに実見し、開口、外周、色、透過、縮小時の連続性を確認する。既存white 250 floodは画像外辺に連なる白だけを透明化するため、リング内側の白が残り得る。残った行は画像不採用とし、別の採用行は続ける。内側のための新maskやhole geometryは生成しない。別のprocessed approvalを原reviewより後に記録し、`spec SHA`、image key SHA、4 bytes SHA、reviewer/日時/理由へ束縛する。元hashが同じでもsource意味、外形寸法、crop、rotationまたはversionが違えばkeyを分ける。

Part evidence と Asset `source_transform` は少なくとも snapshot/registry、full source object、図、`dimensionEvidence`、意味review、原review、対応review、spec、加工approvalの各SHA-256とsource URL/IDを保持する。`layoutSizeChoice='published-body-size-pair-box-for-layout-only'` を使い既存rendererの未確認表示を維持し、notesには外径または外W/Hと線径・概寸内径/内高を別fieldのまま記す。`imageScaleVerified=false`、物理端点/外形精度/サイズ別外観は未確認、`connectionReady=false`、`connection_points=[]`、`through_holes=[]`。開口を貫通穴や接続座標へ変換しない。表示文言は「公式図の外径（Cカンは外幅×外高）を使った暫定配置枠。写真は形状参考。画像尺度、サイズ別外観、開口幅、接続位置・適合は未確認」とする。

## 登録・回収・受入

採用manifestは全139 IDの排他的な結論（採用/意味保留/原写真保留/加工保留/販売・品質・既存source保留など）を持ち、採用行だけに4段階のreviewと4 bytes approvalを付ける。共通 `registration-work` 台帳と採用batch writer/serial queueを使う。採用manifest bytes SHA、snapshot bytes SHA、registry/workspace IDを起動時・prepare後・**各commit直前**に照合し、途中変更なら停止する。保存直前に最新販売単位・廃番・品質holdを再読する。active/archivedを含む全PartをsourceDraftIdで検索し、別recipe・複数行・archived一致を自動回収/上書きしない。exact recipeで既に保存済みの1行のみ、Part aggregate、source/図/review evidence、購入情報、Asset transform、4 API画像bytesが全一致した場合に回収する。未保存は既存local SQL/RPC/immutable Assetとsingle-worker lockで逐次保存し、**各行直後**にaggregate JSON roundtripとAsset 4 API画像hashを照合する。既存registry/Part/Asset/Design/archiveをbaselineと比較し、再実行追加0とrestart後readbackを確認する。cloud writes 0。

最小検証は139/74/65 exact集合、source/図/gallery/hash変造、丸/C寸法軸の取り違え、線径/内径のBODY誤用、写真未審査・誤crop・開口消失、cache/approval 4 bytes改変、別recipe/archived/重複source、採用manifestの途中差し替え、直後aggregate/4 API readback、再実行0、既存データ保全。代表2図と2原写真の観察だけで残137件を自動採用しない。対象testと実データの有限readbackで確認し、Next buildはこの設計の受入条件にしない。**本契約自体は採用・加工・登録の証拠ではない。**
