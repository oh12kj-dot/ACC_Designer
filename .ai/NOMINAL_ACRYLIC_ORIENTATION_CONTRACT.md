# アクリル own-photo 写真姿勢拡張 — 採用契約

2026-10-10。状態: ADOPTED / IMPLEMENTED / REGISTERED AND VERIFIED。本書は `.ai/NOMINAL_ACRYLIC_BOX_CONTRACT.md` の配置専用BOXを拡張する設計案であり、個別写真の採用証拠ではない。依頼は Sol Medium。runtime のモデル・effort確認情報はないため、confirmed Sol reviewとは表記しない。

## 目的と不変境界

横向きの own photo を、source別に明示レビューした 0/90度の配置仮定で受け入れる。掲載pairの第1値→BOX幅、第2値→BOX高さは維持する。画像に合わせた値の交換・max/min並替えはしない。写真姿勢と掲載値の物理軸との対応は未確認のまま。

既存137 Part/AssetのID・metadata・画像bytes・加工key、registry、ユーザーデザイン、チェコv1/v2は変更しない。新規sourceDraftIdのみローカルへ追加可能。Supabase書込0、穴/anchor/connection_points生成0、接続ready=0。尺度、実寸、厚み、穴径、貫通方向、variant別外観は未確認。既存nominal表示・自由配置・保存方式を継続する。

## exact family拡張

下記だけを新規pair familyとして追加し、category=`bead`を明示する。従来のfamily名正規化、exact tag、own BODY prefix、当該draftの `imageUrls[0]` association、サイズ文法・正finite/40mm上限/1/40mm格子を保つ。動物shared tagのみでは採用しない。

| exact family | exact tag | own BODY prefix |
|---|---|---|
| アクリル ドイツ製 リボン1 | ドイツ製リボン1 | 表面にデザインが施されたリボン形のビーズです。 |
| アクリル ドイツ製 リボン2 | ドイツ製リボン2 | 片面にデザインが施されたリボン形のビーズです。 |
| アクリル ドイツ製 ライオン | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 |
| アクリル ドイツ製 トラ | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 |
| アクリル ドイツ製 シマウマ | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 |
| アクリル ドイツ製 ゾウ | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 |

第八holdの動物7sourceとリボン候補は `reviewed:false` のままでは不可。第九元proposalは17source/21variant、細いtube4件を除く13source/17variantは今回登録済み。元候補であり、個別reviewと加工結果で採用数を確定する。第六holdのスクエアチューブ4sourceは二視点写真かつ長辺aspect約6.3とのroot目視報告がある。単一個体cropでも現行aspect上限4に抵触するため今回のexact採用表へ追加せず、保留を維持する。ロングドロップ2の品質拒否、ダブルハートの2色/多視点、assortedの色選択など、姿勢以外の保留理由は解除しない。

## interfaceと判定

`AcrylicCropReview` に次のoptional fieldを追加する。既存型の既存fieldは変更しない。

```ts
photoOrientation?: {
  version: 'reviewed-acrylic-photo-pose-v1';
  rotationDegrees: 0 | 90;
  reason: string;
};
```

`nominalAcrylicBox(draft, review)` の引数・未採用時`undefined`を維持する。新6familyは `photoOrientation` 必須。明示branchの対象はこの6familyだけとし、既存38familyへfieldを指定した場合は拒否する。既存38familyでfieldが未指定なら現行出力を完全維持し、pairかつ幅>高さで90、それ以外0、現行choice文字列・recipe・sourceCrop形状も維持する。既存登録済み137件を更新/再加工しない。

- fieldが存在する場合はversion完全一致、numeric literal 0/90、trim後非空reason、既存reviewed/by/atとtrim後非空photoPoseを検査する。不正/null/欠落memberは拒否し、legacyへのfallbackは禁止。
- 明示指定時の `photoRotationDegrees` はその値を直接使う。掲載pair、family、raster/cropの縦横、画像解析から自動導出しない。90は現行Sharpの正90度（時計回り）。mirroring、180/270、任意角は許可しない。
- `photoPose` はcrop内の被写体の見かけの姿勢を記述し、800×800等のcanvas比率を「横向き」の根拠にしない。reasonはそのsource/cropで0/90を選ぶ配置理由と、物理軸対応が未確認である旨を含める。個別sourceレビューで原姿勢と回転後姿勢を確認する。
- 明示出力だけ `photoOrientationChoice='reviewed-explicit-own-photo-rotation-for-layout-only'` と `photoOrientationReview`（入力objectの値コピー）を追加する。`sourceCrop`にも当該reviewの`url`を保持する。既存 `photoPose` とfamily、原hash/dimensions/crop/reviewer/dateを含めて、採用写真と回転理由を追跡可能にする。
- recipeは既存 `kiwa-acrylic-own-photo-body-box-v1`、BOX/sizeOrder/layoutSizeChoiceは従来通り。diameter不生成、physicalWidth/Height/sizeAxisInterpretation/variantCutAppearanceVerifiedはfalse。写真回転は物理軸・寸法・正面の検証結果ではない。

## pixels・cache・provenance

legacy branchの `nominal-acrylic-reviewed-crop-photo-v1` key/transformを変更しない。明示branchのみ加工versionを `nominal-acrylic-reviewed-crop-photo-v2` とし、keyにversion/原SHA256/整数crop/回転/BOX幅高さに加え、stable field順でsourceCrop全体（URL/hash/dimensions/座標規約/reviewer/date）、family、photoPose、photoOrientationReviewを含める。理由・reviewer・date等が変わっても旧cacheのtransform証拠を返さない。同じbytesを再利用する場合にも当該keyに対応したprovenanceを生成する。

`prepareAcrylicCrop` は明示branchで回転値とreview objectの一致、review version、choiceを再検査し、矛盾したspecを拒否する。transformへphotoOrientationReview/choiceをコピーし、sourceCropと併せて保存する。チェコwrapper/helperのkey/transformやBODY_BOX処理を変更せず、アクリルwrapperで分岐する。

既存extract検査で原bytes hash・未回転decode寸法・単一page・整数範囲・座標規約を照合してextractを先行する。その後のtrim→明示回転→aspect-contain→透明余白/外側白背景除去は現行通り。trim threshold12、見かけaspect上限4、crop内占有下限.2、white threshold250、pixel limit、出力格子を変更しない。伸縮/輪郭生成/厚み・穴補完なし。originalは切出前bytesを保持する。横向きスクエアチューブでも品質閾値を超えれば保留する。

## 最小検証と受入条件

1. helper: legacy scalar/pair（幅>高さ/幅<高さ/等辺）の出力を既存fixtureとdeep equality。新6family exact正例、shared animal tagだけ/wrong family/BODY/URLを拒否。新familyのorientation欠落、不正version/文字列角度/180/空reason/空photoPoseを拒否。明示0で幅>高さ、明示90で幅<高さでも指定を尊重し、pair原順序/未知flags/diameterなしを確認する。
2. pixels/cache: 非対称fixtureで0/時計回り90を確認。hash/dimensions/crop/座標の既存負例、original bytes保持、containを確認。v1 key完全不変、v2とv1/チェコ分離、回転/BOX/crop/review理由・identity変更のkey分離とtransform provenance一致、矛盾spec拒否。細長いfixtureの品質拒否を回転0/90とも維持する。
3. source evidence: 全採用原写真と全distinct加工画像を目視し、完全な単一個体/crop/姿勢/理由をmanifestへ保存。候補/採用/品質等の保留を分け、採用数を事前に固定しない。source別サイズ別BOXのdistinct加工も確認する。
4. register後に行う受入: 新規Part SQL read-back（own商品/variant/URL/hash/crop/BOX/category/未知flags/空穴anchors）、新Asset API bytes/full originalとtransformを照合。既存137 Part/Asset・registry・デザインの前後ID/content/hash不変、再実行追加0、restart read-back、新familyの一覧/配置/保存/reloadでnominal未知表示を確認。cloudWrites=0/connectionReady=0を証拠へ残す。

本書作成で実装・manifest採用変更・登録は行わない。実装時もこの境界外（尺度/物理軸確定、gallery変更、閾値緩和、既存137件移行、穴/接続）へ拡張しない。


## 実行証拠

nominal-acrylic-ninthのregistration/image-review/verificationとnominal-acrylic-orientation-integration.json参照。13原写真/全distinct加工画像を目視、17新Part/17Asset登録・再実行0、既存137アクリルPart/全従来Part/registry/デザイン表保持。全340unit/75ファイル、targeted19、crop6、typecheck、新姿勢4E2E、実保存先再起動後read-back（204.7秒）成功。Supabase/穴/接続0。非空実デザイン/実iPhone/cloudの実証ではない。
