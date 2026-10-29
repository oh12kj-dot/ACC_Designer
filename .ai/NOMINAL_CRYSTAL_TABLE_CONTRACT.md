# 公式PP/SS換算表による通常配置

2026-10-10。既存の掲載サイズ配置承認内の追加recipe。厳密な校正ではない。

公式collection `https://kiwaseisakujo.jp/en/collections/kiwa-crystal?view=list` が「#1000 units and #2000 units PP/SS→mm conversion table」としてリンクする `https://cdn.shopify.com/s/files/1/0758/6503/0948/files/ppss.pdf` を用いる。PDF原bytes SHA256は181cbd0efc4ca1994fdac4ddda5a93bac18139c6b0eaefbdcf25854b96cdb643。PDFをレンダリングして全表を確認。collectionの抽出文captureは原HTMLとは区別する。

- 対象は許可した丸い正面投影のcut番号と、厳密に解析したPP/SS掲載ラベルのみ。未知suffix、他形状、石座、他部品適合径、欠落する換算行は登録対象にしない。
- 表の概寸範囲を保持。複数PP行を持つSSは該当行の外側端点による包絡範囲と明記し、欠落行の補間はしない。範囲中央値は配置の目安のみ。
- draft/variant/SKU、元サイズ、商品gallery associationと原画像hashを照合。共通表URL/hash、collection scope URL/capture hash、換算行、範囲由来をPartへ保持。
- 複合cut表記は原cut tokenを保持し、実際のcut・サイズ別外観を特定したとは扱わない。
- 主写真453種類の原写真と加工後を全8枚ずつのcontact sheetで目視。単独正面石、または三角配置3個の上段正面石に限定。上段/下段の空白帯と抽出後輪郭を検査。1写真6variantは抽出を拒否し保留。
- 仮の円形輪郭、正面投影、写真加工領域を記録。穴・接続点を生成しない。画像尺度・variant外観・実cut同定は未確認。
- 同じ原写真の加工は1回だけ再利用。Assetは従来どおりhash/recipe/配置径で識別し、径ごとの尺度を保持。
- 旧recipeを優先し既存Partを変更しない。固定registry、既存47寸法図Part、archive参照、ユーザーデザインを保持。Supabase使用なし。

検証: selectorの範囲/拒否境界unit tests、上段抽出と想定外3行拒否のscript tests、端末SQL登録/read-back/再実行追加0、再起動後の全画像hashと一覧対応。別manifest `nominal/crystal-table-promotions.json` と画像判断証拠を保持。
