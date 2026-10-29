# パーツ一覧登録の検証

2026-10-05。gpt-6.1-sol / Mediumを設計・独立レビューへ明示要求。runtimeの実モデル/effort確認なし。

P1: 登録済みvariantがcatalogから消えた時、先頭variantへ暗黙fallbackする問題。明示variantIdに完全一致がなければ、情報/画像を反映せず表示エラーとする修正を実施。PC/mobileブラウザーでstale IDの拒否、空SKU、画像要求0を確認。独立再レビューは未実施。

全227テスト成功、型検査/build成功。Browserは36件対象のうち34件が一括成功。残り2件はNext route announcerとのselector衝突をテスト側で修正し、同一実装で対象再実行成功。未検証のまま成功扱いにした項目なし。

Atomic failureで前snapshot不変、concurrent2登録で追加2件→0件、同SKU/異variantの区別、再登録時のuserNotes/favorite保持、corrupt state拒否、確定/目安入数・単位・曖昧寸法を検証。登録処理のnetwork要求なし。

実データ: 27,046 identitiesをlocal .local/parts/parts.jsonへ登録し、再登録追加0件。counts/hashはevidence/catalog/registration-summary.json。editor readyは0件。未校正draftはdomain Part/Assetへ変換しない。クラウド保存0件。商品detailは接続確認responseで停止し、取得済みcatalogからの確定観測のみ構造化した。

制限: 公開all-itemの同時点完全性は未確認。local未校正登録と、校正済みクラウドPart・デザイン利用可能な状態を区別する。
