# つぶし玉・外径16件 — 有限 own BODY / 写真 BOX 契約

2026-10-25。実装・検証済み: 16件を登録。右下正面候補は内部白背景残りで不採用、別review identityの上側面個体を採用。初回保存→再実行0・増分画像/read-back/既存保全は evidence/nominal-20261025-crimp-verification.json。 設計時点の要件は以下に保持する。以下は登録前の設計要件。現在の画像採用・登録結果は冒頭と増分証拠を参照。実寸校正・穴/接続の認定は行っていない。MIYUKIドロップ8件とは別family、別branchとし、その列挙を拡張しない。

## 対象・証拠の固定

対象は `.local/setup/crimp-outer-body-next-sources.json` の16 complete draftだけ。source file SHA256 `80eccb87ebd8e4d0eae582433f4ec94229ea3626a6a38d9536ab4ff5cf089cba`。各object SHA256は UTF-8 `JSON.stringify(draft)` の値で、idだけでなく全fieldの完全一致を要する。5商品に分かれ、全件 `category=other`、共通tagsに `ボールチップつぶし玉`, `基礎金具`, `基礎金具エンドパーツ`、購入単位 `20ヶ`。ゴールドとロジウムカラーにはさらに `中袋`, `取寄商品`, `大袋`, `大袋中袋` があり、**完全tags配列**もobject hashで固定する。購入数20から20個のPartや寸法を生成しない。`.local/setup/crimp-source-review.json` SHA256 `aadc743e65b8f53f7f61feebdcfd79ba7dc75069c4886f3b16b30b21db5bcc6b` の16件は現snapshotで `sale.allowed=true`, `held=false`。これは写真採用ではない。登録時に最小販売単位・廃番・重複・既存品質holdを再評価する。

| 色 / productId | SKU → 外径表示 → complete object SHA256 |
|---|---|
| ゴールド / `8715248501028` | `10300107` → `外径 1.5mm` → `f91b0ddc2502e4ddc10339f413b83631b16cb648946defe86fd57373a491f1ef`<br>`10300800` → `外径 2mm` → `bd455553cb877165b7c15f7fa429275a2e48772c2cc5586948be61d85ed0de6d`<br>`10301500` → `外径 2.5mm` → `d242970c0050adaeaaf6fbf91cc370fa727d89e604169254d47aa302d92ae9e1`<br>`10301807` → `外径 3mm` → `ebf67ce05af2a43e4b3a2b558877da4758462dc6fe8d385a452ff0c983f0b4bb` |
| ロジウムカラー / `8715248861476` | `10300206` → `外径 1.5mm` → `7498edce5aa0f594244b0c7269f97592395e39e2505eea1e1e3ee3071450e3bd`<br>`10300909` → `外径 2mm` → `390133d5331a2e41daade30b5b5a8ce4a4c1ea571d9b8ea68f5e60334b2c824c`<br>`10301609` → `外径 2.5mm` → `9a0a400cdc8d57437fa793256e37260ca53caf52de43505c6032405571394930`<br>`10301906` → `外径 3mm` → `de02c2ce4b6117f3d02415a135222b20b407d5308c875a74aae21118a15796ad` |
| 金古美 / `8715249090852` | `10300404` → `外径 1.5mm` → `4369ba646cc79b2e53182eef36da8fed5754fe1bce620d3aa3f428787097c020`<br>`10301104` → `外径 2mm` → `e068fc83ea118c5fef453a3864e106ffabe8dbfa29404d3f26bc55e73dea8936` |
| ブラック / `8715248730404` | `10300305` → `外径 1.5mm` → `722a5f9f2c815fbe700fd72310d34655728aee710a731543ae46975b3ff7b76b`<br>`10301005` → `外径 2mm` → `1d8b4c47b7b278828c20509ebe48ee578759e64743439b62140f2c317bf12bed`<br>`10301708` → `外径 2.5mm` → `d61d6ea231cd56d3fbc88d5ecc1330ad795c32d1318e7c83e10999e4c88128be`<br>`10302002` → `外径 3mm` → `f43ec5f8696f3e11512fc5201cbe855a4187ba66a6f25211c538ebcb63741d21` |
| ピンクゴールド / `8715248599332` | `10300701` → `外径 1.5mm` → `00232724988897f4bdf6a59c0de3421dd5171d2c92e7a679c915e2f98f37057e`<br>`10301401` → `外径 2mm` → `9b67ae27ede99d83dc76f90aa602e7d9fb38d8e46176e81ad54c40023577b2dc` |

gallery capture台帳 `.local/setup/crimp-cached-captures.json` SHA256 `f1ed84b0767f42cf64d34cffd38c21c1d921305291df9031a22ccdc358ffa364`。各行のown先頭 `imageUrls[0]` とcapture URL、capture `productIds` の自身のproductId、保存原bytes SHA256を再照合する。現時点で5件とも保存bytesがhash一致、450×450、`image/webp`。**hash一致は画像内容・採用の承認ではない。**

| productId / 先頭画像名 | capture SHA256 |
|---|---|
| `8715248501028` / `10300107.jpg` | `357494d27598ceae941bcab73ef1880ae34cfd7de4eb98a0d72cd304fa8453f9` |
| `8715248861476` / `10300206.jpg` | `4509bfe4ffd74794a0c3fb81849509484431430c116977961d4fdda51a2a853a` |
| `8715249090852` / `10300404.jpg` | `61435815cdf27ccd36023af074520458f5ce66f5535bc5bc534e07aba02e8842` |
| `8715248730404` / `10300305.jpg` | `dc010a1d6e8fa31d390d1e3e32779bb0aef95538ec3dd254912f691ae1731fe2` |
| `8715248599332` / `10300701.jpg` | `207d0b948a4c0e49a293b035b4f8760c360def843472a123cf5fe7b1f4f3c7dc` |

## BODY意味と最小実装

own `sizeText` は上記4種類に完全一致。own descriptionの `＜つぶし玉サイズ＞` 表は `外径1.5mm→内径 約0.8mm`, `外径2mm→内径 約1.1mm`, `外径2.5mm→内径 約1.3mm`, `外径3mm→内径 約1.8mm`。前者だけが選択variantの**本体外形**を示す。表中の内径は穴の原文情報として保存しても、配置寸法・穴geometry・接続に転用しない。サイズ誤差、色/濃淡の変動、テグス注意も原文のまま保持する。`外径` を一般scalar parserに通さず、表中の別サイズを採用せず、完全objectと `sizeText`・name・measurement `outer_diameter`・該当BODY表の外径一致を有限branchで同時に検査する。

`src/server/categoryBoxNominal.ts` の既存 `kiwa-own-photo-category-box-v1` を再利用し、`crimp-outer-body-scalar` という独立した有限branchを追加する。category gateはこの16 hashだけ `other` として通し、既存 `other`/`charm`/MIYUKI `bead`/sequin の条件と出力を変えない。原表示値だけを `widthMm=heightMm=1.5|2|2.5|3` の**暫定正方形配置BOX**へ写す。これは物理W/H、球・円筒の形状、`diameterMm`、内径、写真の尺度/軸/姿勢の証明ではない。`through_holes=[]`, `connection_points=[]`, `connectionReady=false`。供給者の「ワイヤーに通す」「固定する」という用途説明は、位置・径・通過方向・接続可能性の機械認定ではない。

ruleは complete object hash、exact identity/category/tags/description/sizeText、own先頭gallery URL、capture hashを束縛する。写真の既存 `categoryBoxImageKey` 方式は変更せず、`prepared-category-cache` の `hash(JSON.stringify(spec))` とimage keyの**組合せ**で新branchのsource object・写真・crop・reviewを束縛する。既存登録分5件のimage key/transformを変えず、不要な再加工をしない。reviewed crop/pose、aspect-contain、透明余白、既存cache検証を共有するが、cache hitは写真承認を代替しない。登録先は現行のlocal SQLだけ、`cloudWrites=0`。

## 写真ゲートと受入・拒否試験

rootが採用候補の**各原画像と各加工画像を別々に目視**し、own商品との同定、全外周、他個体との重なり、背景透過、crop、姿勢を確認する。原画像5枚は白背景・各3個体（横面と正面リング）という予備観察があり、右下の正面個体をcrop候補とする。これはまだ採用承認ではない。承認した時だけ `url,sha256,sourceWidth,sourceHeight,crop,coordinateConvention,reviewedBy,reviewedAt,rotationDegrees,rotationReason,photoPose` を残す。加工画像のbytes/hashと原captureの紐付けも確認する。5商品はサイズ違いで同じ先頭写真を共有するため、写真がそのvariantの正確なサイズ別外観を示すとは主張しない。native写真の遠近、物理方向、製造・ロット差、色差は未確認。誤認を招く写真、切断・重なり・透過失敗は品質holdに残す。16件全採用は約束しない。

- 正例: exact16のうち現行guardと原/加工写真レビューを通ったものだけ、own外径表示に対応する暫定BOX・`other`・未確認flag・空穴/空接続で登録できる。`20ヶ` は購入単位として残り、1 variantにつき最大1 catalog Part。
- 拒否: 非列挙ID、全objectの任意field差、別variant/別商品へのhash・capture・review流用、別category/tag、表中の内径や他サイズからのBOX生成、`外径` を一般parserへ通す入力、販売個数からのPart複製、穴/接続/円形geometry/写真尺度/軸の推定、未review原画像・加工画像、invalid crop/background。
- 回帰: MIYUKI8、sequin2枝、旧scalar/pair、既存写真key/cacheの出力一致。新branch keyは旧keyと衝突しない。販売guard・廃番・重複・品質hold対象は書込0。
- 統合: 採用分のみ逐次local SQL保存、直後のaggregate read-back、Part/Asset/API原高画像hash・一覧・空穴/空接続を照合。初回verificationを別保存して再実行追加0、既存245以上の品質holdを解除0、registry/mapping 27,046 ID・全既存Part/Asset/Design保全、cloudWrites=0を確認する。

**保留する意味上の境界:** 共通先頭写真は商品色の資料であり、サイズvariant固有の投影形状や実寸を証明しない。variantごとの視覚同定が必要という要件が別途ある場合、この5枚だけでは採用できず追加のown画像証拠が必要。
