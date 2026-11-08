# 掲載BODY寸法・代表単体写真の有限移行

2026-11-05。ユーザー承認済み登録・精査計画の次工程。130source/20商品を確認し、集合写真18sourceは今回加工しない。単体写真13商品/112sourceは現source/hash/掲載BODY根拠・全旧row/Designで固定した。historical hold/negativeにsourceまたはphoto hashの該当0。Sol Mediumへ明示設計依頼し契約採用（actual model確認情報なし）。

写真は各商品の代表像で、サイズ別の線径比率・形状を証明しない。外径、外幅/外高、明記された概寸のカニカン全幅/全高のみを仮配置枠へ使う。内径・線径・購入長・適合サイズはBODYへ転用しない。元の撮影姿勢とaspectを保持し、画像尺度/掲載軸との写真対応/実寸/サイズ別外観/接続のverifiedはfalse。穴・接続点・開口径は生成しない。

最初のprepareBodyBox/prepareCzechCrop84renderは外側のみ白透過され、金具内側に白背景が残ることを実画像とコードで確認した。元画像・出力hashを保持し、このbase出力自体は不採用。カニカン14sourceは複数の開口部があるため今回は保留する。

新入力の例外：丸/Cカン98source、70renderだけ、原写真とbase出力上で確認した内側背景seedの整数pixel座標・base hash・source/hash・審査時刻を固定。設計担当へ新証拠を提示し、無根拠な同crop再試行ではなく新しい意味根拠を持つ入力として有限採用。threshold250のseed接続白成分だけalphaを0へし、RGB・寸法・その他pixel・姿勢は変更しない。漏れ/不確実/失敗があればseedを変更せず保留。mask全体が可視空隙内に限定されることを全70renderのoverlayで確認する。

処理合格後のみnormal RPC+CASで掲載寸法の仮配置へ移行。active provisionalRegistrationを外し、元metadataは履歴とbeforeへ保全。native幅/高は掲載仮枠、nominalPlacementに代表写真と未検証を明示。新旧画像資産を保全し、参照済みPartは後継保存して元Designを書換えない。未参照Partは同ID。全非対象row/全旧Asset/Design/原資料/販売方針/holdを保全する。

provisional→nominalの変更は精査全工程完了ではない。画面に「同一商品の代表写真を掲載寸法の仮配置枠で表示しています。サイズ別の形状・線径との比率・画像尺度・実寸・穴接続は未確認です。」を表示する。4画像API/hash・全Part/source/purchase/接続読戻し・canonical/sibling対応・正式rerun変更0・PC/mobileの選択配置保存再表示を確認する。

続行の有限拡張：カニカン14source/14renderは、原写真と座標grid付きbase出力（8種類のpixel case）で上側開口部・下側取付環の背景位置を別々に審査した新入力として採用可。元baseやseedを調整して再試行しない。各opaque白成分が異なること、元baselineと比べunion内の255→0のalphaだけが変わることを確認する。既に透明なら無変更、半透明/非白seedは失敗。銀色レバーの白い金属光沢は背景に含めない。漏れ/不確実ならrender全体を保留する。source/hash/14組のseed・mask・新DB/manifest baselineは .local/setup/clasp-photo-review-20261105/ に固定。設計担当へ新証拠と座標表を提示し、この14件だけの例外を明示して採用した（actual runtime確認情報なし）。概寸/代表写真・全未検証flagとnative穴/接続なしを維持する。


次の有限拡張：新しい丸カン31 source/5商品/26 render。各商品の公式ギャラリーに存在する既審査図の原hashとexact size key/線径/外径を確認し、31件の新source対応を別snapshotへ固定した。図やサイズ対応のない10件は採用しない。各商品の代表単体写真を目視確認し、以前の画像失敗/negativeに一致しないことを検証。26 baseを保存後、実画像の内側背景として確認した(128,128)を各256×256 rasterの新入力へ固定。17件は元からalpha0なのでbase bytesを再利用。9件はalpha255/RGB250以上の白成分だけ既存single-void処理で除去。全26 maskと加工像を確認し、RGB・金属光沢・範囲外alpha不変、実寸/物理穴/サイズ別外観の未確認を維持。新しいinput/key/DB baselineは `.local/setup/new-ring-photo-review-20261105/`。設計担当へexact31/26の条件を提示し有限例外として採用（actual runtime model情報なし）。旧98/14のscopeを一般化・再実行しない。
