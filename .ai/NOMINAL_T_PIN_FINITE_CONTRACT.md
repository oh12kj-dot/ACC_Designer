# Tピン掲載寸法・写真の有限設計（2026-10-26）

状態: **設計のみ。寸法意味候補107（うち販売identity保留4）、写真採用0、登録0。** 本文書の単一cohortは `.local/setup/t-pin-next-source-candidates.json` の正確なbytes SHA256 `352637c344d2388f489b2685756748086f0dcbbc2b0e963369121d1dbfc69437` の150 source / 12商品に限る。対応する機械判定は `.local/setup/t-pin-finite-design.json`。設計担当は `gpt-6-sol / medium` と明示依頼されたが、実行時モデルは未確認であり、独立Sol確認済みとは表示しない。

## 寸法の意味と有限判定

107件は同一商品ページのvariant label、本文、公式寸法図、gallery associationが結び付く。`0.5×20mm` の先頭は**線径**、後ろは**全長**。図の「皿部分の目安サイズ」は頭部径（0.5→約1.3、0.6→約1.7、0.7→約2、0.8→約2.2mm）を示す。商品名と本文は部品を通して先端を丸める未加工Tピンを記述する。ゆえに、直線状の未加工Tピン一本の掲載 nominal 配置枠として、**幅=頭部のおよその最大径、高さ=掲載全長**は防御可能である。これは外形上限・実寸・写真尺度の実証ではない。全長は未加工状態の頭から先端までの縦方向、線径は軸の径として別に保持する。曲がり得るという本文注記も保持し、曲げ加工後の全体寸法や接続適合には転用しない。`head_pin` categoryを保持し、ビーズ/一般BOXへ変更しない。

この107件の数は**寸法意味の候補数**。同じ商品・同じ0.8×65mmに、ゴールドは10本と50g(中袋)、ロジウムカラーも10本と50g(中袋)の販売identityが二つずつある（計4 ID）。同一physical groupの最小販売単位を既存policyで確定するまで、この4件は `saleIdentityHold` とし、両方の登録や質量から本数への換算をしない。残る103件も全件 `photoPending` で、登録可能数は0。43件には同一商品ページから頭部径を結び付けた公式図がない。色・線径が似る他商品の図を転用せず `sourceDimensionHold` とする。後日の別根拠は、このsnapshotを書き換えず新しい根拠と契約改訂で扱う。品質holdは150件とも0であり、意味保留や写真待ちを品質不良と呼ばない。

採用する場合のPartは `width_mm=headDiameter.valueMm`、`height_mm=lengthMm`、`category=head_pin`、`through_holes=[]`、`connection_points=[]`。根拠、元ラベル、線径、頭部径の「約」、全長、図URL/hash、元商品/variant/SKU/source URL/原object hash、画像hashとreviewをmetadataに保持する。`physicalWidthVerified=false`、`physicalHeightVerified=false`、`imageScaleVerified=false`、`variantAppearanceVerified=false`、`connectionReady=false`。購入は元 `purchase` と価格を記録するだけとし、重さ売り・概算本数からpiece単価を作らない。

## 専用の細長い写真処理（実装前の境界）

既存 `prepare-body-box.mjs` のaspect≤4、rotation 0/既存明示90度、40mm上限、Czech cropの元画像座標規約を一切緩めない。専用 `nominal-t-pin-reviewed-single-photo-v1` recipe/key/cache/transformだけを追加する。元画像と図のbytesは変更しない。元写真は商品を示す形状参考であり、寸法証拠は公式図のままとする。写真を原品とvariantに結び付ける最初の条件は、`capture.url` が当該 `draft.imageUrls` に存在し、`capture.productIds` に商品IDがあり、原bytes SHA256・画素サイズがsnapshotと一致すること。共有写真の長さが各variantの長さであるとは主張しない。

原写真には複数の斜め平行Tピンが写るため、写真審査員が**一本の頭・軸全長・先端**を原画像で指し、全てが写り、隣のピンや文字・寸法線を含まないことを確認する。抽出は元のdecoded raster全体を、review済みの有限な角度 `rotationDegrees`（度、範囲 -180～180）だけ一回回転してから矩形cropする。自動trim、回転自動推定、複数部品合成、生成シルエット、補完、穴/マスク生成は禁止。回転の補間背景は白とし、回転後の**実際に得られたexpanded raster**の整数幅/高さを記録する。crop座標はそのexpanded rasterの左上を原点とする整数pixel `{left,top,width,height}`。抽出前に元hash、元画素、角度、expanded幅/高さ、矩形内包を照合する。元座標矩形を回転後に流用しない。90度単位に丸めず、対象写真ごとの角度と一本の選択理由を記録する。cropは加工時に物理的に再計算せず、レビュー済みの座標を使う。

この単独cropを白背景から透過させて、頭部径:全長のnominal枠へ `contain` で**等方拡縮**し透明余白に収める。幅と高さは掲載mmを各40倍した整数pixel（1/40mm grid、最大幅88px・長さ3000px）を上限とする。対応 `mmPerPx=1/40` は**配置枠の公称値**であり、写真からの実測ではない。頭部を幅いっぱいに引き伸ばしたり軸の線径を幅に代入したりしない。細い写真は元解像度と補間で見えにくくなり得るため、原写真と出力の両方で頭部・軸・先端の連続性、欠け、隣個体、白背景残留、透過後の可視性を人が審査する。閾値処理で軸が消える場合は不採用。高解像度出力の見た目だけで原画像の不足を補ったとは扱わない。

原写真reviewは商品ごとの**原bytes hash + URL + 元画素 + 展開後画素 + 角度 + crop + reviewer/time**を固定する。加工後reviewはrecipe/spec/key hashとoriginal/high/medium/thumbnail bytes hash、reviewer/timeを固定し、原審査より後に行う。加工後reviewで少しでも一本の完全性が疑わしければ写真保留。ひとつの採用cropを、同じ原写真・同じ商品でvariantごとに使う場合も、サイズ別外観は未確認と表示する。色や長さが異なる商品への画像横流しは禁止。図は形状写真や切抜き代用品にしない。

## 実装・検証ゲート

1. snapshot SHA256とregistry SHA256、150の重複なしID、各object SHA256、103/4/43分割、各diagramのbytes hashとURL association、全original bytes hashと商品associationを先に照合する。未確認の図hashは寸法採用不可。販売identity保留4の既存minimum-sale決定は独立照合する。
2. 上記専用recipeの構造拒否を確認する。負例: snapshot差分、別商品の図/写真、線径を幅へ採用、元写真座標を回転後へ流用、範囲外角度/矩形、軸端欠け、隣個体、写真未審査、加工画像未審査、元画像解像度不足、既存source重複、購入単価創作。
3. 107件も各distinct写真の原レビューと各distinct加工specの後レビューを経て初めて採用。1件でよいので15mm・75mm両端と細い0.5mmを含む代表的negative/boundary確認を行い、旧body-box/cropのbytesと結果が変わらないことを確認する。
4. 登録時に同sourceDraftIdの既存Partを照合し、既存Part/Asset/registry/designを不変に保つ。初回作成・再実行0・local SQL aggregate readback・保存画像API四種のhash・一覧/編集/配置で公称と未確認の表示を確認する。cloud writesは0。登録前にこの設計を採用実績と書き換えない。

表示文言の要旨: 「掲載値の頭部目安径×全長で一本のTピンの仮配置枠を置いています。線径は軸の太さです。写真は一本を切り出した形状参考で、サイズ別の長さ・実寸・画像尺度・曲げ後の形状・接続位置は未確認です。」
