# Path / Mirror 最小 Design Contract（v1.4 補足案）

状態: **垂直弦の U/V に関する製品判断待ち**。基本設計 §15.3、詳細設計 §8、§9、§14、§15、§29、および既存の `DesignPath` / Attachment / MirrorLink 型を前提とする。既存設計書・公開型・コードはこの文書では変更しない。

## 目的と不変条件

- `physicalLengthMm`、start、end、shape、U/V の `bendSide` を Path 正データとし、sag、頂点、sample、接線、弧長表は再生成する。`bendSide` は X 鏡映で保持し、+1 を世界座標の下側（Y 増加）、-1 を上側（Y 減少）とする。
- 座標は X 右、Y 下。Path の向きは常に start → end とし、距離・接線・Attachment の `distanceMm` もこの向きに従う。Path の左右入替や start/end 交換は暗黙に行わない。
- Mirror Linked は全 Entity の対応を MirrorLink のみに保存し、左右編集を一つの Composite Command として同期・Undo/Redo する。鏡映は `R(x,y)=(2 axisX-x,y)`、Node 回転は `normalizeDeg(360-rotationDeg)`。Path の start/end は R で変換し、`physicalLengthMm` と `bendSide` は保持する。

## 曲がる側の規約と未決定の一点

非垂直弦 `d=end-start`、`c=|d|`、画面座標での有向弦の左法線 `L=(-d.y,d.x)/c` とする。U/V の曲げ方向は `B=bendSide * sign(d.x) * L` と定める。したがって +1 の B は下向き成分を持ち、X 鏡映後も `B_mirror=R_vector(B)` が成り立つ。始点・終点を逆にしても B は同じ世界方向となる。これで非垂直弦の `bendSide` 維持と厳密な Path 鏡像が両立する。

**製品判断が必要な一点:** U/V の垂直弦（`d.x=0`）を MVP で許すか。垂直弦に上下の法線は存在せず、現在の正データだけでは、`bendSide` を維持したまま厳密な X 鏡映で左右の膨らみを区別できない。推奨は「垂直弦の曲がる U/V を作成・編集確定・保存時に拒否し、straight または非垂直弦へ調整する」こと。この選択なら公開型と `bendSide` 維持要件を変更せずに実装できる。垂直 U/V も必要なら、鏡映側を決める追加情報または `bendSide` 意味・変換要件の変更を先に設計する。`c=0` の U/V も法線が定義できず拒否する。通常の連続編集で `d.x` の符号を跨ぐ操作は境界で側が跳ぶため拒否し、反対側の形へ作り直す。Mirror Command は左右の別 Entity を一度に反射するのでこの編集制約の対象外。垂直に近い弦の数値許容幅と境界表示は同じ規約で扱う。

## 幾何と長さ

- U: `P0=start`, `P3=end`, `P1=P0+d/3+(4 sag/3)B`, `P2=P0+2d/3+(4 sag/3)B` とする。`sag>=0` は弦中点から Bézier 中点への距離。V: 頂点 `M=(start+end)/2+offset*B`、`offset>=0`。straight: start/end の線分のみ。U/V の `physicalLengthMm>=c` を満たし、二分探索（最大 32 回）で sag/offset の絶対値を求める。V は `offset=sqrt(physicalLengthMm^2-c^2)/2` でも同じ形となる。収束または有限値検証に失敗した編集は直前の有効状態へ戻す。
- endpoint 移動時は `c<=physicalLengthMm` に Clamp し、straight は `c=physicalLengthMm` に固定する。物理長は `ChangePhysicalLength` のみで変更する。保存時の実際の描画弧長誤差は `max(0.5mm, physicalLengthMm*0.005)` 以下。近似の誤差を Solver 誤差に紛れ込ませない。
- `derivePathGeometry` は始点から終点への単調な累積弧長表、sample points、非零の単位接線を作る。U の初期分割数は 256。`distanceMm` の点・接線は弧長表を検索し補間して求め、端点は厳密に start/end とする。近傍投影も同じ幾何を使う。直線・V の頂点・曲線の端点で未定義接線を作らないよう片側接線を採用する。キャッシュが古い場合は正データから再生成する。

## Attachment・占有・Mirror 受入条件

- Through は Path 上の `distanceMm` に穴中心を合わせ、接線と穴軸および `flip180` から Node pose を導出する。穴基準で画像外形を接線方向へ投影し、前後占有区間 `[distance-before, distance+after]` を計算する。区間は `[0,physicalLengthMm]` に収まり、隣接区間の重複は `allowedOverlapMm` 以下（通常 0）。`gap=0` の接触は許可する。長さ不足の追加と `ChangePhysicalLength` は拒否し、不足 mm を示す。
- Path Attachment の start/end はそれぞれ端点に固定し、`distanceMm` は NULL。position は始点からの絶対 mm を保持する。形状・長さ変更後も絶対距離を保持し、範囲外になれば拒否する。`normalOffsetMm` と `path_normal` は start→end 接線の画面座標 +90° 法線を基準に評価する。端点 Port 互換性と接続上限を検証する。
- 鏡映後の Through / position 距離、start/end anchor、`flip180` は保持する。反射した接線と Mirror Policy 適用後の Node/穴幾何から pose・占有を再導出して検証する。`path_normal` の法線符号は鏡映で逆になるため、Path Attachment の `normalOffsetMm` は符号を反転し、`rotationOffsetDeg` も反転する。`world_down` は世界下向きを保ち、`path_tangent` は鏡映された接線へ追従する。`keep_rotation` は鏡映後の Node 回転を保つ。Mirror 変換を二度適用すると元の Entity 値へ戻ることを検証する。
- Path の編集・移動・鏡映で Anchor Node の pose が変われば、その Point Connected Component 全体に同一の剛体差分を伝播する。start/end anchor は通常 Drag を拒否し、同一 Component の Path/Through 拘束が二つ以上でも通常 Drag を拒否する。Path Move は start/end に同じ Δ を加え、距離・anchor を保持する。
- 最低限の検証例: 左右どちら向きの斜め弦でも U/V の +1 が下側で鏡像形状が一致すること、start/end 逆順、弧長許容誤差と収束失敗、V 頂点・端点での弧長サンプリング、穴が偏心した Node の占有端と隣接接触・重複、長さ短縮拒否、start/end/position 追従、両方向 Mirror 編集と一回の Undo/Redo。垂直 U/V の扱いは上の製品判断後に負例または正常例を確定する。
