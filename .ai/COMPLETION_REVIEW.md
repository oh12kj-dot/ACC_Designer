# MVP補完のレビューと修正

2026-10-05。独立レビューは gpt-6.1-sol / Medium を明示要求。runtimeが実モデル/effortを公開していないため、確認済みSolレビューとは表記しない。先行 gpt-6-sol / Medium 呼出しはcapacityで完了せず、完了したレビューに数えない。

## 指摘と処置

1. **P1: drag中Saveとpointerupの競合**。保存snapshotに含まれない変更を保存済みとしRecoveryを消す可能性。active drag/path drag/gesture/preview中のSaveを拒否。保存開始時の編集世代と完了時を比較し、後続編集はdirtyを保持しRecoveryを消さない。DesignEditor DOMテストでdrag中Ctrl+S拒否→確定→最新座標保存を確認。
2. **P1: auth切替後の遅延load/reload**。owner捕捉前のsignoutや古いasync reloadが前userデータを復活させる可能性。ownerを初期ロード開始時に捕捉しloadEpoch/identityで無効化、認証切替で履歴/画像/Recovery表示/gestureを破棄。DOMテストで遅延初期loadと遅延reloadをsignout後に完了させても復活しないことを確認。

修正後の全214テスト、型チェック、build、30ブラウザーテスト成功。独立再レビューは未実施。実サービスの認証遷移/並行保存は未検証。レビューの指摘解消を全環境の安全認定とは扱わない。
