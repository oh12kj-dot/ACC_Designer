# 取り付け方・紐径によるパーツ選択

2026-10-24追補: 紐径の基本入力は商品選択に変更。[紐商品・使用長さ契約](CORD_PRODUCT_USAGE_CONTRACT.md)を優先。手入力は商品未選択時のその他比較用のみ。使用商品/長さはDesign保存、取り付け意図はブラウザー設定のまま。

2026-10-24。ユーザー承認: 未確認は注意付き選択可。通し穴なしでも台座へ接着して使えるため、直接通す選択と接着用選択を分ける。

- 初版は「指定せず探す」「紐に直接通す」「台座へ貼り付ける」。円形紐の一本通しで、径をmm手入力。owner+design別ブラウザー記憶、Design/材料Pathへ設定を混入しない。設定だけでdirty/history/保存を作らない。現catalogの24 wireDiameterは丸カン線径なので紐選択へ転用しない。
- through: 根拠付き無穴/片穴は不可。径が分かる場合はhole max < rope+clearanceで不可、hole min >= rope+clearanceかつ通し穴有無を確認済みなら掲載寸法上の候補。範囲が跨ぐ/穴径や有無が未知/出典失効/径未入力・不正なら注意付き許可。約値に独自公差を追加しない。0.05mmは既存Design既定余裕で、全製品の通過保証ではない。無穴の根拠は数値より優先。
- glue: 無穴を含めて選択可。接着面・材質・接着剤・台座の適合は未確認と表示。台座も別パーツとして選ぶ。実Glue接続/剛体拘束/台座や接着剤のBOM自動追加は初版に含めない。位置を決める配置モードであり、接着施工の適合を証明しない。
- Path素材自身は通す対象でないため径フィルタ免除。複数通し/針/端部金具/結び目/平紐/潰れを直径だけで判定しない。上級者向けの既存実接続commandの規約や既存構造編集をこの選択フィルタで変更しない。
- PartPickerのdisabled/callback、DesignEditor.add、preparePlacementで共通pure判定を再実行。設定・余裕変更を見本へ反映し、新規配置の確定直前も判定。不可なら配置/mark_used0、未知は確認ダイアログなし。見本と選択後詳細で理由を継続表示。
- 既存配置は現在条件での注意一覧のみ。自動削除/差替え/既存Designの保存拒否はしない。別取り付け方で配置したものもある旨を明示。設定だけを実接続履歴にしない。

## 穴径の根拠

- src/data/kiwa-reviewed-hole-diameters.jsonの有限24件。自商品記載がある銅玉ゴールド/ロジウムカラーのみ。ブラック/金古美の計24件は同名でも自本文に表がないため補完しない。
- 公式表: 本体2→穴約0.8、3→約0.9、4→約1.0、5/6→約1.1、8→約1.3、10→約1.8、12/14/16/18→約1.8–2、20→約2.2mm。公式Gold/RC商品ページでも同表と製造差の注意を照合。
- registry全体hash、sourceDraft/product/variant/sizeText/name/URL/本文SHA256を照合。Part ID/name/source URL/sourceDraft IDへ結合。別色・別サイズ・後継IDへの自動転用なし。失効は未確認扱い。
- minimumSaleUnitsの既存registry一回読込を再利用し、審査表だけread-only投影。read-partsとget_part_aggregateへhole_referenceを付加し、PartRepositoryはholeReferenceとしてdecodeする。元Part.holeDiameterMm/metadata/ThroughHole/ConnectionPoint/Assetは書き換えない。API一覧SQLカラムの穴径0と、投影穴径24は区別する。

検証はevidence/mounting-selection-verification.json、全24API照合はmounting-source-projection.json、実画面はmounting-live.json。一般登録・監視停止は維持。Sol Medium設計助言と別のSol Low範囲レビューを明示指定、runtime確認情報なし。レビューのブロッキング指摘0。実物の通過/接着強度は未検証。
