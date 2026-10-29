# アクリル own-photo 暫定BOX — 提案契約

2026-10-10。全件対応の掲載サイズ配置承認とチェコcrop v2の画素保全方式を再利用する。初回は下記2ビーズfamilyのみ。設計提案であり、写真採用・登録・校正済みの証拠ではない。指定modelのruntime確認情報はなく、confirmed independent reviewとは呼ばない。

## スコープと保全

- `acrylic-scope.json`は539variantの候補superset（other455/pearl33/chain35/bead16）。`remaining.json`の`catalog:other:アクリル` IDsとの実照合は396variant。この396を作業範囲とし、実SQLの既存sourceDraftIdを再照合して新規draftだけ採用する。旧remainingの数字を登録可能数とみなさない。
- registry/既存Part/Asset/チェコv1・v2/既存判断/ユーザーデザインは不変。Supabase書込0。recipe `kiwa-acrylic-own-photo-body-box-v1`、review/promotions/verificationと画像加工version/cache namespaceはアクリル専用に分離する。
- 1familyごとの繰返し設計は不要。同一契約下でexact rule表と個別source review表をまとめて作り、family単位で検証・候補集計、source hash/crop/出力BOX単位で加工再利用する。

## 初回のexact受入表

NFKC後の名前の` / `より前を使い、最後の色名tokenだけ除いたfamilyと完全一致する。色token除去で一致が得られない名前は保留し、prefix/部分一致でfamilyを広げない。tagはNFKC後の完全一致。own BODYは当該draftのdescriptionの下記exact prefixのみ。別商品・関連記事・適合寸法からの文章流用は禁止。

| family | exact tag | own BODY prefix | サイズ | remaining variant / 商品 |
|---|---|---|---|---|
| アクリル ドイツ製 レクタングル4 | ドイツ製レクタングル4 | 表面にカットが施されたレクタングル形のビーズです。 | pair | 11 / 9 |
| アクリル ドイツ製 ラウンドファセット | ドイツ製ラウンドファセット | 表面のつやが綺麗なラフなラウンド形のビーズです。 | scalar | 9 / 5（family全体） |

ラウンドファセットには別prefix `透明度が高く、表面のつやが綺麗なラフなラウンド形のビーズです。`の2variantもある。これを採用する場合はそのexact prefixと当該source写真を明示レビューして代替prefixとして追加する。広い`includes`や透明度句の自動除去で吸収しない。初回は未レビューの代替を保留してよい。20variant/14商品は2family全体の候補上限であり写真採用前の登録件数ではない。

採用review.family、当該draftのsourceURL/gallery association、原SHA256、source dimensions、cropがすべて一致すること。初回はown `imageUrls[0]`を使う。別gallery画像を選ぶ拡張はURLを明示しassociationを照合して追加する。

## サイズ意味と分類

- own sizeTextのみNFKC・空白除去後、scalar `^(約)?(\d+(?:\.\d+)?)mm$`、pair `^(約)?(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)mm$`。正・finite・40mm以下・現行1/40mm格子。約の有無と原labelを保持。範囲、3値、slash、括弧注記、単位不足、x、販売長/数/価格/穴径/線径/内径/適合石・適合丸玉サイズはこのrecipeで拒否する。
- scalarは値×値の暫定BOX、pairは原順序の第1値→BOX幅、第2値→BOX高さ。diameterへ格納せず物理的幅/高さ・正面軸を確定しない。scalarは元向き、pairの現行暫定回転規則を再利用し、回転も配置仮定として記録する。
- 初回2familyはown BODYでビーズと明示されるため新規Part.category=`bead`。registry.category=`other`は不変。既存登録scriptのdefault=`gem`へ落とさない。アクリル名・宝石風カット・天然石風カラー・マーブルだけを理由にgem/石へ分類しない。
- 将来、カボション/無穴/リング/チャームは本契約のBOX候補でもビーズとは限らない。familyごとのcategoryをruleへ明示し、ビーズ明示のない部品は`other`等の適切な既存categoryを別途確定する。chain/pearlは今回396の範囲外。穴/カンの本文記載からthrough_holes/connection_pointsを生成しない。

## source別写真レビューと画素処理

採用者/日付/理由/見かけ姿勢、family、URL、原hash、未回転decode後width・height、整数crop `{left,top,width,height}`、座標規約`unrotated-decoded-raster-integer-pixels`を保存。単独写真も完全個体と余白を全件目視し原矩形で記録する。比較写真は接触/重なり/切れ/他個体混入/同定不可なら拒否。自動crop/最初の連結成分をレビューの代用にしない。

`extractReviewedCzechCrop`相当の検査とextract、`prepareBodyBox`のaspect-contain/透明余白/外側白背景除去/現行品質拒否閾値を共有してよい。チェコrecipe・transform・keyは変更しない。アクリルwrapperで専用transform version/keyを付ける。原pixelsのみ、extractはtrim/回転/resizeより先。stretch/mirror/輪郭生成/厚み推定/穴補完なし。original renditionは切出前の原bytesを保存する。cacheはアクリル加工version/原hash/矩形/回転/出力幅高さを含める。

全採用source原画像と全distinct加工画像を目視。尺度/サイズ別外観/輪郭/物理幅高さ/軸/穴/接続は未確認のまま一覧・編集・配置に既存nominal表示を適用する。穴/anchor空、接続ready=0。

## 今回の境界

初回2family以外は未採用。原写真14件のうち1件は今回のremaining group外であり、初回の写真候補は13件。rootの原写真目視と個別review証拠、加工後目視を照合して採否を確定する。2family20variant/14商品の全体数を今回登録実績とみなさない。将来の拡張も同じexact表・個別crop規則で行い、一般的なアクリル名やtagだけでは受け入れない。

## 検証と完了条件

- unit: 各family正例、各採用prefix、wrong family/tag/BODY/source URL、他商品適合サイズ、pair/scalar混用、範囲/穴/販売長/0/40超過の拒否。回転・原順序・diameter不生成・category beadを確認。
- crop: 原pixels一致、整数/範囲/hash/dimensions/座標規約の拒否、crop/回転/namespace違いのcache分離、全original bytes保持。既存共有pipelineの検証を維持する。
- 証拠: 全採用PartのSQL read-back/sourceDraftId/BOX/未知flags/空holes・anchors/category、全distinct新Asset原/加工hashとAPI bytes、一覧表示。初回配置/保存/reloadでnominal未知表示と自由配置を確認する。
- registry/既存Part/Asset/デザインの前後hash・ID/内容不変、チェコv1・v2意味/画像不変、再実行追加0、restart後のread-backを確認。処理集計は候補/採用/保留を理由別に分け、未レビュー数を成功数に含めない。

