# 比較写真から単独個体を抽出する追加設計契約（v2・実装済み）

2026-10-10。別recipe `kiwa-czech-own-photo-body-box-v2` に限定する。既存v1 Part/Asset/判断/証拠は変更しない。全件対応の掲載サイズ配置承認を守る。

当該商品で確認したexact family/tag/own BODY本文/strict掲載サイズ規則と、個別source写真の採用判断が必須。比較写真の左側/正面に見える完全な単独個体を、目視で範囲を確認した矩形により抽出してよい。「正面に見える」は物理投影の証明ではない。最初の連結成分や自動生成座標をそのまま採用しない。

各採用判断はfamily/sourceURL/原SHA256/デコード後の元width・height、未回転座標の整数{left,top,width,height}、採用者/日付/見かけ姿勢/理由を保持。extractはtrim/回転/resize前。各対象商品のgallery associationを別途照合する。重なり/接触、切れ、余白不足、別個体混入、意味不明なBODY、同一商品の同定不可、hash/寸法変更、座標不正は拒否。

元pixelsのみ抽出し再構成しない。現在のaspect-contain/許可回転/外側白背景除去を再利用し、その品質拒否閾値を維持。stretch/mirror/厚み推定/穴補完/形状生成なし。original renditionは切り出し前の原写真を保持。v2 cache/keyは加工version/原hash/矩形/回転/出力サイズを含む。v1 keyを変更しない。crop別/回転別の誤再利用を防ぐ。

尺度/サイズ別外観/輪郭/物理幅高さ/軸/接続は未確認、holes/anchors空。新規未登録draftのみv2に登録、既存v1を自動移行しない。v2 review/promotions/verificationを別保存し、全採用加工画像を目視。元pixels一致、fractional/out-of-bounds/stale crop/hash拒否、cache分離、全original保持、v1不変、SQL read-back/hash/API/一覧、再実行0と既存registry/Part/Asset/デザイン保全を検証する。

bounded設計質問へgpt-6.1-sol/mediumを明示要求して返却契約を採用。runtime確認情報がないためconfirmed independent reviewではない。チェコ写真v2は92family331件。公式のコーヒービーンズ/ナツメのtag別名・own BODY本文を確認し2family5件/5画像を追加。比較2写真は左の完全個体を個別抽出、単独3写真は原矩形を保持し、原・加工後とも全件目視。登録1.6秒/検証12.0秒、再実行追加0。全331Partのsource crop/own商品/BOX/未確認、追加5画像full original/API hash、既存10,712Part/registry/デザイン表、v1全458と既存v2全326ID/画像ID不変を確認。nominal画像7,589。7targeted unit/typecheck成功。旧Part不変と既存一覧証拠を保持し一覧APIは新規2familyのみ確認。crop処理/UI変更なし、前crop script2/前統合20E2E・再起動証拠保持。最新証拠evidence/nominal-czech-crop-ninth-{registration,image-review,verification}.json。