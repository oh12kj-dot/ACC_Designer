# TOHO公表寸法の有限反映（2026-11-06）

メーカー公式sample-cardページが案内するshape chart 200のPDFを原bytes/hash固定し、Popplerで3200pxへレンダリングして全図を確認した。Round 15/0=1.5mm、11/0=2.2mm、8/0=3mm、3/0=5.5mm、Bugleの3/6mmの行を使う。PDFにない数値の穴径・軸長を推定しない。メーカー粒数/kg表から確定した1個価格・重量・実入り数を生成しない。

対象候補は現有効TOHOの丸小132、特小96、丸大34、特大5、竹57の324 Part。現掲載に差分がある3件、名称/サイズと本文の径が食い違う3件は別照合とし、先に根拠の一致した318件へ反映する。丸大の1件はサイズラベルが「-」だが、当該商品の本文が外径約3mm・穴約1mmと明記していることを根拠にする。本文の数値を他商品へ流用しない。

Roundのメーカー呼称外径をnative outer_diameter_mmへ保存し、丸小の仕入先本文2.0〜2.2mmという範囲もmetadataへ保持する。竹の3/6mmは軸方向長さとしてmetadataへ保存し、外径・幅・線径へ転用しない。丸大の穴約1mmだけは当該仕入先本文を根拠としてmetadataに保存し、メーカーPDFの穴径として表示しない。他の穴径は不明を保持し、native hole_diameter_mm・実ThroughHole・接続座標を追加しない。

メーカー/仕入先の公表参考値として数値・意味・約/範囲・原資料・source object/hash・品番・variant・確認時刻を保存する。商品写真・BODY仮枠・画像尺度・旧negative/holdを変えない。写真が集合なら寸法追加後も単体写真/サイズ別外観の審査済みへ昇格しない。旧TOHO失敗cropを再試行しない。

現在baseline、単一writer、通常RPC/CAS、参照対象0/購入spec0/実穴接続0を事前確認、batch読戻し、first保存と正式rerun0、対象外全row/全旧Asset/全Design/registry/catalog/販売方針の保全を確認する。メーカー寸法追加だけの正確な差分receiptで掲載照合sidecarの対象束縛を更新し、952警告/833購入gateと他source factsを消さない。通常編集を自動承認する機能は追加しない。
