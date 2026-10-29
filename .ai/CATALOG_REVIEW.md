# 自動カタログ収集のレビューと検証

2026-10-05。設計と独立レビューにgpt-6.1-sol / Mediumを明示要求。runtime実モデル/effortは確認できず、確認済みSolとは表記しない。

レビューのP1三件を修正した。

- 停止/error後も画像通信する: durable状態をremote queue直前に確認。cached画像は表示できる。image HTTP失敗もjobをhaltし、後続要求を止める。pause後のremote呼出しが増えないunit test成功。
- Retry-After喪失: ResourceErrorにHTTP status/retry期限を保持し、failure URL/phase/status/期限を保存。明示再開でも期限前は取得しない。HTTP429/120秒回帰テスト成功。
- Hostだけでは実接続元を証明できない:標準dev/startを127.0.0.1 bindへ変更。Origin/Host/control tokenも検査。現在listenerはloopback。公開/LAN bindの独自起動はサポートしない。

親が修正を検証し、独立再レビューは未実施。222unit/DOM/SQL tests、typecheck、build、32 browser tests（新catalog選択→画像/情報取込2件を含む）を確認。fixtureのBrowserテストと実商品操作の証拠を区別する。

live収集: public all-item JSONの53ページを取得し、最終pageは250未満。13,045 unique products、variant数はcollection-summary.json参照。最初の6ページ後HTTPエラーで止まり、取得済みを保持して明示再開した。初回のHTML一覧観測13,048との差3件は未解消。収集中の更新やscope差を推測で確定せず、全サイト同一時点の完全性を認定しない。

登録へは公開の画像/name/variant/sku/価格(JPY evidence確認)/説明/tagsを渡す。穴・接続点・mm/pxは作らない。Part/Asset保存・ネックレス/ピアス編集は既存cloud設定が必要。
