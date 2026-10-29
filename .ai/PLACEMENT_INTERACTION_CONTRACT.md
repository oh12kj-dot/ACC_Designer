# 配置操作の契約

2026-10-19。ユーザー承認: 素材選択→見本→キャンバスで配置確定→近くの調整操作。

- 選択は一時Placementのみ。Design/history/dirty/recovery/使用履歴へ入れない。見本は表示中のcanvas中央を初期位置とし、マウス移動/単指接触で更新する。
- 単体Partの中心、線素材の始点をクリック/タップ地点へ配置。pointerupで単一primary click/tap（移動6 CSS px以内）のみ確定する。ドラッグ、Space/中ボタンpan、複数指pinchは配置しない。
- キャンセル/Escape/pointercancel、再読込/復旧/undo/redo/auth切替で一時状態を破棄。選び直しは旧見本を置換。keyboardはcanvas矢印で1mm、Enterまたは「この位置に配置」で確定できる。
- 確定は既存change/syncMirror/validateを通し1 undo段階。失敗なら見本を維持し理由を表示。成功後だけmark_used/選択更新。ghostを保存/出力しない。
- 線素材は物理長/shape/bendSideと両端差分を保持しderivePathGeometryで確認。位置/回転/削除は既存domain command、固定/接続/左右連動を守る。
- 近くの操作欄から1mm移動/15度回転/削除（線素材は両端編集）。通し配置中の自由回転は出さない。詳細操作欄も維持。
- 接続候補は既存nearestSnap、登録されたconnectionPoints/throughHolesだけ。自動接続0。確定時に現aggregateから候補を再計算し、不適合を拒否し未確認を明示。穴/接続点の無いnominalへは位置合わせのみと表示。
- 登録/監視停止、Part/Asset/source/Design保存形式、画像先読みとlibrary分割、画像尺度未確認を保持。実ユーザーDesignのテスト書込0。
- 検証: 選択/取消の無書込、tap座標、pan/pinch/drag誤追加0、undo、path長/形、固定/接続/左右連動、候補の明示確定、desktop/mobile。

設計支援はSol Mediumを明示要求。実runtime model/effortは非公開のため実モデル確認済みとは扱わない。独立reviewはattachment/persistence意味を変えた場合のみ必要。今回それらの意味は変更しない。
