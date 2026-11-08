# ヒモ留め15件の根拠不足BODY適用訂正

全有効Part精査で、過去の意味holdと重なる15件/3商品を確認。対象は `.local/setup/all-parts-review-20261106/legacy-nominal-hold-overlap.json` 内で category-crocodile-end-meaning-holds.json に該当するものだけ。Sol Medium指定の診断では、旧hold後にbodyReviewed=trueへ変わったが、原description/3原写真hash/cropは同じで、scalarが本体外寸か紐適合幅かを解決する新しい寸法根拠はなかった。actual runtime model情報なし。

写真の単体性と原姿勢の審査は保持する。3枚の原写真/現在加工写真を今回も目視し、顎/歯/曲げ部を含む単一形状を確認。原/高/中/thumbnailのbytesを完全同一で新しい参照Assetへコピーする。旧Assetは不変。新Assetは10mm技術表示枠・physicalScale=falseとし、旧transformは履歴に包む。再加工・crop/seed/threshold再試行で意味問題を解決したことにしない。

Partのactive nominalPlacementを外し、元nominal/notes/枠/AssetをdimensionMeaningReviewの履歴へ保持。原掲載サイズ7.5/10/13/20/25mmは保持し、BODYともfitとも断定しない。native width/heightは10mm技術枠、provisionalRegistration+dimensionMeaningReviewの有限経路で表示/フィルタ/自動間隔から物理寸法として除外。メモ/カタログ/選択/詳細/完成前チェックへ「掲載サイズが本体外寸か紐への適合幅か確認できていません。写真は同一商品の形状参考です。表示枠は実寸ではありません。」を示す。写真全体/単体切抜き未確認の旧定型文へ戻さない。

元source/variant/SKU/URL/本文hash/価格/購入/穴/接続を維持。過去hold/採用/negativeを変更しない。今回の許可は意味holdの解除や新しいBODY採用ではない。正規CAS/参照済み後継保存、旧Design/旧Asset/対象外rowを保全。現在15件は参照0/guide0、native購入spec15あり。既存RPCの購入row技術ID再生成は旧→新を記録し、行数/Part ID/全購入値/metadataを一致確認する。

主nominal promotionからactive claimを除き、元promotionは履歴とbeforeへ保持。provisional promotionへ実読戻し後に追加し、既存Part等を未登録へ戻さない。新全Part台帳に訂正を記録し、従来7,424件の部分台帳を全体件数と誤認しない。first/rerun0、4画像API/hashとpixels不変、source/native/全非対象保全を確認。受入は「根拠不足BODY適用15件訂正」であり、寸法意味の解決や物理/全工程精査合格ではない。
