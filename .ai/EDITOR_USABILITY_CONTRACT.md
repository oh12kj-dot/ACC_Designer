# 編集画面の表示操作と初回案内

2026-10-25追補: 実寸100%を表示倍率1倍へ統一。表示倍率は既存calibrationのscreenScalePercent/100で表示し、内部zoom数値は画面に出さない。有効な同一signatureの校正を復元する初回だけonZoomで実寸へ合わせる。手動ズーム中/ResizeObserver再通知では1倍へ強制しない。校正なし/失効は「未調整」で、架空の実物大1倍を表示しない。記憶形式/画面条件失効/＋−/タッチpinch/倍率上限/Design保存を維持。unit39/3files、Chromium両viewport6、実PC/mobile2、typecheck/build成功。実試験は別browser contextで50mmの模擬入力、物理的校正の証明ではない。evidence/actual-scale-default-verification.json。

2026-10-24。ユーザー依頼: アプリ起動、マウスホイールズーム廃止、＋/−ボタン化、実寸復帰へすぐアクセス、初回操作を分かりやすくする。

- EditorStageからwheelイベントのlistener/propを除去。preventDefaultをしないのでページの標準スクロールを維持する。タッチの2本指パン/ピンチと既存キーボード操作は維持。
- キャンバス上部に−/表示倍率/＋/実寸100%に戻す/実寸を調整。拡大1.25倍、縮小1/1.25倍、0.25〜20の既存範囲。表示中心を固定し、履歴/dirty/Design保存を作らない。倍率selectは廃止。
- ScreenScaleControlsを折り畳みの外へ移設し、既存の定規調整・記憶・signature失効処理を保持。未調整では実寸復帰をdisabledにして「実寸を調整」から入力を直接開ける。倍率3を実物大と偽らない。条件変更時は再調整を要求。
- 1パーツを探す→2クリック配置→3調整/保存を表示し、操作状態に応じて強調。キャンバスの次操作案内を表示。スマホ入口は「パーツを探す・選択を調整する」。
- パーツ検索を先頭にし、紐/配列/取り付け設定は一つの初期折り畳みへまとめる。既存のカテゴリ/色/写真/確認情報/高度な機能は保持。
- Part/Asset/source/機能穴接続/価格/保存Designは変更しない。一般登録/監視は停止のまま。

検証: unit47/3files、desktop/mobile Chromium8（ズーム/定規/ピンチ/制作ワークフロー）、typecheck/build成功。実画面PC/mobileでwheel上下倍率不変、＋/−、実寸ボタン常時表示、調整入口、検索と初期折り畳み、横overflow/変更要求/画面例外0を確認。全Part/Asset/穴/接続tableと3Design revision121/2/5の前後完全一致。evidence/editor-usability-verification.json、editor-usability-live.json。

127.0.0.1:3000起動、Next32976/writer.lock32976・wrapper38976。初期server起動後に最終buildを反映して再起動。既存ユーザーDesignを保存せず、実画面テストは別contextで変更要求を遮断。元のユーザーtabを再読込していない。
