# 形状ガイド・紐の長さ・画面実寸の契約

2026-10-31追加: [作成・編集導線契約](PRODUCT_CREATION_UX_CONTRACT.md) の任意JSON `editorConfig.necklaceSetupV1` は目標長さの保存情報であり、下記のブラウザー専用ガイド設定とは別。新規作成時の初期ガイドに用い、既存のowner/design別記憶と紐の配置範囲を優先する。目標の明示変更だけをdirty/history/Design保存へ含める。通常のガイド調整は従来どおりブラウザー内のみ。仕上がり目標・配置ガイド・実材料長を区別し、留め具等の寸法を推測しない。下記の「Design保存へ混入しない」はガイドの全設定について維持する。

2026-10-24。ユーザー要求: 紐の長さをmmで指定、右側の上下反転を修正、実寸入力を記憶。

- 開いたU/Vガイドの端から端までの弧長を紐の長さとして入力する。Uは既存128分割、Vは2分割の折線長。変更はwidth/dropを同率で拡縮し、shape/center/比率を維持する。幅/下がり/形変更時は長さを再計算し、独立した保存長と競合させない。非有限/0以下/10000mm超、幅/下がりの既存上限超過は全体拒否。配置済みパーツを自動移動しない。
- この長さは配置用ガイドの世界座標mm。留め具・結び代を含めない。材料のPart/Path/Attachment、BOM、PNG、Design保存/復旧へガイドを混入しない。材料のPath長と完成品総長は別。
- 設定（長さを導くwidth/drop、U/V、表示/吸着/向き、補正角、center）はブラウザー内でowner+design別に記憶する。別デザインへの遷移は既定ガイドへ戻した後、そのデザインの保存設定を復元する。壊れた記録は無視、保存不可でも操作は可能とし表示で通知する。追加のDesign保存やdirty/historyを作らない。
- 吸着/向き追従は初期on。既存12 CSS px閾値、登録ThroughHole優先→束縛済み審査軸→未確認の仮の上下軸90°を維持。無穴/非平行複数軸は角度維持、guideAnchor.keep-currentも維持。axisはscaleX/Yを反映する。
- 接線−軸で得た角度と+180°の同じ軸線から、変換後の写真上向き(0,-scaleY)がより上へ向く方を選ぶ。上下が同値なら前角度に近い方（完全同値は元候補）を選び、ユーザー補正角はその後に加える。軸90°の右側225°→45°、左側315°は維持。審査軸0°の上部anchorは左45°/右315°で本体が紐の下に残る。angle決定後にanchorを再投影する。単体/複数/再drag共通。
- 接続候補はガイドより優先し、固定/実接続/Path拘束/mirror/明示複数dragの除外は維持。表示から実機能穴・接続を生成しない。Vはトップ構成目安で製作可能性を保証しない。
- 画面の200 CSS px線を実物定規でm mmと測る。cssPxPerMm=200/m、zoom100=cssPxPerMm*canvasInternalWidth/canvasCssWidth。入力値と調整記録はブラウザー内owner別に記憶する。同一canvas CSS/internal幅、window幅/高さ、DPR、visualViewport.scaleのsignatureのみ調整を復元する。画面を開き直したとき現在編集倍率に対する割合を示し、100%ボタンを再利用できる。
- 観測した条件変更は保存済み調整も失効し、元サイズに戻る/再読み込みで復活させない。数値は保持し、明示Applyで再調整する。未知/壊れた記録/保存不可で100%を捏造しない。モニター等の検出できない変更は利用者が再調整する。画面尺度とパーツ画像の尺度未確認は別。
- 検証: 弧長/比率/負例、左右/端点/V角/反転scale/補正角/反復の軸平行と上向き、既存anchor/無穴/keep-current/接続優先、owner/design分離、reloadとresize→元サイズ→reloadの失効。実ユーザーDesignへの試験保存0。

Sol Mediumを明示要求して限定設計助言を使用。runtime確認情報なし。実装/検証: evidence/necklace-length-orientation-verification.json、実画面: evidence/necklace-length-live.json。
