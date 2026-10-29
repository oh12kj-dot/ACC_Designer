# チェコビーズ：掲載サイズと当該写真による暫定配置枠

2026-10-10。全件対応契約の掲載サイズ配置承認を実装する別recipe `kiwa-czech-own-photo-body-box-v1`。既存クリスタルrecipeを緩めない。

初期exact familyはチェコ ファイヤーポリッシュ/シズク横穴/メロン/ラウンド。NFKC後の商品family境界と対応tag、own本文の熱加工ファイヤーポリッシュまたはプレス成型ビーズの定型冒頭を必須とする。ファム/3面カット等へ前方一致で展開しない。ダガー26件は全写真が2個体/投影比較のため保留し切り出さない。

当該variantのstrict `(約)?Nmm` またはシズク横穴の `(約)?A×Bmm`、正数<=40/0.025mm刻みを採用。new等未知suffix/範囲/穴径/適合径/販売長は不採用。約と原ラベルを保存し許容範囲を作らない。scalarは正方形仮BOX、pairは原順序A→width/B→height。実径・物理軸・外接範囲とは呼ばずdiameterへ格納しない。

公式cut図を要求せず当該商品galleryの単独完全個体写真を投影として利用する。独立した正面投影の証明と称さない。全sourceと採用加工後を目視し、hash/商品association/原本文/variant/SKU/姿勢/回転/採否を保持。複数個体・作品・金具付き・切れ・本体判断不可は保留。黒背景は保持し尺度/輪郭証明へ昇格しない。scalar0°、シズクは見かけ縦長をBOX長軸へ0°/90°の仮定。aspect-contain/透明余白/外側白背景のみ除去を既存加工で再利用しstretch・左右反転しない。

尺度/輪郭/サイズ別外観/物理幅高さ/軸/接続適合は未確認。穴・anchorsを生成しない。既存scalar/pair未確認表示と自由配置を使う。既存Part/Asset/デザイン/固定registry保持、別manifest、端末SQL read-back・再実行追加0・画像bytes/hash/API・一覧対応を検証。UI変更がなければ前保存/reload・再起動証拠を保持し一括検証を繰り返さない。

設計はbounded単一assignmentへgpt-6.1-sol/mediumを明示要求、返却契約を採用。runtime実model/effort確認情報はないのでconfirmed independent Sol reviewとは称さない。

実施結果: 最新チェコ4family349件（ファイヤーポリッシュ196/シズク横穴87/メロン39/ラウンド27）を登録。154原写真/141採用加工後を目視、複数個体ダガー26とnewラベル3は保留。新規334画像の原bytes/加工hash/API、全349Partのown商品対応/BOX/未確認表示/一覧を検証、再実行追加0。既存9,928Part/registry/デザイン表不変、2targeted tests/typecheck成功。UI変更なし、再起動・保存/reloadは前統合証拠を保持。現在nominal画像7,180。登録54.3秒、検証20.7秒。画像読取のECONNRESETは当該画像単独200応答を確認後、読取のみ1回再試行で全件検証。証拠evidence/nominal-czech-box-{registration,image-review,verification}.json。

追加exact scope14family: ピコノ/ファム/パンプキン/3面カット/スター/ナゲットカット/キューブ/フラットパンプキン/ハートライン2/フラワー3/ボタンカット/ピンチ/ハートフラワー/5弁花3。176原写真を目視、最終単独78写真を採用。比較写真98は保留（加工後レビューで追加1枚を拒否）。ボタンカット/フラットパンプキンは横長の見かけ方向をpair BOX長軸へ合わせる0°/90°仮定、それ以外のpairは縦長仮定。物理軸証明ではない。

最新チェコ追加14family109件を15.3秒で登録。176原写真/78採用加工後を目視、加工後に比較個体を発見した1写真も保留へ戻し採用しなかった。新規93画像の原bytes/加工hash/API、全458チェコPartのown商品/BOX/未確認/一覧を検証。再実行追加0、既存10,277Part/registry/デザイン表不変。2targeted tests/typecheck成功、UI変更なし。nominal画像7,273。検証30.4秒、画像読取ECONNRESET1回はread-only再試行成功。証拠evidence/nominal-czech-next-{registration,image-review,verification}.json。
比較写真の単独個体矩形抽出はNOMINAL_CZECH_CROP_CONTRACT.mdの別v2 scope、現在未実装。
