# 別端末の初回起動

登録・画像加工・自動再開は停止したまま。GitHub公開はコード/固定参照データ/テスト/設計資料のみ。.localと認証設定・バックアップ・作業証拠は公開しない。

新規cloneではprivate原資料 `.local/parts/parts.json` / `.local/catalog/catalog.json` が両方存在しない時だけ手動専用。空manifestを生成せず、片側欠落/改変/不正/権限失敗を手動モードへ降格しない。原資料あり時のsalePolicy厳密hash/identity/hold/最小販売単位/重複検査を変更しない。

手動モードは原資料由来のない画像パーツと紐商品指定のないDesignだけ作成/編集/読込できる。原資料を示すimport_source、source_url、sourceDraftId、source_checked_at、source snapshotを拒否。旧行から由来を消す入力も拒否。紐商品一覧は空。backup復元の2形式もtransaction内で同じ由来境界を確認し、不適合ならrollbackする。

既存libraryを移すには対応する原資料2ファイルを非公開で先に配置し、同じ版のコードでprivateバックアップを空workspaceへ復元する。収集の自動再開/hold解除/画像再加工は行わない。GitHubは端末間DB同期ではない。

設計はSol/mediumを明示要求、実runtime model確認不可。検証は原資料なしの隔離ディレクトリで手動画像作成/編集/保存/再読込/backup復元、由来除去・公式入力/復元拒否、片側欠落・hash不一致拒否。主workspaceへの書込なし。
