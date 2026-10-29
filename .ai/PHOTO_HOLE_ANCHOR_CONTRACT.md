# 写真による上部穴位置の配置目安

2026-10-24。ユーザーが穴位置の確認・登録を指示。対象はホエールテール横穴のG/RC各1件。一般登録は停止。

- 公式own本文は上部約1.2mm横穴。取得済み正面写真、別角度写真、実際のチェーン通し使用例を照合する。正面では穴中心が隠れており、正確な実寸位置の確定ではない。high画像253×207のG=(120,24)、RC=(121,24)を写真推定の配置目安とする。範囲は各x±11px/y14〜38px。高画像hash・原写真hash・sourceDraftId・Asset ID・補助写真hashへ有限manifestで結合する。
- metadata.guideAnchor(version1,status=photo-estimate,xNorm,yNorm,同じsource/Asset/photo bindings,理由/審査日)だけを追加。ThroughHole/接続/穴径の確定情報は生成しない。画像/寸法/価格/nominal flagsは変更しない。実寸・画像尺度・接続は未確認。
- 軸審査済みかつbinding一致、正の有限寸法、[0,1]の有限座標、機能穴なしの場合だけ使用。失効/未知は従来の中心吸着へ戻る。UIに写真推定の目安を明示し、選択/見本の目安位置を十字表示。出力PNGへ十字は含めない。
- anchorWorld=C+R(angle)*((xNorm-.5)*w*scaleX,(yNorm-.5)*h*scaleY)。12 CSS pxの吸着判定はanchorWorldで行い、最終中心はguideTarget−R(finalAngle)*offset。再計算は冪等で位置が漂わない。単体・複数各コピー・再dragで同じ計算。バッチ弧長開始位置も穴目安の座標を使用。自動間隔は従来の本体矩形投影で、物理接触は保証しない。
- 実接続候補優先、固定/接続済み/Path拘束/左右連動/明示複数dragの除外を保持。実チェーンPathへの物理接続は今回追加しない。対象は表示用のネックレス配置ガイド。
- 正規save_part_successorとexpected_part_sha256で有限2件のmetadataのみ登録。使用中なら旧Partを保全して後継を作る。現Design全体、対象外Part、全Asset/原高画像hash、空穴/接続を検証。初回検証保存後に再実行0。
- unit: anchor/中心の差、回転ON/OFF、scale、stale/不正、繰返し冪等、単体/曲線batch/physical優先。browser: PC/mobileで見本→複数→保存→単体再drag、目安表示と空接続。実デザインへテスト配置しない。

設計助言はSol Mediumを明示要求。runtimeモデル確認情報はないためconfirmed reviewとは表記しない。既存の純粋なguidePoseを冪等なanchor投影へ拡張し、全体の入力状態は再設計しない。
