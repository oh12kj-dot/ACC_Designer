# 復旧保存・PWAの検証

2026-10-05 JST。ユーザー指定でSupabase接続作業を除外。詳細設計v1.4 §25/§26の範囲内。

## 実装と回帰

- 500ms debounce直前に画面が非表示/終了すると復旧保存を開始しない問題を、修正前に2テストで再現。visibilitychange(hidden)/pagehideで最後に確定したhistoryをIndexedDBへ書込開始。previewや未確定dragは保存しない。owner/epochが変わった場合は旧accountの新規書込/エラー表示を拒否する。
- IndexedDB write/clearのtransaction abortでPromiseが未解決になる問題を修正。実ブラウザーでtransaction.abortを発生させ、即時rejectと前snapshot保持を検証。
- PWA promptの失敗/キャンセル/一回限り消費、appinstalled追従、古いdialog結果による新状態上書き防止。standaloneでは追加案内を非表示。SafariではApple公式のホーム画面追加案内へ誘導。
- URL候補入力のhydration前操作が失われることをmobile WebKitで再現。初期HTMLでは入力をdisabledにして、event handlerの準備完了後に有効化した。修正後の同E2E成功。

## 独立レビュー

AGENTS.mdのdata-integrity review規則に基づき、gpt-6.1-sol / Mediumを明示要求。runtimeの実model/effort確認は公開されていない。

P1: lifecycle listenerが古いhistoryを保持したまま、読込中に更新されたrevision.currentを読んでしまう。旧内容に新Revisionが付くと、復旧後のoptimistic conflictを回避し得る。レビュー担当はcode sequenceで指摘し、再現テストの実行なし。

親で最新版への置換前・旧listener cleanup前にpagehideを発火する回帰を追加。修正前はexpectedRevision=5（要求0）で失敗。snapshotと一緒にRevisionをcaptureする修正後に成功。独立再レビューなし。ほかのblocking findingなし。

## ブラウザー検証の境界

PC/mobile Chromium/WebKit。Editor/Storageは実clientコード＋模擬Supabase。画像校正の期待値はCSS pointer座標丸めを含む設計の3%許容内で検証し、実物精度とは区別する。

通常のfixture E2EではService Workerをblockし、通信差し替えとの干渉を除外。PWA E2Eでは実SWを有効にする。Windows WebKitのautomation offlineモードはSW dispatch前に失敗するため、全4構成でloopback serverがnavigation connectionを切断し、public/sw.jsそのもののoffline fallbackを検証。Chromiumではcontext.setOfflineも検証。

native2指操作はChromium CDPで検証。WebKitの該当2テストのみ明示skipし、全4構成でsynthetic PointerEventのpinch/cancelと未保存構造・history不変を別途確認。実iPhone/Safari/PWA installation、OSによる強制終了時のIndexedDB完了保証は未確認。lifecycle書込開始はbest effortであり、完全offline編集を追加したものではない。
