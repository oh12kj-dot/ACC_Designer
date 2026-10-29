# 制作ワークフローの初版契約

2026-10-24。ユーザーが承認した5項目を一つの編集ワークフローとして実装する。一般Part登録と監視は停止を維持。既存Part/Asset/原写真/価格/実穴/実接続/過去Designを移動・上書きしない。Supabase不使用。

## 紐・配置範囲・費用

cordSpecification v1の出典付き商品・使用長さは保持する。明示的に「紐の配置範囲」を設定すると、使用長さを確保分込みの切る長さとして利用し、結び代（両端合計）と留め具用確保長を差し引く。留め具本体長の自動計算ではない。

editorConfig.cordLayoutV1={version:1,cordBinding:{sourceDraftId,sourceSha256,usedLengthMm},guide:{shape,width,drop,center:{x,y}},knotAllowanceMm,claspAllowanceMm,patternNodeIds}。保存済み紐の構図はブラウザー用ガイドより優先。形や範囲を変更する際は解除して再設定。吸着/自動向き/補正角の個別切替は維持。範囲は正の10000mm以下かつ確保分差引後に収まること。nodeは勝手に移動しない。

占有長は明示関連付けしたnodeの写真anchor投影・その接線方向への本体BOX投影の区間和。自動混在配列はそのnode IDを関連付ける。手動で選択した既存nodeへ関連付けを置き換えることも可。全自由nodeを足し合わせない。ガイドから離れた/寸法不足のnodeを含めば未確認と表示。重なり・はみ出しは注意し、実物の糸通しや接触とは表示しない。範囲外の余りと、配列内の空き目安を分離する。

cord-products APIは従来の厳密source商品16variantに、独立したquote projection（同source hash、明示販売長、価格、通貨）を追加。号数/本体径/重量から販売長を捏造しない。20m、1ヶ(10m)等の確かな表記のみ利用。切る長さに必要な販売単位数を切上げ、購入額を表示。使用原価ではない。未確認/失効なら金額未確認、0円扱いしない。同商品の実材料Pathがあれば設定分は二重加算しない。現登録素材に紐Partはなく、今回も実DesignPath/BOM entityを生成しない。見積もりは別行の仮参考額。

## 混在配列

パーツ選択の配列モードで写真をA/B/C枠へ追加。同じ商品も複数枠可、中央専用1個も別に選べる。1〜10枠、繰返し1〜100、中央/対称展開を含め全100個以下。左右対称は片側列+中央1個+逆順列、実mirror linkは作らない。

全体中心をガイド上で指定。各商品の接線/向き/写真anchorと隣接半幅で配置、未確認寸法は手動間隔を要求。範囲超過/重複ID/アーカイブ/path素材/不適合は全件拒否。見本IDは固定、写真と全個数を表示し確定で1履歴、1Undo/Redo。既存mirrorグループ内へ混在配列は追加しない。source/長さ変更時も見本と確定の両方で現条件を検証。レシピ保存はせず通常nodeへ展開。

## 表示上の組み立て

editorConfig.visualAssembliesV1={version:1,groups:[{id,baseNodeId,decorationNodeIds}]}。選んだ台座へ飾りの中心を重ね、表示グループとして保存。実接着面/材質/接着剤適合は未確認。写真と役割を選択前に表示。

既存component移動/回転へ表示グループを含め、同じ相対位置・角度を維持する。複製は新node IDで全員を10mmずらし、同じPart参照/価格を保持。固定中は移動/回転/複製拒否。既存実接続/Path拘束/mirror linkのあるnodeはグループ不可、共有所属/欠損参照も不可。単体の目安吸着はグループに適用しない。明示複数選択で二重移動しない。一部削除なら表示グループを解除し、残部品は保全。物理接続生成0。

## 探す・確認する

素材/形/用途は独立複数選択。軸内OR・軸間AND、既存category/series/color/queryともAND。公開名由来の検索用ルールで、正式category/ID/価格/機能を変更しない。判定不可は未分類。用途検索は穴/製作適合を保証しない。商品名部分一致は検索補助だけ。

カード外の「穴・寸法の確認状態」で穴の有無/位置/軸/径/本体寸法/画像尺度/実接続を別表示。既存source/Asset/photo hash照合helperを使い失効は未知へ。写真目安と中央投影を実入口/出口としない。元画像変更や実測を今回は行わない。

用語説明は丸カン/9ピン/Tピン/留め具/つぶし玉/貼付台座。既存Assetのサムネイルを開いた時に取得、欠損は明示し架空写真なし。用語検索とパーツ検索へのリンク、タッチ/キーボード対応。開閉だけでDesignを変更しない。

## 保存・検証

全編集は既存change/history/recovery/revision競合を利用。client共通validateStudioとlocal save transaction境界でschemaのversion/正確keys/有限値/長さ/ID所属/拘束/source bindingを検査。変更された紐layoutは現registry/catalog/policy bytes SHAとsource snapshotを再照合、無変更の旧source設定は別編集保存を阻害しない。所有者ごとのrow lockとSQL親子制約を維持。表示グループは実部品の参照だけ。

検証証拠: evidence/studio-workflow-verification.json、studio-workflow-live.json。unit189/41files、Chromium PC/mobile6（新ワークフロー+取り付け+小粒再吸着）、typecheck/build。隔離SQLで保存/再読込、source/径/参照改ざん拒否。実画面は混在配列見本を取消し、保存・配置の変更要求0。全Part11335/Asset14333/実穴接続0のtable hash前後一致。保全比較期間中、別Design juがrevision3→5に変化したことを記録し、古いsnapshotへ戻さない。対象Design121とtest2 revision2は完全一致。

明示Sol Mediumを指定した設計助言・同agentの限定reviewを使用（runtimeモデル確認情報なし）。見本依存の指摘を受け、実効ガイド/紐binding/source確認をmemo依存へ明示。もともと現mounting objectによる再計算もあるため、旧見本での誤保存が実証されたとはしない。物理的な製作可能性・接着強度・全商品実接続は今回の受入範囲外。
