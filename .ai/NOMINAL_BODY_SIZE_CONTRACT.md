# ビーズの掲載本体サイズによる暫定配置枠

2026-10-10。既存の掲載サイズ配置承認の範囲。設計判断: 本体のscalar mmとして厳密variantに対応付いた掲載値は、軸の未確認を明示した正方形の暫定配置枠へ使える。公式の幅・高さ・直径または物理的包絡範囲と呼ばない。販売長・穴径・他部品適合寸法の意味が不明な値は保留する。

対象は貴和クリスタル＃5000/＃5328、公式本文「ビーズと呼ばれる通し穴の開いているパーツです。」とexact cut tag、strict positive scalar mmサイズを確認する。未知suffix/複合サイズ/未知cut/本体分類の欠如を拒否。PP/SS表を5000番台へ適用しない。RCペリドット＃5000だけは既知の素材変更告知prefixの後に同じ本体文がある場合を受け入れる。＃5328の3mm(RC)だけは既知素材suffixを保持して3mmを使う。汎用prefix/suffix除去は行わない。

`publishedBodySizeMm`・元ラベル・draft/variant/SKU・商品URL・原写真hash/gallery associationを保持。`widthMm=heightMm=publishedBodySizeMm`、`layoutSizeChoice=published-body-size-square-box-for-layout-only`、`sizeAxisInterpretationVerified=false`、`physicalWidthVerified=false`、`physicalHeightVerified=false`。diameterMmへ格納しない。

cut図は形状・投影の参考資料のみ。＃5000は丸い参考投影があるが球体/直径/高さ同一を証明しない。＃5328は側面biconeを維持し円形へ変えない。写真を白背景trimし、縦横比維持＋透明余白で正方形枠へ収める。外側白背景だけを除き内側の白ハイライトは保持。2mmと3–14mmの＃5000 cut外観をサイズ別確認済みと扱わない。

265種類の原写真を全5枚のcontact sheetで単独ビーズとして目視済み。未登録写真hashは拒否。加工後も全件目視。原図は原bytes/hash、元商品のgallery associationを保持する。

一覧・編集・配置に「掲載サイズを正方形の暫定配置枠に使用しています。実際の幅・高さと、サイズが表す軸は未確認です。」を表示。既存の画像尺度・サイズ別外観・穴/接続未確認を保持し、穴/接続点は生成しない。

QA: label/shape/context拒否、写真aspect/padding/外側背景除去、実SQL read-back、再実行追加0、全画像hash/再起動後read-back、一覧対応、実編集/配置/保存/reloadと未確認表示。旧recipe/既存Part/デザイン/registry/Supabase不使用を保持。
