# 掲載本体サイズによる追加familyの暫定配置枠

2026-10-10。既存ユーザー承認の範囲で、掲載サイズと厳密商品対応を事実、BOX軸割当てを配置上の仮定と区別する。5familyの全採用写真/公式投影を確認し850件を登録・再起動後検証済み。＃5601は斜視写真105variantを保留。

pair対象は実クリスタル＃4228/＃4320/＃4120/＃4162/＃4327/＃4127/＃4627/＃4610/＃4501/＃4699/＃4799/＃4527/＃4884/＃4815/＃4595/＃4683/＃4322/＃4929/＃4600/＃4142。exact商品名/tag/cut、当該variantのBODYサイズ欄とown BODY本文が必須。strict positive A×B mm（既知の店舗限定ラベルのみ許可）、元の順序を保持しwidthMm=A/heightMm=B、publishedBodySizePairMm=[A,B]、layoutSizeChoice=published-body-size-pair-box-for-layout-only。並べ替え/未知suffix除去/本文中の他variant値補完をしない。物理幅・高さ・外接範囲と呼ばない。

各familyの公式参考投影と全採用source photoを登録前に目視。長い見かけ方向をBOX長軸へ合わせる0°/90°のfamily recipeを記録するが軸対応の証明としない。単独正面個体のみ。斜視/側面/複数/台座込み/投影不明は保留。aspect-contain＋透明余白、外側背景のみ除去、stretchしない。原/加工hash、当該商品gallery association、draft/variant/SKU/原文hash/元ラベル/BODY本文/写真向き判断を保持。

sizeAxisInterpretationVerified/physicalWidthVerified/physicalHeightVerified=false。画像尺度/サイズ別外観/輪郭/接続適合も未確認、穴・接続なし。公式cut図は投影/向きの参考に限り寸法証拠へ昇格させない。一覧・編集・配置に「掲載サイズ2値を暫定配置枠に使用しています。実際の幅・高さと、掲載値が表す軸・写真との対応は未確認です。」を表示。

scalar＃4428/＃4480/＃4470/＃4460/＃4499/＃4745/＃4483/＃4744/＃4706/＃4933/＃5601もexact実クリスタルidentity/own BODY context/strict scalar mm/単独写真/family投影を確認すれば既存scalar契約と同じ暫定正方形BOXを使える。球体/円形/立方体/直径/各辺同一とは解釈しない。写真比から2つの物理寸法を作らない。

拒否: 石座/金具適合サイズ、販売長、穴径、線径、包装数、本文中別variant値、PP/SS換算、範囲/複合/未知単位、name/tag cut不一致。既存Part/registry/Asset/穴の意味を置換しない。

QA: source順序/小数/正数、適合径/販売長/未知suffix/cut不一致/本文別サイズの拒否。非正方形写真の非stretch、0°/90°/padding再現、全原/加工写真目視。UI未確認表示/配置/保存/reload、SQL read-back、再実行追加0、全hash/再起動後対応。物理軸/尺度/接続適合の検証と呼ばない。

設計支援はgpt-6.1-sol/mediumを明示要求した単一bounded assignment。返却された契約を上記へ採用。ツールは実model/effort確認情報を返さないためconfirmed Sol reviewとは記載しない。

実装のidentityはexact #cut または #cut大袋 tagを許可。未知RC suffix2とtag欠落1は保留。全322原写真、採用286写真の加工後、6family投影を目視。採用pairは90°/scalarは0°、shape referenceは寸法根拠ではない。別manifestとevidence/nominal-body-box-verification.json参照。

追加scope＃4162/＃4327/＃4470は同じBOX契約・0°/90°処理を再利用。126原写真/125加工後と3公式投影を目視済み。1写真のidentity/context未確認は保留。225件登録/read-back・新規168画像hash/API確認・再実行追加0成功。＃4327 own BODY contextを満たさない2variantは保留。今回再起動なし、UI変更なし。

追加scope＃4127/＃4460/＃4627/＃4610も同じBOX recipeを再利用。214原写真/175採用加工後/4公式cut投影を目視、＃4610複数個体写真を拒否、＃4487は投影未確認で今回採用しない。未知RC suffix/own BODY不一致も保留。287件登録/read-back、新規221画像hash/API/一覧照合、再実行追加0が成功。再起動は今回省略、前統合証拠を保持。

追加scope＃4501/＃4499/＃4699/＃4799の83原写真/加工後と4公式投影を目視。＃4699は横長正面写真をBOX長軸へ90°回転する仮定、＃4799は上向き三角正面の向きを維持。＃4501参考図は4×2改定前後と7×3を併記、サイズ別cut revisionは未確認。寸法証拠へ昇格せず同じBOX契約を再利用。208件登録/read-back・新規146画像hash/API/一覧照合・再実行追加0成功。今回再起動なし、UI変更なし。

追加scope7family＃4527/＃4884/＃4745/＃4815/＃4595/＃4483/＃4744: 85原写真/74採用加工後/7公式投影を目視。ハート＃4884/＃4815は先端を下にした正面向きを0°で保持するfamily仮定。画像尺度や掲載値の物理軸は未確認、元の2値順序とaspect-containを保持。＃4128は参考投影未確認、＃4527複数個体写真は保留。159件登録/read-back・新規136画像hash/API/一覧照合・再実行追加0成功。今回再起動なし、UI変更なし。

追加scope7family＃4683/＃4706/＃4322/＃4929/＃4600/＃4933/＃4142は同じBOX契約を再利用。46原写真/34採用加工後/8公式投影を目視、採用7familyは正面投影対応を確認。＃4841はcube axonometric投影のため今回保留、＃4328/＃4568は参考投影未確認。51件登録/read-back・新規49画像hash/API/一覧照合・再実行追加0成功。＃4929黒背景の1原写真はそのまま保持、尺度/輪郭の確認済みとは扱わない。今回再起動なし、UI変更なし。
