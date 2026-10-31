# 作成手順・完成前チェック・一覧プレビューと複製

ユーザー承認範囲（2026-10-31）: 既存の手順案内を「長さ→紐・留め具→パーツ配置→完成確認」の操作可能な一つの案内へ置換する。長さ設定をその上に独立表示しない。ピアスは長さ/紐を必須にしない。手順移動は保存や物理接続を自動生成しない。

完成前チェックは現在の保存前編集内容から毎回導出する。既存の寸法適合/構造検証/購入量計算/紐配置budgetを再利用し、不適合・不足と情報不足/未接続を区別する。対象node/pathへの移動は選択・表示だけ。配置済み数量と購入単位数を区別し、在庫未入力から不足を捏造しない。任意の外観配置を物理接続済みと扱わない。全項目なしでも実物製作可能性の認証とはしない。保存を新しい未確認項目で禁止しない。

サムネイルは表示範囲に入った保存済みDesignを読取り、必要Part/画像だけ取得して共通描画器で生成する。保存先への画像書込み/Part再加工なし。ロード失敗・空Designを明示。owner/revision変更/離脱後の結果は破棄。

複製は保存済みsnapshotから新Designへ行い、元Design・Part・Assetを更新しない。全entity ID、mirror group、mirror flip/所属/Link、cordLayoutのpatternNodeIds、visualAssembly group/参照を新IDへ対応付ける。Part/Asset/Point/Hole/source参照は再利用。canvas/editorConfig/姿勢/購入参照を保持。新Designのrevision0にforceなしで保存。ID取得後の失敗は同じID・同じsnapshotで再試行し、既存変更があれば上書きせず開く入口を示す。失われた保存応答は完全snapshot照合で成功確認。新create応答の不確定は既存transportの冪等性範囲を越えて保証しない。

検証: remap全種/元不変/ID衝突拒否、複製途中失敗と応答消失・競合、チェックの既知不適合/未知/未接続/購入計算、手順配置・移動とdirty不変、PC/mobile実API隔離E2E/スクリーンショット、型/build、全旧データ保全。登録/加工/自動再開PAUSED、local実保存先への試験書込み0。Sol mediumの明示依頼はagent thread上限により実施できず、rootが既存契約と照合して設計した。
