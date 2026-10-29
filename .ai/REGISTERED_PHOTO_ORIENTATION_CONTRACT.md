# 登録写真の原姿勢復元・ガイド軸

2026-10-23。ユーザーの今回の画像修正指示に基づく有限修正。一般登録は停止のまま。

- 対象はsnapshotで固定したactive nominal Partで、Part証拠とAsset transformの両方に明示90°があり、原写真hashが一致するもの。写真の自然な上下を推測して新しい回転を足さず、加工時の90°だけを逆変換し原写真の姿勢に戻す。0°/strict/保留/除外品へ展開しない。
- 正規化画像3種をlosslessな直角逆回転、新Assetへ保存する。original bytesは完全同一。写真と暫定BOXを一緒に回すためBOX幅高さも交換し、掲載値原文/元順序/旧証拠は保持。物理幅高さ・尺度の検証済みにはしない。元Assetは変更しない。
- 正規save_part_successorを使用。使用中Partは後継を作り旧Partをarchiveし、保存済みDesignは旧Part/旧画像/位置/角度/接続を保持する。未使用Partは同ID更新。既存デザインへの強制置換は行わない。表示訂正は今後の選択・配置へ反映。
- ガイド軸の審査は写真修正と独立。機能ThroughHole/接続は生成しない。metadata.guideOrientationにsourceDraftId/本文hash/原写真hash/現在Asset ID/証拠文/審査日を束縛。公式own本文の明示的な「通し穴が開いていない」なら自動回転対象外。横穴は有限の32写真を照合した横軸のみ採用。未確認は未確認のまま表示し仮上下軸と区別する。
- source registry/掲載価格/最小販売単位policy/hold/既存Asset/Designは不変。更新前Part hash/updated_at・manifest owner・Asset hash・原画像hashを検査。不一致は停止。処理はidempotentキーと永続journalで再開し、完了後再実行0を検証する。
- 今後のnominal workerにも同じ原姿勢復元を適用し、同一原因を再発させない。初回検証保存、readback、原/高画像hash、BOX/旧Asset保全、使用中後継の隔離SQLテスト、ガイド軸/未知/無穴/不正bindingのunit、desktop/mobile配置テストを行う。

設計助言はSol Mediumを明示要求。runtime model確認情報はなく、独立review済みとは表記しない。
