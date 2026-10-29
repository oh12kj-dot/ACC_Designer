# アクセサリーデザインアプリ 基本設計書 v1.4

## 1. 文書情報

- 文書名: アクセサリーデザインアプリ 基本設計書
- バージョン: 1.4
- 対象: 個人利用向け Web / PWA アプリ
- 初期対象アクセサリー: ネックレス、ピアス
- 対応端末: Windows PC、iPhone
- UI方針: 編集中から実物に近いリアル2.5D表示
- 保存方式: クラウド保存 + 端末内一時復旧データ
- MVPオンライン要件: 原則オンライン
- 将来拡張: ブレスレット、イヤリング、リング、3Dプレビュー、着用イメージ

### 1.1 v1.4での主要修正

v1.3再監査の指摘を反映し、Editor Coreで実装担当の判断が残らないよう以下を確定した。

1. Point Attachmentの接続時回転をorientationModeと方向ベクトルで定義
2. Point接続済みNodeの通常移動をConnected Component全体移動へ統一
3. 部分移動はDetach操作後のみ許可
4. MVP Path Shapeを u / v / straight に限定し、shallow-UはUのPresetとしてcontrolPointsを派生値化
5. Node PartとPath Partの寸法Validationを分離
6. Path Attachmentの回転方式を明示
7. Mirrorの座標・回転・Connection Point / Through Hole方向変換を数式化
8. 貴和製作所の商品URL Import AssistantをMVPへ追加
9. Import情報に取得日時を保持し再取得差分を確認可能にする
10. Import失敗時は必ず手動登録へフォールバックする

---

## 2. 目的

本アプリは、実在するビーズ、チェーン、ワイヤー、コード、チャーム、金具などのアクセサリーパーツを用いて、ネックレスやピアス等を一から組み立て、完成イメージを実物に近い状態で確認できる個人向けデザインツールとする。

主目的は以下。

1. 実物パーツの購入前に完成イメージを確認できること
2. パーツ同士を直感的に組み合わせられること
3. ビーズ等をワイヤー・テグス・ピンへ実際の構造に近い形で通せること
4. チェーン等の任意位置へチャーム等を取り付けられること
5. PC / iPhone のどちらでも同じデザインを編集できること
6. パーツの実寸を反映し、完成品のサイズ感を把握できること
7. 必要な使用量・購入単位・購入数量・参考金額を自動集計できること
8. 既知の寸法情報がある場合、物理的に接続可能かを判定できること
9. 編集中から実物写真に近い見た目を維持すること

---

## 3. 対象範囲

### 3.1 MVP対象

- ネックレス
- ピアス
- 実在パーツ登録
- 貴和製作所 商品URL Import Assistant
- 商品画像の正規化
- パーツ検索 / 絞り込み
- 実物画像ベースのリアル2.5D描画
- 実寸比表示
- ドラッグ / タップによる配置
- 回転
- 重なり順制御
- Undo / Redo
- 点接続
- Through接続（ビーズ等を通す）
- Path接続（チェーン等の任意位置へ取り付け）
- 自動スナップ
- 接続済みグループ移動
- チェーン / ワイヤー / コードのPath描画
- ピアス左右対称編集
- デザイン保存 / 読み込み
- PC / iPhone同期
- 使用部材集計
- 購入数量集計
- 参考合計金額
- 商品ページリンク
- 寸法互換性チェック
- PNG書き出し
- PWAインストール対応
- 保存失敗時のローカル一時復旧

### 3.2 MVP対象外

- CADレベルの自由形状モデリング
- 金属変形シミュレーション
- 重力を含むリアルタイム物理演算
- 宝石の厳密な光学シミュレーション
- 完全3D編集
- AR試着
- 自動発注
- ECサイトとの正式API連携
- 公開マーケットプレイス
- 複数ユーザー共同編集
- AIによる完全自動デザイン
- 完全オフライン編集
- 保存済みデザインの永続版管理
- すべての組立可能性を完全保証する機能

---

## 4. 用語

### 4.1 Part

実在する商品または素材。

例:

- ビーズ
- パール
- チャーム
- 丸カン
- ピアス金具
- チェーン
- テグス
- ワイヤー
- Tピン
- 9ピン

### 4.2 Node

デザイン上に配置されたPartの1インスタンス。

同じビーズを10個使う場合、Partは1件、Nodeは10件となる。

### 4.3 Connection Point

パーツの固定された接続位置。

例:

- チャーム上部のカン
- ピアス金具下部
- 9ピン端部

### 4.4 Path

長さと経路を持つ素材。

対象:

- チェーン
- ワイヤー
- テグス
- コード
- 一部のピン

### 4.5 Attachment

パーツとパーツ、またはパーツとPathの関係。

MVPでは以下の3種類を扱う。

#### Point Attachment

固定接続点同士を接続する。

Point Attachmentは位置だけでなく向きも保持する。Connection Pointには接続方向 `directionDeg` を持たせ、接続時の回転方式を `orientationMode` で決定する。

- `align_opposite`: 接続方向同士が180°反対向きになるよう自動回転
- `keep_rotation`: 現在のNode回転を維持
- `manual`: 接続後にユーザーが回転を確定

通常の金具接続は `align_opposite` を既定値とする。

例:

```text
ピアス金具
   │
 丸カン
   │
 チャーム
```

#### Through Attachment

素材がパーツの穴を貫通する。

例:

```text
テグス ──●──●──●──
          ビーズ
```

#### Path Attachment

Path上の任意位置へパーツを取り付ける。

例:

```text
チェーン ─────────
             │
           丸カン
             │
          チャーム
```

---

## 5. 利用シナリオ

### 5.1 ビーズネックレス

1. 新規作成で「ネックレス」を選択
2. テグス、ワイヤー、コードまたはチェーンを選択
3. 長さを指定
4. ビーズを選択
5. Path上へ追加
6. ビーズがThrough Attachmentとして順番に配置される
7. ドラッグで順番または位置を変更
8. 留め具を接続
9. 必要に応じてチャームをPath上へ追加
10. 完成サイズ、必要数量、購入数量、金額を確認
11. 保存

### 5.2 チェーンネックレス

1. チェーン商品を選択
2. 使用長さを指定
3. Path形状をU字等のプリセットから作成
4. チェーン上の任意位置をタップ
5. 丸カン、チャーム等を接続
6. 位置を微調整
7. 長さと見た目を確認
8. 保存

### 5.3 ピアス

1. 「ピアス」を選択
2. ピアス金具を追加
3. 丸カン、9ピン、Tピン、ビーズ、チャーム等を接続
4. ピンへビーズをThrough Attachmentで通す
5. 片側を完成させる
6. 左右対称モードで反対側を生成
7. 必要ならIndependentへ切り替える
8. 長さ、使用部材、重量情報が揃っている場合は参考重量を確認
9. 保存

### 5.4 PCとiPhoneの併用

1. PCで編集
2. クラウド保存
3. iPhoneで同じデザインを開く
4. タッチ操作で修正
5. 保存
6. PCで最新Revisionを取得

同時編集はMVPでは想定しない。競合した場合は利用者に選択を求める。

---

## 6. システム構成

### 6.1 採用技術

- Frontend: Next.js + React + TypeScript
- UI: Tailwind CSS
- 2D / 2.5D Editor: Konva.js
- 状態管理: Zustand
- Database: Supabase PostgreSQL
- Image Storage: Supabase Storage
- Auth: Supabase Auth
- PWA: Web App Manifest + Service Worker
- Deploy: Vercel
- Test: Vitest + React Testing Library + Playwright
- 将来3D: Three.js / React Three Fiber

### 6.2 構成

```text
Windows PC / iPhone
        │
        ▼
   Next.js PWA
        │
        ├─ UI
        ├─ Real 2.5D Editor
        ├─ Geometry Engine
        ├─ Attachment Engine
        ├─ Compatibility Engine
        ├─ Purchase Calculator
        └─ Local Recovery Cache
        │
        ▼
      Supabase
        ├─ Auth
        ├─ PostgreSQL
        └─ Storage
```

---

## 7. リアル表示方針

### 7.1 編集中からリアル表示

簡略図と完成プレビューを分離せず、通常編集画面から実物写真ベースの表示を行う。

使用する要素:

- 背景透過商品画像
- 実寸比
- 正しい向き
- 軽い影
- 元画像の金属光沢・透明感
- Pathに沿ったチェーン描画
- レイヤー制御
- 高解像度画像の段階読み込み

### 7.2 画像正規化

商品画像は登録時に以下を行う。

1. Crop
2. 背景除去
3. 4点指定による遠近補正が必要な場合はPerspective補正
4. 基準向きへ回転
5. 実寸キャリブレーション
6. 透明余白除去
7. 必要に応じて明るさ・色温度の軽い補正
8. Thumbnail / Medium / Highの生成

パーツ登録時に「画像上の2点」と「その実距離mm」を指定できるようにし、画像と実寸の対応を確立する。

### 7.3 外部画像の扱い

PNG出力時のCORS問題を避けるため、外部商品画像URLをCanvasへ直接描画しない。

画像はユーザーが登録時に取り込み、アプリ管理Storageへ保存したものを描画する。

### 7.4 MVPにおける「リアル」の定義

MVPで保証するリアルさは、アクセサリーを正面または準正面から確認する2.5D完成イメージを対象とする。

- 実物商品画像を使用する
- 相対実寸比を維持する
- チェーン・コード等の形状をPathへ追従させる
- 重なり順、影、透明感を可能な範囲で再現する
- 高倍率でも商品判別に十分な画質を維持する

任意角度から見た完全な立体形状、裏面形状、宝石内部の屈折などはMVPの「実物同等」評価対象外とし、将来3D機能で扱う。

---

## 8. 実寸モデル

内部座標系はmmを使用する。

- DB保存: mm
- Path長: mm
- 穴径: mm
- 線径: mm
- 画像実寸: mm

表示のみ `zoom` で px へ変換する。

実ディスプレイPPIに依存して「画面上1cmを実物1cm」とすることはMVPでは保証しない。

保証対象は**パーツ同士の相対実寸比**である。

---

## 9. パーツモデル

### 9.1 共通属性

- 商品名
- 商品番号
- 仕入先 / 店舗名
- 商品URL
- カテゴリ
- サブカテゴリ
- 色
- 素材
- 幅
- 高さ
- 奥行き
- 任意重量
- 商品画像
- タグ
- メモ
- Archive状態
- 後継Part参照（supersedes）
- sourceCheckedAt
- importSource / importStatus

### 9.2 Node Part / Path Part寸法

#### Node Part
ビーズ、チャーム、金具等。

- widthMm: 必須
- heightMm: 必須
- depthMm: 任意

#### Path Part
チェーン、ワイヤー、テグス、コード等。

- widthMm / heightMm: 不要
- nominalDiameterMm または segmentPhysicalLengthMm: 描画方式に応じて必須
- 使用長はDesignPath.physicalLengthMmで保持

Path Partに無意味なwidth/heightのダミー値を設定しない。

### 9.3 寸法互換性属性

必要に応じて持つ。

- holeDiameterMm
- wireDiameterMm
- pinDiameterMm
- innerDiameterMm
- outerDiameterMm
- openingWidthMm
- thicknessMm

不明な属性はNULLを許可する。


### 9.4 利用者補助状態

Part本体とは分離して以下をユーザー状態として保持する。

- favorite
- lastUsedAt
- useCount

Tags / NotesはPart本体の属性として保持する。

### 9.5 購入属性

商品ごとに以下を持つ。

- 販売方式
  - piece
  - pack
  - length
- 1パックの入数
- 1販売単位の長さ
- 販売価格
- 最小購入単位

例:

```text
丸カン 20個入り 220円
usage = 3個
purchase = 1袋
price = 220円
```

```text
チェーン 1m 880円
usage = 420mm
purchase = 1m
price = 880円
```

---

## 10. Attachmentモデル

### 10.1 Point

固定点同士。

```text
nodeA.pointA ↔ nodeB.pointB
```

### 10.2 Through

Nodeの穴にPathを通す。

```text
bead.hole ↔ wire.path @ 120mm
```

保持情報:

- 対象Path
- Path上の位置
- 穴軸
- 並び順
- 必要な間隔

Through配置では、各NodeがPath方向へ占有する長さを考慮する。

- ThroughHole位置を基準に、パーツ外形をPath接線へ投影して前方/後方の占有長を求める
- 占有区間がPath始点より前、終点より後へはみ出さない
- 隣接Through Nodeの占有区間は、明示的に許可しない限り重ならない
- gap=0は接触配置として許可する
- Path長不足の場合は追加を拒否し、不足長を表示する

### 10.3 Path

Pathの始点・終点・任意位置にNodeを取り付ける。

Path Attachmentは位置に加えて向きの規則を持つ。`orientationMode` が示す方向は「接続位置からパーツ本体へ伸びる方向（bodyDirection）」とする。Node側Connection Pointの外向き方向は、その反対方向へ合わせる。

- `world_down`: bodyDirectionを世界座標の下向き(90°)にする。ネックレスのチャーム既定値
- `path_normal`: Path法線方向をbodyDirectionにする。normalOffsetMmの符号で左右を選ぶ
- `path_tangent`: Path接線方向をbodyDirectionにする
- `keep_rotation`: 現在角度を維持

`world_down`ではチャーム上部Connection Pointが上向きになり、本体がチェーンから下へ垂れる。

```text
charm.loop ↔ chain.path @ 200mm
```

位置はPath始点からの距離mmを正として保存する。

## 11. Pathモデル

### 11.1 対象

- Chain
- Wire
- String
- Cord
- Thread
- 一部のPin

### 11.2 保持情報

- Part
- 使用長 `physicalLengthMm`
- `shape`: u / v / straight
- 始点座標
- 終点座標
- `bendSide`: +1 / -1（U/Vの曲がる側）
- 始点Anchor
- 終点Anchor
- Path上Attachment

`shallow-U`は独立Shapeではなく、U Shapeを浅い初期配置で生成するPreset名とする。

MVPでは自由Bezier / 任意Polylineをユーザー編集機能として提供しない。Renderer用controlPoints/sag/vertexは上記正データから生成する派生値とし、DBの正データにしない。

### 11.3 Path Anchor

Path Attachmentは以下の3位置種別を正式に持つ。

- `start`: Path始点
- `end`: Path終点
- `position`: Path途中

始点・終点は単なる `distance=0` / `distance=physicalLength` として暗黙扱いせず、Anchor種別として保存する。

これにより以下を明確に扱う。

```text
カニカン
   │
[start]────────────[end]
                      │
                 アジャスター
```

Path対応Partは必要に応じて以下を持つ。

- startPortType
- endPortType
- startMaxConnections
- endMaxConnections

start/end Anchorへの接続は、Node側Connection Point Typeと対応するPort Typeの互換性、および接続上限を確認して確定する。

### 11.4 表示

Path対応Partは商品ごとに描画仕様を持つ。

- segment_texture: 実物チェーンの短区間画像を繰り返す
- stroke_texture: 細かいチェーン等をPatternとして描く
- solid_stroke: ワイヤー、テグス、コード等を線として描く

チェーン:

- 商品画像から繰り返し可能な実物短区間画像を作成する
- 短区間画像が表す実物長mmを登録し、Path上で縮尺を維持する
- 継ぎ目確認用の曲線プレビューをPart登録時に表示する

テグス / ワイヤー / コード:

- 太さ、色、透明度を反映したLine / Textureとして描画

Path描画仕様はPart登録時に設定し、Renderer側へハードコードしない。

### 11.5 Path長の正データ

`physicalLengthMm` を唯一の正データとする。

ユーザーによる形状編集で見た目のPath長が変化しても、操作確定時にLength Constraint Solverを実行し、表示Pathの弧長を `physicalLengthMm` に戻す。

#### 編集中

- Pointer/Touch移動中はPreviewとして一時的な長さ誤差を許容する
- 画面上に一時的な長さ差を表示してよい

#### 操作確定時

- 始点・終点の距離が `physicalLengthMm` を超える操作は成立しないためClampする
- U（shallow-U Presetを含む）は始点・終点を固定し、弦に対するSag量を二分探索して目標弧長へ合わせる
- Vは始点・終点と中央頂点方向を基に、頂点距離を二分探索して目標長へ合わせる
- straightは始点・終点距離を `physicalLengthMm` に固定する

最終誤差は以下を満たすこと。

```text
abs(renderedArcLength - physicalLengthMm)
<= max(0.5mm, physicalLengthMm * 0.005)
```

すなわち原則0.5%以内とする。

物理長そのものを変えたい場合は、形状編集ではなく「使用長変更」操作を明示的に行う。

使用長を短くする場合、position/Through AttachmentのdistanceMmは始点からの絶対距離mmを維持する。新しい長さでAttachmentまたはThrough Node占有区間がPath外へ出る場合は変更を拒否し、先に対象パーツを移動・削除する。


---

## 12. 寸法互換性判定

判定は3値とする。

- Compatible
- Incompatible
- Unknown

情報不足の場合に勝手にCompatibleと判定しない。

例:

### ビーズとワイヤー

```text
holeDiameterMm >= wireDiameterMm + clearance
```

### ビーズとピン

```text
holeDiameterMm >= pinDiameterMm + clearance
```

### 丸カン等

内径、線径、相手側の厚み等が登録されている場合のみ判定する。

MVPでは「既知データに基づく補助判定」であり、製作成功を保証するものではない。

- Compatible: 接続確定可
- Unknown: 警告を表示したうえで接続確定可
- Incompatible: 自由配置は可、接続確定は不可


---

## 13. 主要画面

### 13.1 ホーム

- 新規作成
- 保存済みデザイン
- パーツ管理
- 最近使ったパーツ

### 13.2 新規作成

- ネックレス
- ピアス

### 13.3 デザイン編集

PC:

```text
┌──────────────┬─────────────────────────┬──────────────┐
│ パーツ         │                         │ プロパティ      │
│ 検索           │       Real Canvas       │ 寸法            │
│ カテゴリ       │                         │ 回転            │
│ 最近使用       │                         │ 接続/通し       │
│ お気に入り     │                         │ レイヤー        │
├──────────────┴─────────────────────────┴──────────────┤
│ Undo | Redo | Zoom | Save | Parts | BOM | Export      │
└───────────────────────────────────────────────────────┘
```

iPhone:

```text
┌──────────────────────┐
│ Back  Name     Save  │
├──────────────────────┤
│                      │
│     Real Canvas      │
│                      │
├──────────────────────┤
│ Undo Redo  +  BOM    │
└──────────────────────┘
```

詳細設定はBottom Sheetで表示する。

### 13.4 貴和製作所 URL Import Assistant

ユーザーが貴和製作所の商品URLを貼り付けると登録フォームの候補値を取得する。

候補対象:

- 商品名
- 商品番号 / SKU
- 価格
- 入数 / 販売単位
- サイズ表記
- 商品画像候補
- カテゴリ候補
- source URL
- sourceCheckedAt

取得優先順:

1. JSON-LD Product
2. Open Graph / meta
3. ページ内の意味ラベル
4. 未取得項目は空欄

取得値は確定値ではなく候補として扱い、保存前にユーザーが確認・修正する。既存Partの再取得では自動上書きせず差分を表示する。

ページ構造変更・取得失敗・画像取得失敗は正常系として扱い、必ず手動登録へフォールバックできる。

### 13.5 パーツ登録 / 編集

ステップ:

1. 基本情報
2. 商品画像
3. Crop / Mask / Perspective
4. 実寸キャリブレーション
5. 接続点 / 貫通穴 / Path属性設定
6. Path素材の場合は描画素材設定
   - segment_textureでは元画像から短区間を切り出す
   - 区間の実物長をキャリブレーションする
   - 曲線プレビューで継ぎ目を確認する
7. 購入単位
8. Favorite / Tags / Notes等の補助情報
9. 保存

### 13.6 使用部材 / 買い物リスト

以下を分けて表示する。

- 使用量
- 購入必要量
- 購入単位数
- 単価
- 参考購入金額
- 価格未取得商品の件数（価格不明は0円扱いしない）

---

## 14. 接続済みNodeの移動・回転

### 14.1 Point Connected Component

Point Attachmentは無向グラフとして扱う。選択Nodeを含むPoint Connected ComponentについてPath/Through拘束数を確認する。

- 拘束0: Component全体を同じΔx / Δyで自由移動
- `position` Path AttachmentまたはThrough Attachmentが1個: Pointer位置を対象Pathへ投影し、distanceMmを更新。Anchor Nodeの新しい位置・回転を再計算し、そのPose差分（平行移動＋回転）をComponent全体へ剛体変換として適用
- `start/end` Path Anchorを含む: 通常Drag不可。AnchorをDetachするかPath自体を移動
- 2個以上のPath/Through拘束: 通常Drag不可。拘束を減らすかPathを編集

これによりチェーン上の丸カン＋チャームをドラッグした場合、チェーンから外れずPath上を移動する。Path形状変更によってAnchor Nodeの向きが変わる場合も、同じPose差分をConnected Component全体へ伝播する。

### 14.2 部分移動

Connected Component内の一部だけを動かす場合は、対象Point Attachmentを明示的にDetachしてから移動する。Drag距離による暗黙Detachは禁止。DetachはUndo可能。

### 14.3 回転

- Free Node: Node単体を回転可能
- 拘束のないPoint Connected Component: 選択Node中心をpivotとしてComponent全体を剛体回転
- Component内の1パーツだけ回転: Detach後に回転・再接続
- Path Attachment Node: `rotationOffsetDeg`を変更し接続位置を維持
- Through Node: Path tangentとHole axisから向きを導出し、MVPでは`flip180`のみ切替
- Path/Through拘束を持つPoint Component: 自由回転不可。拘束をDetachしてから回転

### 14.4 Path全体移動

Pathの始点・終点を同じΔで移動し、Through/Path Attachmentは自動追従する。start/endへPoint接続された外部Componentも同じΔで移動する。

## 15. ピアス左右対称

モード:

- Mirror Linked
- Independent

### 15.1 Mirror Linked

Mirror Linkedは初回コピーだけではなく、左右構造を継続的に同期するモードとする。

左右で対応付ける対象:

- Node
- Path
- Point Attachment
- Through Attachment
- Path Attachment

Linked中は、どちら側で以下の操作を行っても対応側へ同一論理操作をMirror変換して反映する。

- Add
- Delete
- Move
- Rotate
- Part変更
- Path変更
- Attachment追加 / 削除 / 移動
- z-order変更

左右への反映は1つのComposite Commandとして扱い、Undo / Redoも左右同時に行う。

### 15.2 Independent

Independentへ切り替えた時点でMirror Linkを解除し、それ以降は左右を個別編集する。

IndependentからLinkedへ戻す場合は自動マージせず、「左を基準」「右を基準」のどちらかを選び、反対側を再生成する。

### 15.3 Mirror座標・回転

座標系はX右向き、Y下向き、回転角は時計回りdegとする。Mirror軸を `axisX` とする。

```text
mirroredX = 2 * axisX - sourceX
mirroredY = sourceY
mirroredRotation = normalizeDeg(360 - sourceRotation)
```

Pathのstart/end Xも同式で反転し、YとbendSide（上下方向）は維持する。

`mirror_image`の場合のみ画像とローカルGeometryを水平反転する。

```text
mirroredXNorm = 1 - sourceXNorm
mirroredDirectionDeg = normalizeDeg(180 - sourceDirectionDeg)
```

Through Holeのentry/exit XとaxisDegも同じ規則で反転する。

`keep_orientation`では画像・Connection Point・Through HoleのローカルGeometryを反転せず、Node中心とrotationのみ左右対応させる。非対称Partは厳密な鏡像ではなく「同じ実物Partを左右で反対に傾ける」表示となる。

`manual`は生成時に`mirror_image`または`keep_orientation`を選び、Mirror Linkへ保存する。

### 15.4 画像方向

文字・ロゴ・非対称形状の商品についてはPart属性 `mirrorPolicy` を持つ。

- keep_orientation
- mirror_image
- manual

`manual` はMirror生成時にユーザーへ向きを選択させ、その選択をMirror Link側に保存する。


---

## 16. 重量

Partには任意 `weightG` を持てる。

表示ルール:

- 全使用部材の重量が既知 → 合計重量表示
- 一部不明 → 「既知分のみ」と表示
- すべて不明 → 重量を表示しない

重量は必須入力にしない。

---

## 17. 保存・履歴

### 17.1 Atomic Save

クラウド保存は以下すべてを**単一DB Transaction**で保存する。

- Design
- Nodes
- Paths
- Point / Through / Path Attachments
- Mirror Links
- View設定
- 対称設定
- 削除済みEntity
- Revision

途中で1件でも失敗した場合は全更新をRollbackし、部分保存状態を作らない。

### 17.2 競合

DesignはRevisionによる楽観ロックを行う。

保存開始時のRevisionとDB側Revisionが異なる場合はConflictとし、自動マージしない。

ユーザーは以下から選択する。

- 最新版を読み込む
- この端末の内容で上書きする

### 17.3 Undo / Redo

MVPでは**現在の編集セッション内のみ**保持する。

保存後の過去バージョンを永久保存する機能はMVP対象外。

### 17.4 ローカル復旧

保存エラーやブラウザ終了対策として、現在編集中のスナップショットをIndexedDB等へ一時保存する。

これは完全オフライン編集を意味しない。

### 17.5 Part参照の安定性

Designが参照済みのPartは、そのDesignの見た目・寸法が後から変化しないよう破壊的更新を禁止する。

- 未使用Part: 通常更新可
- Designから参照済みPart: 更新時に新しい後継Partを作成
- 旧Part: Archive扱いとして保持
- DesignNode / DesignPathは作成時のPart IDを継続参照
- 参照中PartのHard Deleteは禁止

後継Part作成時は、旧Partに紐づく以下の定義を初期値として複製する。

- Purchase Spec
- Path Render Spec
- Connection Points
- Through Holes
- Image Asset参照

変更対象だけを新値へ差し替える。Favorite / RecentはPart世代とは別のユーザー状態として扱う。

Image Assetは一度Partから参照された後は不変とし、Storage上の同一パスを上書きしない。画像変更時は新しいAsset ID / Storage Pathを作成する。

Part本体と従属定義の作成・後継化はDB Transactionで行い、途中状態を残さない。画像ファイルはTransaction前に一時Uploadし、DB保存失敗時は孤児ファイルをCleanupする。

新規デザインの検索結果には原則として最新の非Archive Partのみ表示する。


---

## 18. PC / iPhone

### 18.1 PC

- Click: 選択
- Drag: 移動
- Wheel: Zoom
- Space + Drag: Pan
- Shift + Click: 複数選択
- Keyboard shortcut対応

### 18.2 iPhone

- Tap: 選択
- 1本指Drag: 選択パーツ移動
- Pinch: Zoom
- 2本指Drag: Pan
- Bottom Sheet: プロパティ
- 最小タップ領域: 44pt相当
- Safe Area対応
- Hover非依存

---

## 19. パフォーマンス

目標:

- 一般的なデザインで60fps
- 高負荷時も継続的な30fps未満を避ける
- 数十〜200 Node程度をMVP性能試験対象とする

対策:

- Canvas描画
- 画像キャッシュ
- 解像度切替
- Viewport外描画抑制
- Pathセグメントキャッシュ
- ドラッグ中のDB保存禁止
- React再描画の抑制

---

## 20. 非機能要件

### 性能

- 初回画面表示: 目標3秒以内
- 通常操作入力反映: 目標100ms未満
- オートセーブ: 通常2秒以内

### データ保護

- Supabase RLS
- 自分のデータのみ参照
- Storageもユーザー単位に分離
- 公開URLをデフォルトで生成しない

### 保守性

以下を分離する。

- Renderer
- Geometry
- Attachment
- Compatibility
- Persistence
- Purchase Calculation

---

## 21. MVP受入条件

以下をすべて満たす。

### パーツ

- 貴和製作所の商品URLから登録候補を取得できる
- Import失敗時も手動登録できる
- 再取得時は差分確認後に更新できる
- 実在商品を登録できる
- 商品画像を正規化できる
- 実寸をキャリブレーションできる
- 穴径等を任意登録できる
- 購入単位を登録できる

### ネックレス

- PathはU / V / straightの定義済みShapeだけで編集できる（shallow-UはUのPreset）
- チェーン/ワイヤー/テグスをPathとして配置できる
- ビーズをPathへ通して並べられる
- Path長不足やビーズ同士の不正重複を検出できる
- 順番を変更できる
- チェーンの任意位置へチャーム等を接続できる
- 始点 / 終点Anchorへ留め具を接続できる
- Path形状変更後も物理長誤差が0.5%以内に補正される

### 接続操作

- Point接続でalign_oppositeが機能する
- 通常DragでPoint接続済みConnected Component全体が移動する
- Path拘束ComponentでAnchor回転差がComponent全体へ伝播する
- 部分移動はDetach後のみ可能
- Path AttachmentのorientationModeが反映される

### ピアス

- 点接続ができる
- ピンへビーズを通せる
- Mirror Linkedで反対側を作成できる
- Linked中の追加・削除・移動・Part変更等が双方向同期される

### リアル表示

- 編集時から実物画像ベースである
- 相対実寸比が正しい
- 高倍率でも実用上十分な解像度で表示される
- チェーン/コード形状がPathに追従する

### 判定

- 既知寸法に基づきCompatible / Incompatible / Unknownを表示できる
- UnknownをCompatibleとして誤表示しない

### 集計

- 使用数量を算出できる
- pack / piece / lengthを区別して購入量を算出できる
- 参考合計金額を算出できる
- 価格不明商品は0円扱いせず不明件数を表示できる

### 保存

- PCで保存しiPhoneで読み込める
- iPhoneで保存しPCで読み込める
- Attachment / Path / Mirror Link関係が復元される
- 保存途中エラーで部分保存が発生しない

### 操作

- Undo / Redo
- Zoom / Pan
- 回転
- PNG出力
- iPhone Safariで実用操作可能

---

## 22. 将来拡張

1. ブレスレット
2. イヤリング
3. 3Dプレビュー
4. 首元 / 耳への着用イメージ
5. URL Import対応サイト拡張・解析精度向上
6. 半自動背景除去
7. AIデザイン案
8. 作り方手順
9. 工具一覧
10. リング
11. AR試着
12. 完全オフラインモード

---

## 23. 基本設計完了判定

本v1.4では、MVPで必要なアクセサリー固有の構造を以下の3系統で定義したため、詳細設計および実装へ移行可能とする。

```text
Point Attachment
Through Attachment
Path Attachment
```

また、接続方向、Connected Component移動、制約付きPath Shape、Path Attachment方向、Mirror変換式、URL Import Assistant、Path Anchor、Length Constraint、Atomic Save、Part参照保護、画像正規化、販売単位、寸法互換性をMVP仕様として確定した。

今後の実装中にUI微調整は許容するが、これらのドメインモデルを変更する場合は設計変更として扱う。
