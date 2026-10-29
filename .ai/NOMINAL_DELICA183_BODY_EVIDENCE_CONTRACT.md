# MIYUKI デリカ183候補 — 公式外径補助証拠による有限 BODY 契約

2026-10-28 JST。設計・実装条件のみ。候補183、加工0、採用0、SQL書込0。寸法、写真切抜き、販売、保存の既存合格基準は変更しない。

## 証拠と判定

- 凍結候補 `.local/setup/delica183-body-evidence-candidates.json` SHA256 `a6921752b082f4dfa41329700e2519b6dc2362b7d736f22bbad8888df952e800`、registry SHA256 `a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db`。各行の `draftId`、完全 source object SHA256、名称、SKU、`rawLabel=約1.6mm`、category、tags、description、own gallery 順を再照合する。このファイルは候補表であり採用 manifest ではない。
- 保存済みメーカー一次資料 [デリカ形状・寸法](evidence/miyuki-delica-20261028.html) SHA256 `a2ae53a68583c3930862efe1f449e5ac502648d4acb3759bc42d300fa7821a80`、[シードビーズ寸法表](evidence/miyuki-size-table-20261028.html) SHA256 `aa2fc2ad5ce70baf915188029509e8b34a17e9dd1519e9d61b2ea10d85285e3a`。前者の「デリカビーズ（DB）」は 11/0、**外径**約1.6 mm、**穴径**約0.8 mm。後者も DB 11/0、外径1.6、穴径0.8。両資料は形状群の根拠で、個別色番・SKUのメーカー照合や高さの根拠ではない。
- 凍結183のうち `DB` + 数字（末尾 `-数字` を含む）179件は own 名称・タグ `MIYUKIデリカビーズ`・掲載 `約1.6mm` とメーカー DB 外径が整合する。`DBC` + 数字3件は own タグ `MIYUKIデリカビーズカット` で、メーカーが別系列「デリカビーズカット（DBC）」の外径約1.6 mm、穴径約0.8 mm と明示するため**別の exact family binding**で候補にできる。DBC を DB に読み替えない。
- `DB22L` 1件 `kiwa:8711156990244:46969975963940` は own 掲載 `約1.6mm`・通常デリカタグを持つが、保存済みメーカー資料から suffix `L` と DB/DBL の個別対応を確定できない。DBL はメーカー表で別径の系列。**この1件は意味 hold**。個別型番の一次証拠が得られるまで自動処理・採用しない。したがって今回の寸法意味候補上限は182であり、183の登録承認ではない。
- own description は用途・仕上げ説明で、外径を直接書いていない。既存の `own-body-label-and-description` と偽装せず、新しい有限 `own-label-plus-miyuki-official-outer-diameter` 意味 rule として own 表示とメーカー補助資料を別フィールドで記録する。メーカー値で own 原文・raw label・商品名を上書きしない。商品別の型番/タグ/掲載値と公式 DB または DBC class の照合が欠ければ hold。一般のシードビーズ、DBS、DBM、DBL、DBSC、DBMC、DBLC、TOHO等へ波及させない。

## 表示値と保存表現

各適格 source の掲載 `約1.6mm` を完成**一粒**の外径概寸として扱い、既存の scalar ルール通り `widthMm=1.6`, `heightMm=1.6` の**暫定配置正方形 BOX**へ写す。これは物理的な幅×高さ、円柱高さ、画像尺度、視点、真円/円筒 geometry、fit を証明しない。`publishedSizeLabel=約1.6mm`、`publishedBodyOuterDiameterMm=1.6`、approximate、メーカー資料 URL・SHA256・DB/DBC class・引用箇所、own 完全 object/description hash を別々に保持する。公式の 0.8 mm は穴径として読めるが穴形状・位置・方向・通過可能性を定めないので BOX や geometry に使わない。DBS の外径1.3 mm を DB 高さに転用しない。`physicalWidthVerified=false`, `physicalHeightVerified=false`, `sizeAxisInterpretationVerified=false`, `imageScaleVerified=false`, `variantAppearanceVerified=false`, `through_holes=[]`, `connection_points=[]`, `connectionReady=false` を保つ。

購入は own の 3g 袋と約粒数を原文のまま保持する。粒数や重量から一粒価格・寸法を作らず、価格、通貨、数量、購入 unit、category=`bead`、既存 tags を変えない。参考写真カードや架空の実寸画像枠へ退避しない。

## 一つの有限 extension

1. 固定 7,982-source plan、job/旧 ledger row、registry、workspace と現行 local SQL の未登録 membership を実行時に再照合する。凍結候補表と182件の exact ID + object SHA256 交差のみ許可し、未登録・非 archived・非 hold・販売最小単位/廃番/quality guard 適格の行に限る。残件数は SQL によって変わるので183を現在の残数に加算しない。DB22L、既登録、旧 quality、販売、archived、Italy27 等の除外を緩めない。
2. 現行 `scripts/campaign-body-bridge.mjs` の Delica 拒否と、`scripts/campaign-new-input-bridge.mjs` の `campaignBodyDimensions`/`own-body-label-and-description` 要件を全体的に解除しない。**一つのメーカー BODY 補助証拠 profile** の有限 validator/dispatch を追加し、DB179/DBC3の exact family と上記資料 hash、own raw scalar、完全 source identity を確認してから共通 canvas/sidecar/writer を利用する。`rule.bodyQuote` を用途文で満たしたことを外径承認にしない。旧 recipe、cache、key、既存 Part/Asset の bytes は不変。新 spec・asset key に source、公式資料、family class、選択した写真 binding、review envelope を束縛する。
3. **第一候補は凍結済み own 初枚原写真と既存の unchanged BODY crop/white-background renderer**。DB10の初枚450 px写真 SHA256 `4c5d3dd5fb7564a409e5b3162ae0184a19723c15e2cb74407104ccf64e94b504` は白背景上に別々の黒いビーズが見えるが、この観察は他の ID の適格性を証明しない。各 ID について初枚 bytes、旧 negative/prepared ledger を確認し、既失敗の原 hash/crop/BOX、既加工、別 SKU の再利用を拒否する。一粒が原寸で完全に分離し、輪郭・穴・姿勢が確認できる未回転整数 crop だけ個別 review に進める。新しい写真処理算法や family 専用 renderer は作らない。既存 renderer が crop で背景を残す/個体を消す場合は失敗入力を記録して hold する。
4. 代替写真の新規未加工入力を使う場合だけ `.ai/NOMINAL_NEW_INPUT_CUTOUT_CONTRACT.md` の seeded GrabCut v2 に乗せる。観察されたメーカー macro 写真は密集した複数粒、別の450 px写真はアクセサリー完成品であり、これらを一粒の BODY 写真として自動採用しない。適格な別原写真が個別に見つかった場合も own gallery/variant 対応、原寸 crop・ROI/core・穴と輪郭、旧/新 negative、元写真と加工四種の hash・個別審査、sidecar 状態遷移を要求する。新 GrabCut の許可を初枚に転用しない。
5. 受入検証は正例 DB と DBC の exact 行、負例 DB22L/DBL/DBS/非列挙 ID、object・タグ・掲載値・公式 hash drift、穴径/高さ誤用、既登録・hold・販売単位不適格、旧失敗写真/別 SKU の流用、原・加工どちらかの承認欠落を含める。採用済みだけ既存 single writer の最大250件 chunk/25件 checkpoint に渡す。commit 前に plan/registry/ledger/SQL/写真/公式資料/negative/manifest を再照合し、保存後は Part、snapshot、Asset 四画像 API bytes、既存 Part/Asset/全 Design 不変、再実行 `created=0`、restart/read-back を確認する。cloud writes は0。合格件数は**保存と read-back 後**だけ増やす。

この契約は寸法意味の有限設計判定である。183件の写真審査・加工・採用や SQL 登録を実施した証拠ではない。
