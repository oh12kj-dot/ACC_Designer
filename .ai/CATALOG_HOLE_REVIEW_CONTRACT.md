# 登録済み全パーツの穴位置審査

2026-10-24。ユーザーの「2件だけか」という訂正により、対象はactive11,299件全体。一般の新規Part登録は停止し、現登録品の表示用穴情報を審査する。

- 全件inventoryにstate/reasonを持たせる。開始時: 位置2、軸のみ30、無穴確認2,729、その他8,538。未記載/穴径だけ/片穴/複数候補を通し穴の位置確定に変換しない。
- 穴位置と物理貫通軸は独立。guideAnchorへreferenceKind（source-central-projection/visible-opening/surface-entry-estimate）とrotationMode（keep-current/reviewed-in-plane）を追加する。既存2件は互換維持。前後貫通等の軸不明でも、明示された中央投影は表示用位置として使い、回転角は維持する。実ThroughHole・接続・実測尺度は生成しない。
- 第1群: own本文の「中央」「中心に通し穴」73件、明示両穴丸玉かつ既存審査済み球形recipe373件、既存軸審査＋個別写真の中央横穴28件。全474 high画像を5 contact sheetsで目視し、sourceDraftId/原写真hash/Asset ID/high hash・本文完全hash・finite IDへ結合する。座標(.5,.5)は公式説明に基づく中央投影であり、見えている穴入口の精密座標ではない。UIも「中央投影」「入口位置未確認」と表示する。
- 独立した穴の軸審査がある28件だけ既存自動角を維持。それ以外446件はkeep-current。無穴の明示記録はどちらより優先して拒否する。未知/失効binding/不正座標/実機能穴付きは従来fallbackを維持。
- 上部ペンダント686候補は別審査。自動画像候補点は採用証拠ではない。反射面/装飾を穴と誤認した点は不採用、目視とown本文へ結合できる点だけ同じ有限manifestへ登録する。複数穴は単一の中間点に丸めない。
- 既存save_part_successor・expected_part_sha256・固定payload冪等keyを使う。原写真/加工/BOX/価格/registry/holdは変更しない。使用中Partの旧版とDesignを保全し、ユーザーの同時保存は現在状態のまま保持する。
- 初回verificationを保存してから再実行0。対象readback、全Asset行不変、対象外Part保全、正規後継/空機能穴、開始/終了件数を証拠へ保存。全件の穴位置が完了したとは、保留が残る限り報告しない。

Sol Mediumを明示要求した設計助言を使用。runtimeモデル確認情報はなく、独立検証済みという意味ではない。

結果: 追加862件（中央投影474、上部写真目安388）。上部候補298は今回採用点なしとして保留。既存2件込み864、無穴2,729、複数穴の軸のみ2、個別審査残7,704。検証はevidence/catalog-hole-anchor-verification.json、実画面はevidence/catalog-hole-anchor-live.json。
