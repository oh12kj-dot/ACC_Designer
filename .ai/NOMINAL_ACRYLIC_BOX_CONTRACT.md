# アクリル own-photo 暫定BOX — 採用契約

2026-10-10。全件対応の掲載サイズ配置承認とチェコcrop v2の画素保全方式を再利用する。44 exactビーズfamilyを採用。設計を採用。登録・検証状況は末尾の実行証拠に分ける。指定modelのruntime確認情報はなく、confirmed independent reviewとは呼ばない。

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

第二batchはビーンズ（tagドイツ製ビーンズ、own BODY prefix「表面のつやが綺麗なビーンズ形のビーズです。」、pair、category bead）と、当該source別に確認したラウンドファセット代替prefixを採用。第三/第四batchの丸・プレーンハート・デザインハート・丸上穴も採用。これ以外は未採用。原写真14件のうち1件は今回のremaining group外であり、初回の写真候補は13件。rootの原写真目視と個別review証拠、加工後目視を照合して採否を確定する。2family20variant/14商品の全体数を今回登録実績とみなさない。将来の拡張も同じexact表・個別crop規則で行い、一般的なアクリル名やtagだけでは受け入れない。

## 検証と完了条件

- unit: 各family正例、各採用prefix、wrong family/tag/BODY/source URL、他商品適合サイズ、pair/scalar混用、範囲/穴/販売長/0/40超過の拒否。回転・原順序・diameter不生成・category beadを確認。
- crop: 原pixels一致、整数/範囲/hash/dimensions/座標規約の拒否、crop/回転/namespace違いのcache分離、全original bytes保持。既存共有pipelineの検証を維持する。
- 証拠: 全採用PartのSQL read-back/sourceDraftId/BOX/未知flags/空holes・anchors/category、全distinct新Asset原/加工hashとAPI bytes、一覧表示。初回配置/保存/reloadでnominal未知表示と自由配置を確認する。
- registry/既存Part/Asset/デザインの前後hash・ID/内容不変、チェコv1・v2意味/画像不変、再実行追加0、restart後のread-backを確認。処理集計は候補/採用/保留を理由別に分け、未レビュー数を成功数に含めない。


## 第三・第四batchのexact受入表

| family | exact tag | own BODY prefix | サイズ | 追加variant |
|---|---|---|---|---|
| アクリル ドイツ製 丸 | ドイツ製丸 | acrylic-round-reviewed-prefixes.jsonの6完全一致prefix | scalar | 27 |
| アクリル ドイツ製 プレーンハート | ドイツ製プレーンハート | 透明度が高く、表面がつるっとしたハート形のビーズです。 | scalar | 5 |
| アクリル ドイツ製 デザインハート | ドイツ製デザインハート | クラシックな風合いの小さめのハート形ビーズです。 | pair | 5 |
| アクリル ドイツ製 丸 上穴 | ドイツ製丸上穴 | 上部に通し穴の空いた丸玉のビーズです。 | scalar | 2 |

丸のnoticeは自動削除せずexact allowlistとreview.bodyPrefix/当該本文の一致が必要。既存ラウンドファセット代替prefixも同じ規則で出力不変を照合。丸上穴は原800×800比較写真の右個体をcrop{left:400,top:180,width:400,height:430}で目視抽出。完全個体以外を混ぜず穴径/貫通方向/接続を確定しない。

## 第五・第六batchのexact受入表

| family | exact tag | own BODY prefix | サイズ |
|---|---|---|---|
| アクリル ドイツ製 丸 フラワー | ドイツ製丸フラワー | クラシックな風合いの花模様が施されたラウンド形ビーズです。 | scalar |
| アクリル ドイツ製 コインフラワー | ドイツ製コインフラワー | ヴィンテージ風のコイン形のビーズです。 | scalar |
| アクリル ドイツ製 ラウンドローズ | ドイツ製ラウンドローズ | 両面にバラのデザインが施された丸い形状のビーズです。 | scalar |
| アクリル ドイツ製 ラウンド模様 | ドイツ製ラウンド模様 | 表面に凹凸感のある模様が施されたラウンド形のビーズです。 | scalar |
| アクリル ドイツ製 トリプルボール | ドイツ製トリプルボール | 透明度が高く、中央を少し絞った丸いシルエットのビーズです。 | scalar |
| アクリル ドイツ製 コインナツメ | ドイツ製コインナツメ | ヴィンテージ風のコイン形のビーズです。 | scalar |
| アクリル ドイツ製 トゥルペ | ドイツ製トゥルペ | 表面のつやが綺麗なチューリップ形のビーズです。 | scalar |
| アクリル ドイツ製 コイン | ドイツ製コイン | 透明度が高く、表面のつやが綺麗なコイン形のビーズです。 | scalar |
| アクリル ドイツ製 バケット | ドイツ製バケット | 表面のつやが綺麗な平らな台形のビーズです。 | scalar |
| アクリル ドイツ製 ドーナツ3 | ドイツ製ドーナツ3 | 表面のつやが綺麗な平たくていびつなドーナツ形のビーズです。 | scalar |
| アクリル ドイツ製 ドーナツ2 | ドイツ製ドーナツ2 | 表面のつやが綺麗な平たくていびつなドーナツ形のビーズです。 | scalar |
| アクリル ドイツ製 ウェーブリング1 | ドイツ製ウェーブリング1 | 緩くウェーブが掛かったビーズです。 | scalar |
| アクリル ドイツ製 ディスク1 | ドイツ製ディスク1 | ディスク形の平たいビーズです。 | scalar |
| アクリル ドイツ製 オーバル2 | ドイツ製オーバル2 | 表面にカットが施されたオーバル形のビーズです。 | pair |
| アクリル ドイツ製 オーバルカット2 | ドイツ製オーバルカット2 | 表面のつやが綺麗なオーバル形のビーズです。 | pair |
| アクリル ドイツ製 ファセットドロップ | ドイツ製ファセットドロップ | 表面にカットが施されたドロップ形のビーズです。 | pair |
| アクリル ドイツ製 ナツメファセット | ドイツ製ナツメファセット | 表面のつやが綺麗なナツメ形のビーズです。 | pair |
| アクリル ドイツ製 ストーン | ドイツ製ストーン | 表面のつやが綺麗なストーン形のビーズです。 | pair |
| アクリル ドイツ製 ナツメファセット2 | ドイツ製ナツメファセット2 | 表面にカットが施されたナツメ形のビーズです。 | pair |
| アクリル ドイツ製 ピンチ | ドイツ製ピンチ | 表面のつやが綺麗な丸みのある変形のビーズです。 | pair |

比較写真の整数cropはacrylic-processed-decisions.jsonへ保存。第五batch23 source/26variant、第六batch18 source/19variant。先行66Partのspec/ID/Assetは不変。保留はassortedキュービック2件の色選択、コイン1件の別own BODY prefix、横向きスクエアチューブ4件の回転規則、細いロングドロップ2の5件。後者は4写真が既存BODY_BOX_PHOTO_REVIEW_REQUIRED品質閾値で拒否されたためfamily全体を保留し、閾値を変更していない。未確認穴/接続は生成しない。

## 第七・第八batchのexact受入表

| family | exact tag | own BODY prefix | サイズ |
|---|---|---|---|
| アクリル ドイツ製 ファセットハート | ドイツ製ファセットハート | 表面にカットが施されたハート形のビーズです。 | pair |
| アクリル ドイツ製 変形21 | ドイツ製変形21 | クラシックな風合いのオーバル形のビーズです。 | pair |
| アクリル ドイツ製 ファセットアイス | ドイツ製ファセットアイス | 表面にカットが施された多角形のビーズです。 | pair |
| アクリル ドイツ製 変形17 | ドイツ製変形17 | クラシックな風合いのオーバル形のビーズです。 | pair |
| アクリル ドイツ製 アイスキューブ | ドイツ製アイスキューブ | 表面のつやが綺麗な多角形のビーズです。 | pair |
| アクリル ドイツ製 クラシックオクタゴン | ドイツ製クラシックオクタゴン | クラシックな風合いのオクタゴン形のビーズです。 | pair |
| アクリル ドイツ製 花30 | ドイツ製花30 | クラシカルな風合いのフラワー形のビーズです。 | pair |
| アクリル ドイツ製 花29 | ドイツ製花29 | 透明度が高く、表面のつやが綺麗なフラワー形のビーズです。 | pair |
| アクリル ドイツ製 ペンギン | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 | pair |
| アクリル ドイツ製 ヤギ | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 | pair |
| アクリル ドイツ製 ネコ | ドイツ製アニマル | ドイツ製アクリルらしい愛らしいデザインの動物モチーフビーズです。 | pair |

source review/crop/元向き/回転を専用manifestへ保存。第七21source/21variant、第八5source/5variant。動物のshared tagはexact family名とown BODY/source reviewを伴う場合のみ受理。ヤギは正方形、ペンギン/ネコは採用写真の縦向きを現在の仮回転へ適用。ダブルハート2色写真2件、横向きライオン/トラ/シマウマ/ゾウ7件は未採用。掲載2値の原順序だけを暫定BOXへ使い、画像との物理軸を確定しない。

## 写真姿勢拡張

NOMINAL_ACRYLIC_ORIENTATION_CONTRACT.mdの新6familyのみsource別明示0/90度を要求。既存38familyはfieldなしlegacy出力を完全維持し、field付与時は拒否。明示branchのみv2加工cache/transform。掲載pair原順序/未知flags/品質閾値を維持し、細いチューブ4件は未採用。

## 現在の実行証拠

アクリルBOXは44family154件。今回横向きリボン2family10件・動物4family7件、計17件を追加。原13写真と全distinct加工画像を目視、source別に明示clockwise90と配置理由を記録。写真回転と掲載pairの物理軸対応は未確認。legacy137Part/spec/cacheは不変、明示branchのみv2加工key/transformにsource URL・姿勢・理由・review identityを保存。全154Partのown商品/variant/SKU/本文/gallery/hash/crop/BOX/category bead/未知flags、追加17Asset API bytes/full originalと明示姿勢provenance、既存Part/registry/デザイン表不変、再実行追加0を確認。使用可能10,838＝47strict＋10,791nominal、残16,208。nominal画像7,743。340unit/75ファイル（maxWorkers4）・19targeted・crop6・typecheck・明示姿勢4E2E成功。実workspace再起動後read-back成功（204.7秒、全154アクリルPart/新17Asset APIを照合）。nominal-acrylic-orientation-integration.json参照。evidence/nominal-acrylic-ninth-{registration,image-review,verification}.json参照。

実ユーザーデザイン開始時0件、E2Eは隔離fixtureであり非空実デザイン/実iPhone/cloudの実証ではない。
