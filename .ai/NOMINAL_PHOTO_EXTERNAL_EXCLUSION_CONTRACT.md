# TOHO own 写真の外側 alpha 除外 — 有限設計契約

2026-10-25。**設計のみ。実装・写真採用・登録の承認ではない。** 対象は、未登録かつ現行販売・品質 guard を通る TOHO の own 先頭写真を、root が原画像で一個体と確認した後も、矩形 crop の角に別個体・影の断片が残る場合に限る。既存の [丸小/特小契約](NOMINAL_TOHO_ROUND_FINITE_CONTRACT.md) と [丸大/特大契約](NOMINAL_TOHO_LARGE_FINITE_CONTRACT.md) の掲載 BODY、暫定 BOX、穴・接続未確認の意味を維持する。既存登録画像・review・rule・時刻・cache・全 Design、公式 registry 27,046 と local SQL を書き換えない。Supabase 書込 0。品質 hold は解除しない。

## 有限候補と束縛

この版の manifest は以下の **2 draft ID のみ**。両方とも既存準備画像は **NOT ADOPTED** であり、表は除外操作の候補資格だけを与える。実行時に未登録・source hold でないこと、販売 guard、現在の原画像と完全 draft を再照合する。既に登録済みならこの経路を拒否し、別 ID・類似色・同じ写真 SHA へ自動拡張しない。表の object SHA は UTF-8 `JSON.stringify(draft)`、photo SHA は own `imageUrls[0]` の保存原 bytes に対する SHA-256。

| source review / draft ID | object SHA-256 | own先頭 photo SHA-256 / 完全 URL | native / crop `{left,top,width,height}` / pose / 暫定 BOX | own 商品関連 |
|---|---|---|---|---|
| small index 23 `kiwa:8711092371748:46969809600804` | `f7a5d1f4b79d65e1c25883471d676af11b16c4d713f54fe3c682dea6d5a1dbdf` | `9e6489e231f5133fd0f48803b5cc05166d7e659439975a097d4635ab40894c6c` / `https://cdn.shopify.com/s/files/1/0758/6503/0948/files/50098.jpg?v=1694515453` | 450×450 / `{339,219,75,80}` / 0° / 1.5×1.5mm | productId `8711092371748`, capture.productIds に同 ID |
| small index 32 `kiwa:8711100530980:46969834471716` | `13093fcafe459dcaa04692da48d3d0b240695cd8bbfa207bfdc216d8a2c758bb` | `bc605418f9848d27c130940dd83e2bf2ef27343644e1a39f81ca7fcfa90a1780` / `https://cdn.shopify.com/s/files/1/0758/6503/0948/files/50376.jpg?v=1694515682` | 450×450 / `{359,251,56,65}` / 0° / 1.5×1.5mm | productId `8711100530980`, capture.productIds に同 ID |

実装用 manifest は ID を key とし、この表の値に加え、**完全な** `imageUrls[0]` URL、category=`bead`、既存 `toho-small-body-scalar` binding、raw sizeText=`約1.5mm`、BODY prefix、review family、元 crop review の identity を固定する。`sourceWidth/sourceHeight` と保存原 bytes の decoded dimensions、URL、capture SHA/productIds、rule の完全 object SHA を全て照合する。候補作成時に読み込む `.local/setup/toho-small-source-review.json` の index 23/32 と未採用 `.local/setup/toho-small-followup{k,m}-prepared.json` は証拠入力であり、review の `reviewed:true` を最終加工画像の承認へ転用しない。manifest の版や ID を増やすには別の有限審査を要する。

## 除外指定と座標

各候補について root が own 原、矩形 crop、既存高 PNG を別々に見て、外側断片の領域を**手動で**描く。新 review は `version='reviewed-external-alpha-exclusion-v1'`、元 `sourceCrop` identity、`reviewedBy`、実際の `reviewedAt`、理由、保護 ROI、多角形の有限配列を持つ。領域を機械的輪郭抽出、色閾値、影判定、穴検出、汎用 ML で生成しない。旧 review の時刻や承認を上書きしない。

座標は既存 `unrotated-decoded-raster-integer-pixels` の **native 原画像**を原点左上、x 右、y 下とする。crop は半開矩形 `[left,left+width)×[top,top+height)`。多角形頂点はこの原画像の整数 pixel 境界、各頂点は crop 内またはその境界で、自己交差なし、閉路の重複終点なし、3点以上。pixel center `(x+0.5,y+0.5)` が多角形の内部または境界なら除外候補とする。重複多角形は union に正規化し、描画順で結果を変えない。初期表の 0°以外も将来の ID には暗黙適用せず別審査とする。

保護 ROI は root が同じ座標で描く、選んだ個体の**見えている全外周と不確かな縁・反射・影のうち個体に属し得る部分を包含する**単一の保守的な領域。内部穴らしく見える箇所も保護 ROI の内部として扱う。除外 pixel と保護 ROI の 2 pixel Chebyshev 拡張域が交われば拒否する。各除外連結成分は crop の外辺に 4近傍で到達し、かつ root が別個体・外側影だと原画像で確信した領域に限る。内部の島、穴、個体と接触/重なりが判別不能な影は除外しない。保護 ROI が曖昧、または外周を安全に囲えない場合も候補を品質 hold に残す。境界・離隔の機械検査は人の個体同定を代替しない。

処理は SHA 照合済みの**原 bytes を不変保存**し、既存 `sourceCrop` の native decode/crop 後・trim/rotate/resize より前に、新 branch だけ crop 内の指定 pixel の alpha を 0 にする。指定外 pixel の RGBA 値を変更しない。元の crop 境界、BOX、pose/回転、後段の contain と透明余白は維持する。断片が残る、または選んだ個体の輪郭/透過が損なわれるなら採用しない。元画像を提供する API/Asset は保存原 bytes のままとし、加工画像だけ新 bytes として記録する。transform に mask version、有限 manifest ID、polygon/ROI とそれらの SHA、原写真・完全 object SHA、`externalExclusionManuallyReviewed=true`、`processingOutlineUncertain=true` を残す。mask は物理外周、穴、尺度、軸、寸法、接続の確認を意味しない。

## 分岐、識別、採否

既存 `kiwa-own-photo-category-box-v1` の spec、`categoryBoxImageKey`、`nominal-category-reviewed-crop-photo-v1` と prepared cache のキー・bytes は**無変更**。新 optional recipe（例 `kiwa-own-photo-category-box-external-alpha-v1`）を manifest の 2 ID、完全束縛、独立した新 review が揃ったときだけ dispatch する。旧 recipe に mask field を追加しない。新 image key は専用 version、原 photo SHA、完全 `sourceCrop`、BOX、pose/rotation、新 mask/保護 ROI 全内容と review identity、manifest ID/object SHA を含む。prepared cache は既存と同じ `imageKey + SHA256(JSON.stringify(spec全体))` の結合と payload hash 検証を使い、新 branch の cache hit でも root の**当該加工 bytes**承認を要求する。新 recipe の欠落/不正な指定は旧経路へ fallback せず拒否する。

root は各候補の own 原と**新**高 PNG を別々に見て、商品同定、一個体の全周、断片消失、輪郭保持、姿勢、透過を記録する。加工前に原画像レビュー済みでも、新しい高 PNG の別レビューと SHA・実際の時刻が必要。承認されたものだけ現行登録 guard を通し local SQL へ最大1 Part/variant。未承認は理由付き品質 hold。採用後も `needs_calibration`、空 `through_holes`/`connection_points`、`connectionReady=false`、掲載値由来の暫定 BOX を維持する。

## 検証とレビュー境界

- 正例: 2 ID の各々で別々の手描き除外と保護 ROI を用い、原 bytes hash 不変、除外 pixel のみ alpha 0、保護 ROI の入力 pixel 不変、後段高 PNG/thumbnail の hash・transform・cache が新 key に束縛される。root の原/加工承認後のみ登録可能。
- 拒否: 未列挙/既登録 ID、object/原 bytes/URL/product association/native寸法/crop/pose/BOX 差、mask 欠落、範囲外・非整数・自己交差・内部島、保護 ROI の 2 pixel 域への接触、断片と個体の接触・判別不能、内穴を消す指定、旧 review 流用、新加工未承認、cache payload 改変は書込 0。mask が全 crop や保護 ROI を空にする場合も拒否。
- 回帰: 既存全 recipe の spec・画像 key・bytes と旧 prepared cache hit を照合する。採用時は原/高画像 API hash、一覧、Part/Asset/全 Design、registry/source/mapping、空穴・接続の read-back、初回 verification 別保存後の rerun 追加 0、cloudWrites 0 を確認する。既存の品質 hold と登録済写真は変更 0。
- この機能は写真の不可逆な視覚処理を伴うため、実装と上記 targeted 検証の後に **独立した Sol の有界レビューを1回**行い、保護域・旧 byte/key 不変・fail closed 分岐・採否境界を確認する。実際の model/effort が確認できた場合だけ Sol review と呼ぶ。レビューは root の原/加工画像目視承認を代行しない。
