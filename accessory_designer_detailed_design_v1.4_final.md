# アクセサリーデザインアプリ 詳細設計書 v1.4

## 1. 文書情報

- 文書名: アクセサリーデザインアプリ 詳細設計書
- バージョン: 1.4
- 対象: MVP実装
- 対象アクセサリー: ネックレス、ピアス
- 前提: 基本設計書 v1.4
- 内部座標単位: mm
- MVP通信要件: 原則オンライン
- Renderer: Konva.jsベース

### 1.1 v1.4変更点

- Point AttachmentへorientationModeを追加
- Connection Point方向を用いた自動回転式を追加
- Point接続済みNodeの通常移動をConnected Component全体移動へ変更
- parent-childベースの移動制御を廃止
- MVP Path Shapeを u / v / straight に限定し、shallow UはUのPresetとして扱う
- controlPointsを派生値化
- Node Part / Path Partで寸法Validationを分離
- Path AttachmentへorientationModeを追加
- Mirrorの座標 / 回転 / Connection Point / Through Hole変換式を確定
- 貴和製作所URL Import AssistantとSource Snapshot情報を追加
- Import再取得時は差分確認し自動上書きしない

---

## 2. アーキテクチャ

### 2.1 レイヤー

```text
Presentation
  ├─ React UI
  ├─ PC Layout
  └─ Mobile Layout

Editor Application
  ├─ Editor Store
  ├─ Command / History
  └─ Selection

Domain
  ├─ Geometry Engine
  ├─ Path Engine
  ├─ Attachment Engine
  ├─ Compatibility Engine
  └─ Purchase Calculator

Infrastructure
  ├─ Supabase Repository
  ├─ Storage
  ├─ Image Processing
  ├─ IndexedDB Recovery
  └─ PNG Export
```

### 2.2 推奨ディレクトリ

```text
src/
├─ app/
│  ├─ page.tsx
│  ├─ designs/
│  ├─ editor/[designId]/
│  ├─ parts/
│  └─ api/
├─ components/
│  ├─ editor/
│  ├─ parts/
│  ├─ properties/
│  ├─ bom/
│  └─ common/
├─ domain/
│  ├─ design/
│  ├─ part/
│  ├─ geometry/
│  ├─ path/
│  ├─ attachment/
│  ├─ compatibility/
│  └─ purchase/
├─ stores/
│  ├─ editorStore.ts
│  ├─ partStore.ts
│  └─ uiStore.ts
├─ services/
│  ├─ designRepository.ts
│  ├─ partRepository.ts
│  ├─ imageService.ts
│  ├─ recoveryService.ts
│  └─ exportService.ts
├─ lib/
│  ├─ supabase/
│  ├─ image/
│  └─ validators/
└─ types/
```

### 2.3 禁止する依存

- Domain → React
- Domain → Konva
- Compatibility → UI
- Purchase Calculator → UI
- Repository → Editor Store

Rendererへ渡す前にDomain DTOへ変換する。

---

## 3. データベース

## 3.1 parts

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| user_id | uuid | no | owner |
| name | text | no | 商品名 |
| sku | text | yes | 商品番号 |
| source_name | text | yes | 店舗名 |
| source_url | text | yes | 商品URL |
| category | text | no | PartCategory |
| geometry_kind | text | no | node / path |
| sub_category | text | yes | 詳細カテゴリ |
| color | text | yes | 色 |
| material | text | yes | 素材 |
| width_mm | numeric | yes | Node Part実寸幅 |
| height_mm | numeric | yes | Node Part実寸高さ |
| depth_mm | numeric | yes | 奥行 |
| weight_g | numeric | yes | 1個または1単位の重量 |
| hole_diameter_mm | numeric | yes | 穴径 |
| wire_diameter_mm | numeric | yes | 線径 |
| pin_diameter_mm | numeric | yes | ピン径 |
| inner_diameter_mm | numeric | yes | 内径 |
| outer_diameter_mm | numeric | yes | 外径 |
| opening_width_mm | numeric | yes | 開口幅 |
| thickness_mm | numeric | yes | 厚み |
| image_asset_id | uuid | no | 正規化画像 |
| mirror_policy | text | no | keep_orientation/mirror_image/manual |
| tags | text[] | no | 検索用タグ |
| notes | text | yes | 個人メモ |
| is_archived | boolean | no | 新規利用から除外 |
| supersedes_part_id | uuid | yes | 後継元Part |
| source_checked_at | timestamptz | yes | 元商品情報の最終取得 |
| import_source | text | yes | manual / kiwa_url |
| import_status | text | yes | manual / imported / partial |
| metadata | jsonb | no | 拡張 |
| created_at | timestamptz | no | 作成 |
| updated_at | timestamptz | no | 更新 |

数値が不明な物理属性はNULLとし、0を「不明」の代用にしない。

---

## 3.2 part_purchase_specs

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| part_id | uuid | no | FK |
| sale_mode | text | no | piece / pack / length |
| pack_quantity | numeric | yes | pack入数 |
| sale_length_mm | numeric | yes | 1販売単位の長さ |
| minimum_units | numeric | no | 最小購入単位、通常1 |
| unit_price | numeric | yes | 販売単位価格 |
| currency | text | no | JPY |
| weight_basis | text | yes | per_piece / per_sale_length |
| weight_basis_length_mm | numeric | yes | per_sale_length時の基準長 |
| metadata | jsonb | no | 拡張 |

ルール:

- piece: 1 unit = 1個
- pack: 1 unit = pack_quantity個
- length: 1 unit = sale_length_mm

---

## 3.3 part_image_assets

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| user_id | uuid | no | owner |
| asset_kind | text | no | part_main / path_segment |
| content_hash | text | no | 重複・整合性確認 |
| original_path | text | no | 原画像 |
| normalized_high_path | text | no | 高解像度 |
| normalized_medium_path | text | no | 中解像度 |
| thumbnail_path | text | no | 一覧 |
| pixel_width | integer | no | 正規化画像幅 |
| pixel_height | integer | no | 正規化画像高 |
| calibration_mm_per_px | numeric | no | 基準値 |
| source_transform | jsonb | no | Crop/Perspective/Rotate情報 |
| created_at | timestamptz | no | 作成 |

正規化後画像は透明背景PNGまたはlossless WebPを優先する。

AssetはImmutableとする。

- 参照済みAssetのDB行を内容変更しない
- Storage objectを同一Pathへ上書きしない
- 画像変更時は新Asset IDと新しいStorage Pathを発行
- Part / PathSpecから参照中のAssetは削除禁止

---

## 3.4 part_path_specs

Chain / Wire / String / Cord等のPath描画方法をPartごとに定義する。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| part_id | uuid | no | FK / unique |
| render_mode | text | no | segment_texture / stroke_texture / solid_stroke |
| segment_asset_id | uuid | yes | part_image_assets.id FK / 繰り返し短区間画像 |
| segment_physical_length_mm | numeric | yes | 短区間画像が表す実物長 |
| nominal_diameter_mm | numeric | yes | 線材の代表径 |
| stroke_color | text | yes | solid_stroke用 |
| opacity | numeric | no | 0..1 |
| texture_overlap_mm | numeric | no | 継ぎ目補正 |
| start_port_type | text | yes | Path始点ポート種別 |
| end_port_type | text | yes | Path終点ポート種別 |
| start_max_connections | integer | no | 始点接続上限 |
| end_max_connections | integer | no | 終点接続上限 |
| metadata | jsonb | no | 拡張 |

Validation:

- segment_textureの場合、segment_asset_id と segment_physical_length_mm > 0 が必須
- stroke_textureの場合、segment_asset_id と nominal_diameter_mm > 0 が必須
- solid_strokeの場合、nominal_diameter_mm > 0 が必須
- start/end MaxConnectionsが1以上なら対応PortType必須
- RendererはcategoryではなくPathSpecを優先して描画方法を決定する

---

## 3.5 part_user_state

Favorite / Recent等はPart本体から分離する。

| Column | Type | Null | Description |
|---|---|---:|---|
| user_id | uuid | no | owner / PK1 |
| part_id | uuid | no | FK / PK2 |
| favorite | boolean | no | お気に入り |
| last_used_at | timestamptz | yes | 最終使用 |
| use_count | bigint | no | 使用回数 |

---

## 3.6 part_source_snapshots

URL Importで取得した元情報を監査・差分比較用に保持する。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| part_id | uuid | no | FK |
| source_url | text | no | 商品URL |
| fetched_at | timestamptz | no | 取得日時 |
| parser_version | text | no | Parser識別 |
| raw_fields | jsonb | no | 取得候補 |
| status | text | no | success / partial / failed |
| error_code | text | yes | 失敗理由 |

Snapshotは既存Partを自動更新しない。再取得時は現在Partとの差分を表示し、ユーザー確認後に適用する。 初回ImportでまだPartが存在しない段階のCandidate/失敗情報はクライアント状態として保持し、Part保存時にsuccess/partial Snapshotを同時保存する。

---

## 3.7 part_connection_points

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| part_id | uuid | no | FK |
| name | text | no | 名称 |
| type | text | no | loop/ring/hook/etc |
| x_norm | numeric | no | 0..1 |
| y_norm | numeric | no | 0..1 |
| direction_deg | numeric | no | 方向 |
| max_connections | integer | no | 最大接続 |
| local_inner_diameter_mm | numeric | yes | 接続部内径 |
| local_thickness_mm | numeric | yes | 接続部厚み |
| metadata | jsonb | no | 拡張 |

---

## 3.8 part_through_holes

Point Connectionとは分離する。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| part_id | uuid | no | FK |
| name | text | no | 穴名称 |
| entry_x_norm | numeric | no | 入口X |
| entry_y_norm | numeric | no | 入口Y |
| exit_x_norm | numeric | no | 出口X |
| exit_y_norm | numeric | no | 出口Y |
| diameter_mm | numeric | yes | 穴径 |
| axis_deg | numeric | no | 画像上の穴軸 |
| metadata | jsonb | no | 拡張 |

1穴ビーズでも入口/出口を持たせる。

---

## 3.9 designs

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| user_id | uuid | no | owner |
| name | text | no | 名前 |
| type | text | no | necklace / earrings |
| canvas_config | jsonb | no | 表示設定 |
| editor_config | jsonb | no | symmetry等 |
| thumbnail_path | text | yes | 一覧 |
| revision | bigint | no | 楽観ロック |
| created_at | timestamptz | no | 作成 |
| updated_at | timestamptz | no | 更新 |

---

## 3.10 design_nodes

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| design_id | uuid | no | FK |
| part_id | uuid | no | FK |
| instance_name | text | yes | 任意 |
| x_mm | numeric | no | 中心X |
| y_mm | numeric | no | 中心Y |
| rotation_deg | numeric | no | 回転 |
| scale_x | numeric | no | 原則1 |
| scale_y | numeric | no | 原則1 |
| z_index | integer | no | 重なり |
| locked | boolean | no | Lock |
| metadata | jsonb | no | 拡張 |

MVPではユーザー操作による自由スケール変更を原則禁止する。実寸が崩れるため、scaleは画像補正用途のみとする。

---

## 3.11 design_paths

MVP Pathの正データを保持する。自由Bezier / PolylineはMVP対象外。`shallow_u`はShapeではなくUのPreset名。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| design_id | uuid | no | FK |
| part_id | uuid | no | 使用する素材Part |
| physical_length_mm | numeric | no | 実使用長 |
| shape | text | no | u / v / straight |
| start_x_mm | numeric | no | 始点X |
| start_y_mm | numeric | no | 始点Y |
| end_x_mm | numeric | no | 終点X |
| end_y_mm | numeric | no | 終点Y |
| bend_side | smallint | yes | u/vの曲がる側。+1/-1 |
| derived_geometry | jsonb | yes | sag/vertex/control points等のキャッシュ |
| z_index | integer | no | 重なり |
| locked | boolean | no | Lock |
| metadata | jsonb | no | 拡張 |

正データはshape / endpoint / bend_side / physical_length_mm。`derived_geometry`は再生成可能なキャッシュであり正データではない。

---

## 3.12 design_point_attachments

固定点同士。

| Column | Type |
|---|---|
| id | uuid |
| design_id | uuid |
| node_a_id | uuid |
| point_a_id | uuid |
| node_b_id | uuid |
| point_b_id | uuid |
| orientation_mode | text | align_opposite / keep_rotation / manual |
| relative_rotation_deg | numeric | 接続後微調整 |
| metadata | jsonb |

---

## 3.13 design_through_attachments

Nodeの穴へPathを通す。

| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| design_id | uuid | FK |
| node_id | uuid | ビーズ等 |
| hole_id | uuid | ThroughHole |
| path_id | uuid | 通るPath |
| distance_mm | numeric | Path始点からの距離 |
| order_index | integer | 同一Path上の順 |
| locked_to_neighbors | boolean | 隣接間隔固定 |
| flip_180 | boolean | 穴軸方向を180°反転 |
| metadata | jsonb | 拡張 |

---

## 3.14 design_path_attachments

Pathの始点・終点・任意位置へPoint接続する。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| design_id | uuid | no | FK |
| node_id | uuid | no | 取り付けNode |
| point_id | uuid | no | Node接続点 |
| path_id | uuid | no | 対象Path |
| anchor_kind | text | no | start / end / position |
| distance_mm | numeric | yes | position時のみ必須 |
| normal_offset_mm | numeric | no | 法線方向オフセット |
| orientation_mode | text | no | world_down / path_normal / path_tangent / keep_rotation |
| rotation_offset_deg | numeric | no | 向きの微調整 |
| metadata | jsonb | no | 拡張 |

制約:

- `start` → distance_mmはNULL
- `end` → distance_mmはNULL
- `position` → 0 <= distance_mm <= physical_length_mm
- start/endの接続数はPartPathSpecの上限を超えない

---

## 3.15 design_mirror_links

Mirror Linkedの対応関係を永続化する。Mirror対応関係の正データは本テーブルのみとし、Node/Path側へ重複したMirror参照を持たせない。

| Column | Type | Null | Description |
|---|---|---:|---|
| id | uuid | no | PK |
| design_id | uuid | no | FK |
| mirror_group_id | uuid | no | 左右グループ |
| entity_type | text | no | node/path/point_attachment/through_attachment/path_attachment |
| left_entity_id | uuid | no | 左側Entity |
| right_entity_id | uuid | no | 右側Entity |
| manual_mirror_policy | text | yes | manual時の選択 |
| metadata | jsonb | no | 拡張 |

Unique:

```text
(design_id, entity_type, left_entity_id)
(design_id, entity_type, right_entity_id)
```

---

## 3.16 Part参照保護

Designから参照済みPartはImmutable扱いとする。

更新規則:

- Design参照なし: 同一Part更新可
- Design参照あり: 新しいPart行を作成し `supersedes_part_id = old.id`
- 新Part作成時に旧PartのPurchase Spec / Path Render Spec / Connection Points / Through HolesをClone
- Image Assetは変更がなければ参照を再利用し、画像変更時のみ新Assetを作成
- 旧Partは `is_archived = true`
- 既存Designは旧Part IDを継続参照
- Hard Deleteは参照が0件の場合のみ許可
- Archive Partは新規Part検索から原則除外
- Favorite / Recentは世代ごとのPart IDへ紐づく。後継作成時のfavoriteは旧Partから引き継ぐ

これにより過去Designの実寸・画像・購入条件・接続定義を保持する。 既存DesignのBOMは参照Partバージョンの価格を表示する。最新後継Partの価格へ切り替える場合は明示的なPart置換を行う。

後継作成は `save_part_successor()` RPC等の単一DB Transactionで行う。

Transaction対象:

- parts
- part_purchase_specs
- part_path_specs
- part_connection_points
- part_through_holes
- part_user_stateのfavorite引継ぎ

新画像がある場合:

1. 新AssetファイルをUUIDベースの新Storage Pathへ一時Upload
2. DB TransactionでAsset/Part/従属定義を確定
3. DB失敗時はUpload済み孤児AssetをCleanup対象へ登録

StorageとPostgreSQLを完全な同一Transactionにはできないため、孤児Asset Cleanupを明示的に実装する。

---

## 3.17 FK / Delete Policy

参照整合性の削除規則を以下に固定する。

### Part系

- `part_purchase_specs.part_id -> parts.id`: ON DELETE CASCADE
- `part_path_specs.part_id -> parts.id`: ON DELETE CASCADE
- `part_connection_points.part_id -> parts.id`: ON DELETE CASCADE
- `part_through_holes.part_id -> parts.id`: ON DELETE CASCADE
- `part_user_state.part_id -> parts.id`: ON DELETE CASCADE
- `part_source_snapshots.part_id -> parts.id`: ON DELETE CASCADE
- `design_nodes.part_id -> parts.id`: ON DELETE RESTRICT
- `design_paths.part_id -> parts.id`: ON DELETE RESTRICT
- `parts.image_asset_id -> part_image_assets.id`: ON DELETE RESTRICT
- `part_path_specs.segment_asset_id -> part_image_assets.id`: ON DELETE RESTRICT

Part本体の削除は、Design参照がないことを確認した後のみ実行する。

### Design系

- `design_nodes.design_id -> designs.id`: ON DELETE CASCADE
- `design_paths.design_id -> designs.id`: ON DELETE CASCADE
- 3種Attachmentの `design_id -> designs.id`: ON DELETE CASCADE
- Mirror Linkの `design_id -> designs.id`: ON DELETE CASCADE

Node / Path削除時:

- Nodeを参照するPoint / Through / Path Attachmentは削除
- Pathを参照するThrough / Path Attachmentは削除
- Generic IDを持つMirror LinkはDB FKで直接保証できないため、Atomic Save RPC内で削除・存在検証する

---

## 4. RLS / Storage

全ユーザー所有テーブルに `user_id` またはdesign経由の所有関係を適用する。

最低要件:

- SELECT: auth.uid()が所有者
- INSERT: user_id = auth.uid()
- UPDATE: 所有者のみ
- DELETE: 所有者のみ

Storage:

```text
users/{userId}/parts/...
users/{userId}/designs/...
```

公開Bucketを使用しない。

### Asset取得

EditorはDBにStorage Pathのみを永続化し、期限付きURL自体は保存しない。

`AssetService` がPrivate BucketからSigned URLを発行し、期限切れ前に更新する。

- Signed URL TTL初期値: 60分
- Image loaderは `crossOrigin="anonymous"` 相当で読み込む
- Export時も同じ認証済みAssetを使用
- URL期限切れ時はPathから再発行する


---

## 5. TypeScriptドメイン型

```ts
type PartCategory =
  | "chain"
  | "wire"
  | "string"
  | "cord"
  | "thread"
  | "bead"
  | "pearl"
  | "gem"
  | "charm"
  | "connector"
  | "jump_ring"
  | "clasp"
  | "earring_hook"
  | "earring_post"
  | "eye_pin"
  | "head_pin"
  | "spacer"
  | "cap"
  | "pendant"
  | "other";

type SaleMode = "piece" | "pack" | "length";

type MirrorPolicy =
  | "keep_orientation"
  | "mirror_image"
  | "manual";

type CompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "unknown";

type PathRenderMode =
  | "segment_texture"
  | "stroke_texture"
  | "solid_stroke";

interface PathRenderSpec {
  renderMode: PathRenderMode;
  segmentAssetId?: string;
  segmentPhysicalLengthMm?: number;
  nominalDiameterMm?: number;
  strokeColor?: string;
  opacity: number;
  textureOverlapMm: number;
  startPortType?: string;
  endPortType?: string;
  startMaxConnections: number;
  endMaxConnections: number;
}

interface PurchaseSpec {
  saleMode: SaleMode;
  packQuantity?: number;
  saleLengthMm?: number;
  minimumUnits: number;
  unitPrice?: number;
  currency: "JPY";
  weightBasis?: "per_piece" | "per_sale_length";
  weightBasisLengthMm?: number;
}

interface ConnectionPoint {
  id: string;
  name: string;
  type: string;
  xNorm: number;
  yNorm: number;
  directionDeg: number;
  maxConnections: number;
  localInnerDiameterMm?: number;
  localThicknessMm?: number;
}

interface ThroughHole {
  id: string;
  name: string;
  entryXNorm: number;
  entryYNorm: number;
  exitXNorm: number;
  exitYNorm: number;
  diameterMm?: number;
  axisDeg: number;
}

type PartGeometryKind = "node" | "path";

interface Part {
  id: string;
  name: string;
  sku?: string;
  sourceName?: string;
  sourceUrl?: string;
  category: PartCategory;
  geometryKind: PartGeometryKind;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  weightG?: number;
  holeDiameterMm?: number;
  wireDiameterMm?: number;
  pinDiameterMm?: number;
  innerDiameterMm?: number;
  outerDiameterMm?: number;
  openingWidthMm?: number;
  thicknessMm?: number;
  mirrorPolicy: MirrorPolicy;
  tags: string[];
  notes?: string;
  isArchived: boolean;
  supersedesPartId?: string;
  sourceCheckedAt?: string;
  importSource?: "manual" | "kiwa_url";
  importStatus?: "manual" | "imported" | "partial";
  imageAssetId: string;
  purchaseSpec?: PurchaseSpec;
  pathRenderSpec?: PathRenderSpec;
  connectionPoints: ConnectionPoint[];
  throughHoles: ThroughHole[];
}

interface DesignNode {
  id: string;
  partId: string;
  xMm: number;
  yMm: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
  locked: boolean;
}

interface Vec2 {
  x: number;
  y: number;
}

interface DesignPath {
  id: string;
  partId: string;
  physicalLengthMm: number;
  shape: "u" | "v" | "straight";
  start: Vec2;
  end: Vec2;
  bendSide?: 1 | -1;
  zIndex: number;
  locked: boolean;
}

type PointOrientationMode =
  | "align_opposite"
  | "keep_rotation"
  | "manual";

interface PointAttachment {
  id: string;
  kind: "point";
  nodeAId: string;
  pointAId: string;
  nodeBId: string;
  pointBId: string;
  orientationMode: PointOrientationMode;
  relativeRotationDeg: number;
}

interface ThroughAttachment {
  id: string;
  kind: "through";
  nodeId: string;
  holeId: string;
  pathId: string;
  distanceMm: number;
  orderIndex: number;
  lockedToNeighbors: boolean;
  flip180: boolean;
}

type PathAnchorKind = "start" | "end" | "position";

type PathAttachmentOrientationMode =
  | "world_down"
  | "path_normal"
  | "path_tangent"
  | "keep_rotation";

interface PathAttachment {
  id: string;
  kind: "path";
  nodeId: string;
  pointId: string;
  pathId: string;
  anchorKind: PathAnchorKind;
  distanceMm?: number;
  normalOffsetMm: number;
  orientationMode: PathAttachmentOrientationMode;
  rotationOffsetDeg: number;
}

interface MirrorLink {
  id: string;
  mirrorGroupId: string;
  entityType:
    | "node"
    | "path"
    | "point_attachment"
    | "through_attachment"
    | "path_attachment";
  leftEntityId: string;
  rightEntityId: string;
  manualMirrorPolicy?: "keep_orientation" | "mirror_image";
}

type Attachment =
  | PointAttachment
  | ThroughAttachment
  | PathAttachment;
```

---

## 6. 座標系

### 6.1 World座標

単位: mm。

Node座標は画像中心。

Path control pointもmm。

### 6.2 Screen変換

```ts
screenX = (worldX - viewportX) * zoom;
screenY = (worldY - viewportY) * zoom;
```

`zoom` = logical px/mm。

### 6.3 Node描画サイズ

```ts
renderWidthPx = part.widthMm * zoom;
renderHeightPx = part.heightMm * zoom;
```

ユーザーがNode画像だけを拡大縮小するUIはMVPでは提供しない。

---

## 7. 画像正規化

## 7.1 登録フロー

```text
Upload
  ↓
Crop
  ↓
Mask / Background Removal
  ↓
Perspective Correction
  ↓
Rotate / Orientation
  ↓
Physical Calibration
  ↓
Connection / Hole Annotation
  ↓
Generate Assets
  ↓
Save
```

---

## 7.2 Crop

原画像から商品を含む矩形を指定。

Crop後も元画像を保持する。

---

## 7.3 Background Mask

MVP要件:

- 透明背景画像をそのまま利用可能
- 不透明背景画像は手動ブラシ / 消去 / 復元でAlpha Mask編集可能
- 将来AI自動背景除去を追加可能

Maskデータは再編集可能な形で `source_transform` 内へ保存してよい。

---

## 7.4 Perspective Correction

斜め撮影された商品は4点を指定し、矩形へ射影変換する。

ユーザーが補正不要と判断した場合はSkip可能。

必須ではないが、補正有無を保存する。

---

## 7.5 Physical Calibration

ユーザーは画像上の2点を指定し、その現実距離mmを入力する。

```text
point A -------- point B
      12.0 mm
```

計算:

```ts
mmPerPx = knownDistanceMm / pixelDistance;
```

画像Bounding Boxと商品実寸が一致するよう変換する。

幅・高さが製品仕様から明確な場合は両方入力し、縦横比矛盾が大きい場合に警告する。

### 許容誤差

MVP目標:

- 登録寸法に対する表示寸法誤差: ±3%以内

商品写真自体の遠近や立体形状による誤差は別途「写真由来誤差」として許容する。

---

## 7.6 Assets

生成:

- thumbnail: max 256px
- medium: max 1024px
- high: max 2048〜4096px、原画像に応じる

すべて同じ透明Bounding Boxとアスペクト比を使用する。

---

## 7.7 CORS

外部URL画像をEditorへ直接読み込まない。

理由:

- Canvas taint
- PNG Export失敗
- URL失効
- Referrer/認証問題

登録時にユーザー管理Storageへ保存する。

## 7.8 Asset Identity / Cache

Editorの正データは `imageAssetId + Storage Path`。

Signed URLやObject URLはRuntime CacheでありDBへ保存しない。

Cache Key:

```text
imageAssetId + resolution
```

Part後継作成で画像が変更された場合はAsset IDが変わるため、旧DesignのCache/表示も旧Assetのまま維持される。

---

## 8. Path Engine

## 8.1 Path用途

- chain
- wire
- string
- cord
- thread

Eye pin / Head pinはMVPでは短いLine Pathとして表現してもよい。

---

## 8.2 MVP Path Shape

MVPの正規Shape:

```ts
type PathShape = "u" | "v" | "straight";
```

`shallow U`はU Shapeを浅い初期配置で生成するPreset名であり、別Shapeとして保存しない。自由Bezier / Polyline EditorはMVP対象外。

### U

正データ: start / end / physicalLengthMm / bendSide。対称Cubic BezierのsagをSolverで算出する。

### V

正データ: start / end / physicalLengthMm / bendSide。頂点はchord中点を通る法線上に制約し、vertex offsetをSolverで算出する。

### straight

正データ: start / end / physicalLengthMm。

## 8.3 Derived Geometry

`derivePathGeometry(path)`が正データからsamplePoints / cumulativeLengthMm / arcLengthMm / tangentを生成する。Bezier系は256 segmentを初期値とする。`distanceMm`から位置・tangentは累積長Lookup Tableで求める。

## 8.4 Path Length Constraint

physicalLengthMmは正データでShape編集により暗黙変更しない。

- endpointDistance > physicalLengthMm: 操作EndpointをClamp
- U: arcLengthがphysicalLengthMmになるsag絶対値を二分探索し、bendSideで符号決定
- V: 2辺合計がphysicalLengthMmになるvertex offset絶対値を二分探索し、bendSideで符号決定
- straight: start-end距離をphysicalLengthMmに固定
- maxIterations = 32
- 誤差 <= max(0.5mm, physicalLengthMm * 0.005)
- 収束失敗: 直前の有効状態へ戻す
- 物理長変更: `ChangePhysicalLength` Commandのみ

### ChangePhysicalLength

position/Through AttachmentのdistanceMmは始点からの絶対距離として維持する。新しいphysicalLengthMmに対してAttachment位置またはThrough占有区間がPath外へ出る場合は変更を拒否する。

## 8.5 Path Preset

- U
- shallow U: U Shapeを広いendpoint間隔で初期生成
- V
- straight

Presetは正データのみ生成し、自由controlPointsを保存しない。

---

## 8.6 Chain Rendering

チェーンは1枚の静的U字画像を使用しない。

描画方式の正データは `part_path_specs` とする。Renderer内で商品カテゴリから推測しない。

MVPでは以下の方式をPartごとに指定する。

### mode A: segment_texture

短いチェーン区間の透過画像を繰り返す。

- segmentPhysicalLengthMmを登録
- Path tangentへ沿って回転
- 連続配置

### mode B: stroke_texture

細かなチェーンでは近似Texture/Patternで描画。

ズームレベルに応じ切替可能。

### mode C: solid_stroke

形状の細いワイヤー、テグス、コード等を線描画する。

`nominalDiameterMm * zoom` を基本線幅とする。

---

## 8.7 Wire/String Rendering

- Path stroke
- 実寸相当のstrokeWidth
- Part色を使用
- 透明素材はOpacity指定可能

---

## 9. Attachment Engine

## 9.1 Point Attachment

### 候補

移動中NodeのConnectionPointと他Nodeを比較する。

### 距離

```ts
distance = hypot(ax - bx, ay - by);
```

### Screen感覚補正

```ts
snapThresholdMm = clamp(12 / zoom, 1.0, 5.0);
```

### 確定

- Nodeを接続点一致へ移動
- PointAttachment作成
- Historyへ1 Command追加

---

## 9.2 Through Attachment

対象:

- bead
- pearl
- gem
- spacer
- cap
- その他穴あきパーツ

### 追加方法A

ユーザーがPart一覧からビーズを選びPathをタップ。

処理:

1. Path上の最近傍点を計算
2. distanceMm取得
3. ThroughHoleを取得
4. Compatibility判定
5. Node生成
6. Path tangentに穴軸を合わせて回転
7. ThroughAttachment生成
8. 周辺Partと重ならない位置へ必要に応じ自動配置

### 追加方法B

既存NodeをPath上へDrag。

一定距離以内でThrough候補を表示する。

---

## 9.3 Through Nodeの位置

Path座標:

```ts
position = getPointAtDistance(path, distanceMm);
tangent = getTangentAtDistance(path, distanceMm);
```

Node中心はThroughHole中心とPathが一致するよう補正する。

穴の位置がNode中心と異なるため、単純にNode中心をPath上へ置かない。

ThroughHoleの穴軸は無向軸として扱う。表示回転は以下。

```ts
node.rotationDeg =
  normalizeDeg(
    tangentDeg
    - throughHole.axisDeg
    + (attachment.flip180 ? 180 : 0)
  );
```

MVPではThrough Nodeの自由回転は行わず、ユーザーは`flip180`のみ切替可能。

---

## 9.4 ビーズの連続配置

同一Path上のThrough Attachmentを `distanceMm` でsortする。

各NodeのPath方向占有長を算出する。

簡易MVP:

```ts
occupiedLengthMm =
  projectedBoundingSizeAlongTangent(node);
```

自動並べ機能:

```text
[●][●][●][●]
```

各ビーズ間gapを0〜任意mmで指定可能。

### 占有区間検証

NodeのPath方向占有区間は、ThroughHoleを原点として画像外形をPath接線方向へ投影して求める。

```ts
const occupancy =
  projectBoundsRelativeToHole(
    node,
    throughHole,
    tangent
  );

interval = [
  distanceMm - occupancy.beforeMm,
  distanceMm + occupancy.afterMm
];
```

ThroughHoleが中心からずれたパーツでも前後占有長を正しく扱う。

Validation:

- interval.start >= 0
- interval.end <= physicalLengthMm
- 隣接Nodeとのinterval overlap <= allowedOverlapMm
- 通常 `allowedOverlapMm = 0`

`gap = 0` は区間同士が接する配置として許可する。

自動配置時に必要長が不足する場合:

```ts
requiredLengthMm =
  sum(occupiedLengthMm)
  + sum(gaps);
```

`requiredLengthMm > availableLengthMm` なら追加を拒否し、不足mmをUI表示する。

---

## 9.5 並び順変更

UI:

- Path上Drag
- 「前へ / 後ろへ」
- モバイルではBottom Sheet操作も提供

distanceMm更新後、order_indexを再計算する。

---

## 9.6 Path Attachment

Path Attachmentは `anchorKind` により位置決定方法を分ける。

### start

```text
anchorKind = start
distanceMm = undefined
position = getPathStart(path)
tangent = getPathStartTangent(path)
```

PartPathSpec.startPortTypeとのCompatibilityとstartMaxConnectionsを検証する。

### end

```text
anchorKind = end
distanceMm = undefined
position = getPathEnd(path)
tangent = getPathEndTangent(path)
```

PartPathSpec.endPortTypeとのCompatibilityとendMaxConnectionsを検証する。

### position

```text
anchorKind = position
distanceMm = Path始点からの物理距離
position = getPointAtDistance(path, distanceMm)
```

Node接続点を当該位置へSnapし、必要に応じて `normalOffsetMm` を適用する。

### Orientation

`orientationMode`は接続点からパーツ本体へ伸びる`bodyDirectionDeg`を定義する。Node側Connection Pointの外向き方向は、その反対方向へ合わせる。

Path接線角を`tangentDeg`とする。

```ts
normalSide = normalOffsetMm < 0 ? -1 : 1;
```

- `world_down`: bodyDirectionDeg = 90°
- `path_tangent`: bodyDirectionDeg = tangentDeg
- `path_normal`: bodyDirectionDeg = normalizeDeg(tangentDeg + 90° * normalSide)
- `keep_rotation`: 現在rotation維持

keep_rotation以外:

```ts
targetPointDirectionDeg = normalizeDeg(bodyDirectionDeg + 180);

node.rotationDeg =
  normalizeDeg(
    targetPointDirectionDeg
    - point.directionDeg
    + rotationOffsetDeg
  );
```

これにより`world_down`では上部Connection Pointが上向きになり、チャーム本体が下へ垂れる。

Path形状変更後も、

- startは新しい始点へ追従
- endは新しい終点へ追従
- positionは同じdistanceMmへ追従

する。


---

## 10. Compatibility Engine

## 10.1 原則

返却:

```ts
interface CompatibilityResult {
  status: "compatible" | "incompatible" | "unknown";
  reasons: string[];
}
```

Unknownはエラーではない。

---

## 10.2 Through判定

### Wire

```ts
if holeDiameter == null || wireDiameter == null:
  unknown
else if holeDiameter >= wireDiameter + clearance:
  compatible
else:
  incompatible
```

初期clearance:

```text
0.05mm
```

設定で変更可能にする。

### Pin

同様に `pinDiameterMm` を使用。

---

## 10.3 Point判定

まずConnectionPoint Type Matrixを判定する。MatrixはDomain設定として一元管理し、UIへ直書きしない。

MVP初期値の例:

| A | B | Result |
|---|---|---|
| loop | ring | allowed |
| ring | ring | allowed |
| hook | loop | allowed |
| pin_end | hole | disallowed as point |
| chain_end | clasp | allowed |

Matrixに存在しない組み合わせは `Unknown` とする。未登録ペアを自動でAllowedまたはIncompatibleにはしない。

その後、寸法が揃っている場合だけ追加判定する。

---

## 10.4 Path Attachment判定

### start / end Anchor

1. Node ConnectionPoint Type
2. PartPathSpecの startPortType / endPortType
3. MaxConnections
4. 登録済み寸法属性

の順で判定する。

Port Typeまたは寸法が不足する場合はUnknownとする。

### position Anchor

例: JumpRing → Chain Path。

取得できる場合は以下を比較する。

- ring.innerDiameter
- chain link envelope / thickness
- openingWidth

不足時はUnknown。

### 判定優先順位

- Type Matrixで明確に禁止 → Incompatible
- Type許可かつ必要寸法が揃い寸法NG → Incompatible
- Type許可かつ必要寸法が揃い寸法OK → Compatible
- 判断に必要な情報不足 → Unknown


---

## 10.5 UI

- Compatible: 通常表示
- Unknown: 灰色/黄色の補助表示
- Incompatible: 赤 + 理由

MVPではIncompatibleな組み合わせも「自由配置」は可能とするが、Attachmentとしての接続確定は禁止する。

`force=true` 等による強制接続はMVPでは実装しない。

---

## 11. Node Geometry / Orientation

## 11.1 座標系

- X右向き
- Y下向き
- rotationDeg時計回り
- normalizeDeg(0..360)

## 11.2 Connection Point

Connection Point world positionはNode中心・実寸・回転から算出する。

world direction:

```ts
worldDirectionDeg =
  normalizeDeg(
    node.rotationDeg
    + point.directionDeg
  );
```

## 11.3 Point Attachment orientation

`align_opposite`では、移動側Node BのConnection Point方向がNode A側と180°反対になるよう回転する。

```ts
targetPointDirection =
  normalizeDeg(
    hostPointWorldDirectionDeg + 180
  );

nodeB.rotationDeg =
  normalizeDeg(
    targetPointDirection
    - pointB.directionDeg
    + relativeRotationDeg
  );
```

その後Connection Point world position同士が一致するようNode Bを平行移動する。

`keep_rotation`: 回転維持で位置のみSnap。

`manual`: 初期はkeep_rotationとし、接続後ユーザー確定角をrelativeRotationDegとして保存。

## 11.4 Through Hole

Through Hole world axis:

```ts
holeWorldAxisDeg =
  normalizeDeg(
    node.rotationDeg
    + throughHole.axisDeg
  );
```

entry / exitもNode回転後のworld座標へ変換する。


---

## 12. Editor State

```ts
interface EditorState {
  designId: string | null;

  nodes: Record<string, DesignNode>;
  paths: Record<string, DesignPath>;

  pointAttachments: Record<string, PointAttachment>;
  throughAttachments: Record<string, ThroughAttachment>;
  pathAttachments: Record<string, PathAttachment>;
  mirrorLinks: Record<string, MirrorLink>;

  selectedNodeIds: string[];
  selectedPathIds: string[];

  zoom: number;
  viewportX: number;
  viewportY: number;

  snapEnabled: boolean;
  symmetryMode: "linked" | "independent";

  history: HistoryState;

  dirty: boolean;
  saveState:
    | "saved"
    | "saving"
    | "dirty"
    | "error"
    | "conflict";
}
```

---

## 13. Command / Undo / Redo

対象:

- AddNode
- RemoveNode
- MoveNode
- RotateNode
- AddPath
- EditPath
- RemovePath
- AddPointAttachment
- RemovePointAttachment
- AddThroughAttachment
- MoveThroughAttachment
- RemoveThroughAttachment
- AddPathAttachment
- MovePathAttachment
- RemovePathAttachment
- ToggleMirror
- MirrorComposite
- ChangePhysicalLength
- ChangeZIndex

Drag中はPreview Stateのみ更新。

PointerUp時に1 Commandとして履歴へ追加する。

最大履歴:

- 100 Commands

保存時にHistoryをDBへ保存しない。

---

## 14. Node移動と接続グラフ

## 14.1 Point Attachment Graph

Point Attachmentは無向グラフ。parentNodeIdによる移動制御は使用しない。

## 14.2 Connected Component拘束判定

選択Nodeを含むPoint Connected ComponentについてPath/Through拘束を数える。

- 拘束0: Component全体を自由移動
- `position` Path AttachmentまたはThrough Attachmentが1拘束: Pointer位置を対象Pathへ投影し、拘束distanceMmを更新。Anchor Nodeの旧Pose→新Poseを求め、平行移動と回転の差分をComponent全体へ剛体変換として適用
- `start/end` Path Anchorを含む: 通常Drag禁止。DetachまたはPath Moveを要求
- 2個以上のPath/Through拘束: 通常Drag禁止。拘束解除またはPath編集を要求

同一Path上の複数拘束もMVPでは自由Component Dragを禁止する。

## 14.3 Anchor Pose Propagation

Path Attachment / Through Attachmentから導出されるAnchor NodeのPoseが変化した場合、Point Connected Component全体へ同じ剛体変換を伝播する。

```ts
deltaRotationDeg =
  normalizeSignedDeg(
    newRotationDeg - oldRotationDeg
  );
```

Component各Nodeについて、旧Anchor位置をpivotに`deltaRotationDeg`回転した後、新Anchor位置へ平行移動する。

Path上Drag、Path形状編集、Path Moveのいずれでも同じPose Propagationを使用する。

これによりPath上の丸カンが曲線に沿って回転した場合も、Point接続されたチャーム等が外れず追従する。

## 14.4 部分移動

Component内の一部だけを動かす場合は先に対象Point AttachmentをDetachする。Drag距離による暗黙Detachは禁止。DetachはUndo可能。

## 14.5 回転

- Free Node: Node単体回転
- 拘束0のPoint Connected Component: 選択Node中心をpivotとしてComponent全体を剛体回転し、全Node rotationへ同じdeltaDegを加える
- Component内1パーツのみ回転: Detach後に行う
- Path Attachment Node: 回転UIは`rotationOffsetDeg`変更として処理
- Through Node: 自由回転禁止。`flip180`のみ変更
- Path/Through拘束を持つPoint Component: 自由回転禁止。拘束をDetachしてから行う

## 14.6 Path Move

Pathのstart/endへ同じΔを加える。Through/Path従属Nodeはdistance/anchorを保持して自動追従する。start/endにPoint接続された外部Componentも同じΔで移動する。

---

## 15. ピアスMirror

## 15.1 Mirror Group

Mirror Linkedは、左右の構造を継続同期する。

`design_mirror_links` に以下のEntity対応を保存する。

- Node
- Path
- PointAttachment
- ThroughAttachment
- PathAttachment

## 15.2 初回生成

基準側の構造をdeep cloneし、全Entityの旧ID→新ID Mapを作る。

Clone完了後、各EntityについてMirrorLinkを作成する。

## 15.3 双方向同期

ユーザーが左右どちらを編集しても、MirrorLinkから対応Entityを取得し、Mirror変換したCommandを生成する。

対象Command:

- AddNode / RemoveNode
- MoveNode / RotateNode / ChangePart
- AddPath / EditPath / RemovePath
- Add / Remove / Move PointAttachment
- Add / Remove / Move ThroughAttachment
- Add / Remove / Move PathAttachment
- ChangeZIndex

左右反映は以下のComposite CommandとしてHistoryへ1件だけ積む。

```ts
interface CompositeCommand {
  primary: EditorCommand;
  mirrored: EditorCommand[];
}
```

Undo / RedoもComposite単位。

## 15.4 座標・回転変換

座標系: X右、Y下、時計回りdeg。Mirror軸はaxisX。

Node中心と左右の傾き:

```ts
mirrorX = 2 * axisX - source.xMm;
mirrorY = source.yMm;
mirrorRotationDeg = normalizeDeg(360 - source.rotationDeg);
```

Pathはstart/end Xを同式でMirrorしYを維持する。bendSideは上下を表すため変更しない。

### mirror_image

画像を水平反転し、Geometry AdapterもローカルGeometryを反転する。これにより真の幾何学的Mirrorを作る。

```ts
xNorm2 = 1 - xNorm;
yNorm2 = yNorm;
directionDeg2 = normalizeDeg(180 - directionDeg);

entryX2 = 1 - entryX;
exitX2 = 1 - exitX;
entryY2 = entryY;
exitY2 = exitY;
axisDeg2 = normalizeDeg(180 - axisDeg);
```

### keep_orientation

画像とローカルGeometryは反転しない。Node中心とrotationのみ左右対応させるため、非対称パーツは厳密な鏡像ではなく「同じ実物パーツを左右で反対に傾けた表示」になる。

### manual

Mirror生成時に`mirror_image`または`keep_orientation`を選び、MirrorLink.manualMirrorPolicyへ保存する。Partマスタ自体は変更しない。

## 15.5 画像方向

Part.mirrorPolicy:

- keep_orientation: 画像反転なし
- mirror_image: renderer上でhorizontal mirror
- manual: Mirror生成時に選択しMirrorLinkへ保存

## 15.6 Independent切替

Linked → Independent:

1. 現在の左右状態を保持
2. 対象MirrorLinkを削除
3. 以降同期しない

Independent → Linked:

自動マージは禁止。

ユーザーに以下を選択させる。

- 左を基準に右を再生成
- 右を基準に左を再生成

反対側の旧Entityを削除して再Cloneし、新しいMirrorLinkを作成する。


---

## 16. 購入量計算

## 16.1 使用量

### Piece Part

```text
usageCount = Node数
```

### Path Part

```text
usageLengthMm =
  sum(physicalLengthMm)
```

---

## 16.2 購入量

### piece

```ts
purchaseUnits =
  max(minimumUnits, usageCount);
```

### pack

```ts
purchaseUnits =
  max(
    minimumUnits,
    ceil(usageCount / packQuantity)
  );
```

### length

```ts
purchaseUnits =
  max(
    minimumUnits,
    ceil(usageLengthMm / saleLengthMm)
  );
```

### 金額

unitPriceが既知の場合のみ金額を計算する。

```ts
purchasePrice =
  unitPrice == null
    ? null
    : purchaseUnits * unitPrice;
```

BOM総額は既知価格だけを加算し、同時に`unknownPriceItemCount`を表示する。価格不明商品を0円として合計しない。

---

## 16.3 表示例

```text
丸カン
使用: 3個
商品: 20個入り
購入: 1袋
参考価格: 220円

チェーン
使用: 420mm
商品: 1m単位
購入: 1単位
参考価格: 880円
```

---

## 17. 重量計算

重量は定義単位を明示する。

### Piece

`weight_basis = per_piece`

```text
usageWeight = nodeCount * weightG
```

### Path

`weight_basis = per_sale_length` の場合のみ計算する。

```ts
usageWeight =
  weightG
  * usageLengthMm
  / weightBasisLengthMm;
```

Path重量の基準長が不明な場合は合計対象外。

結果:

```ts
interface WeightSummary {
  knownWeightG: number;
  unknownItemCount: number;
  complete: boolean;
}
```

一部不明の場合はUIで「既知分のみ」と表示する。


---

## 18. 貴和製作所 URL Import Assistant

## 18.1 実装

ClientからURLを受け、Next.js Server Route / Server Action経由で取得する。ブラウザから対象サイトへ直接Fetchしない。

Parser優先順位:
1. JSON-LD Product
2. Open Graph / meta
3. 意味ラベルからHTML解析
4. 未取得項目はNULL

固定CSS selectorだけへ依存しない。

## 18.2 Candidate

CandidateはsourceUrl / fetchedAt / name / sku / unitPrice / packageText / dimensionsText / imageUrls / categoryHints / rawFields / statusを持つ。

価格・入数・寸法は保存前にユーザー確認必須。

## 18.3 画像

画像URLは候補表示のみ。ユーザーが選択した場合だけサーバーで取得しPrivate StorageへImmutable Assetとして保存。失敗時はローカルUploadへフォールバック。

## 18.4 再取得

新Snapshotを作り現在Partとの差分を表示。ユーザー未承認ではPartを変更しない。参照済みPartへ適用する場合はPart Successorを作成。

## 18.5 失敗

HTTP失敗 / HTML変更 / field不足 / 画像失敗は正常系。Import失敗で手動登録をブロックしない。

---

## 19. パーツ登録画面

### Step 1: Basic

- name
- sku
- source
- url
- category
- material
- color

### Step 2: Image

- upload
- crop
- mask
- perspective
- rotate

### Step 3: Calibration

- 2点指定
- known mm
- width/height確認

### Step 4: Physical Properties

Node Part:
- width
- height
- depth
- weight
- hole diameter
- inner diameter等

Path Part:
- nominal diameter
- segment physical length
- weight basis
- wire diameter等

カテゴリからgeometryKindを初期推定するが保存前にValidationする。Path Partへダミーwidth/heightを要求しない。

### Step 5: Connection / Path Annotation

- Connection Point追加
- Through Hole追加
- Path対応Partの場合はPath Render Spec設定
  - render mode
  - diameter / color / opacity
- `segment_texture`の場合:
  1. 元商品画像上で繰り返しに使う短区間を矩形選択
  2. 区間の始点・終点を指定
  3. その区間の実物長mmを入力
  4. 透過segment assetを生成
  5. U字サンプルPathへ自動反復して継ぎ目Preview
  6. overlapを調整して保存

### Step 6: Purchase

- piece / pack / length
- quantity / length
- price
- weight basis / weight basis length

### Step 7: Save

Validation後、Part本体と従属定義を単一DB Transactionで保存する。

新規画像ファイルがある場合は先に一時Uploadし、DB確定失敗時はCleanup対象とする。

---

## 20. パーツ検索

検索:

- name
- sku
- source
- category
- material
- color
- tag

Filter:

- category
- material
- color
- size range
- price
- source
- favorite
- recent

検索結果カードはThumbnailのみ使用する。

- `favorite` は `part_user_state.favorite`。後継Part作成時は旧Partのfavoriteを引き継ぐ
- `recent` は `part_user_state.last_used_at`
- `tag` は `parts.tags`
- Archive Partは既存Designの復元時のみ取得し、通常検索から除外する。

---

## 21. PC操作

| 操作 | 動作 |
|---|---|
| Click | Node/Path選択 |
| Shift+Click | 複数選択 |
| Drag Node | 移動 |
| Drag Through Node along Path | Path上移動 |
| Drag Path Handle | Path形状変更 |
| Wheel | Zoom |
| Space+Drag | Pan |
| Delete | 削除 |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+S | Save |
| Esc | 選択解除 |

---

## 22. iPhone操作

| 操作 | 動作 |
|---|---|
| Tap | 選択 |
| Drag | 選択Node移動 |
| Drag bead on path | Path上位置変更 |
| Pinch | Zoom |
| Two-finger drag | Pan |
| + | パーツ追加 |
| Bottom Sheet | 回転/削除/接続/順番 |
| Undo | Undo |
| Redo | Redo |

Path control handleは通常非表示。

Path選択後に「形状編集」を押した場合のみ表示する。

---

## 23. Renderer

Layer:

```text
0   Background
10  Path shadow
20  Paths
30  Base nodes
40  Attached nodes
50  Node shadows/highlights
80  Compatibility hints
90  Selection
100 Connection points / through holes
110 Snap previews
120 Path handles
```

---

## 24. リアル2.5D

MVPの品質基準は「正面または準正面のアクセサリーデザインを、商品写真と実寸比を使って購入前検討に十分なリアルさで確認できること」とする。任意視点の完全3D再現は対象外。

### Node

元商品画像を優先する。

追加エフェクトは控えめ。

- small shadow
- optional highlight
- z-order

### Chain

Pathに沿ってSegmentを配置。

### Wire/String

実寸線径をzoom換算して描画。

### Beads on Path

穴軸をPath tangentへ合わせる。

透明ビーズ等の屈折は画像自体で表現し、リアルタイムray tracingは行わない。

---

## 25. Save / Load

## 25.1 Atomic Save RPC

Design Aggregateの保存は**必ずPostgreSQL Function / RPCによる単一Transaction**で実行する。

クライアントから複数テーブルへ個別保存する実装は禁止する。

Payloadは当該Designの**完全スナップショット**とする。RPCはPayloadに存在しない既存Node / Path / Attachment / MirrorLinkを削除対象として差分計算する。クライアントから個別の「削除忘れ」が発生しない方式に固定する。

例:

```text
save_design_aggregate(
  design_id,
  expected_revision,
  payload,
  force_overwrite
)
```

Transaction内処理:

```text
BEGIN
  1. auth.uid()によるDesign owner確認
  2. 現在RevisionをFOR UPDATE相当で取得・Lock
  3. expectedRevision比較
  4. Design更新
  5. Nodes Upsert/Delete
  6. Paths Upsert/Delete
  7. Point Attachments Upsert/Delete
  8. Through Attachments Upsert/Delete
  9. Path Attachments Upsert/Delete
 10. Mirror Links Upsert/Delete
 11. 全FK / Domain制約検証
 12. revision = revision + 1
COMMIT
```

どこか1工程でも失敗した場合:

```text
ROLLBACK
```

部分保存状態を許可しない。

RPCは固定search_pathを使用し、ユーザー入力からSQL文字列を組み立てない。

## 25.2 Optimistic Lock

通常保存:

```text
currentRevision == expectedRevision
```

不一致ならDB変更を行わずConflictを返す。

Conflict UI:

- 最新版を読み込む
- この端末の内容で上書き

### Force Overwrite

「この端末の内容で上書き」は明示ユーザー操作のみ。

RPCへ `force_overwrite=true` を渡し、所有者確認後に最新Revisionへ対してAtomic Saveする。

自動Force Overwriteは禁止。

## 25.3 Auto Save

1500ms debounce。

以下の操作中は保存しない。

- Node Drag
- Pinch
- Path Preview edit
- Mirror Composite Command途中
- Image asset load中
- Length Constraint Solver実行中

Solver / Composite Command完了後にdirtyを確定する。

## 25.4 Local Recovery

IndexedDBへ `EditorSnapshot` をdirty時にdebounce保存する。

Snapshot:

- Design
- Nodes
- Paths
- 3 Attachment種
- Mirror Links
- expectedRevision
- savedAt

用途:

- 保存通信失敗
- Safari再読込
- App終了

クラウド保存成功後は、同Revision以下のRecoveryを削除する。

起動時にRecoveryがクラウドより新しい場合のみ復旧候補を表示する。


---

## 26. PWA

MVP:

- manifest
- icons
- standalone
- app shell cache
- installable UI

MVPでは「完全オフライン編集」を要件にしない。

ネット切断時:

- 現在開いている画面は可能な範囲で維持
- 保存不可表示
- Local Recoveryへ退避
- 再接続後に保存

---

## 27. PNG Export

外部画像を直接使用しないためCanvas taintを回避する。

Option:

- transparent
- white background
- dimension guide
- BOM summary

高品質Export:

1. High画像load
2. Export専用Stageへ描画
3. pixelRatioを上げる
4. PNG生成
5. 一時Stage破棄

目標:

- long side 2048px以上
- high option 4096px相当

---

## 28. API / Repository Interface

```ts
interface ImportedPartCandidate {
  sourceUrl: string;
  fetchedAt: string;
  name?: string;
  sku?: string;
  unitPrice?: number;
  currency?: string;
  packageText?: string;
  dimensionsText?: string;
  imageUrls: string[];
  categoryHints: string[];
  rawFields: Record<string, unknown>;
  status: "success" | "partial" | "failed";
}

interface PartImportService {
  fetchKiwaCandidate(
    sourceUrl: string
  ): Promise<ImportedPartCandidate>;

  refreshKiwaCandidate(
    partId: string
  ): Promise<ImportedPartCandidate>;
}

interface PartRepository {
  list(filter: PartFilter): Promise<Part[]>;
  get(id: string): Promise<Part>;
  create(input: CreatePartInput): Promise<Part>;
  updateOrCreateSuccessor(
    id: string,
    input: UpdatePartInput
  ): Promise<Part>;
  archive(id: string): Promise<void>;
  removeIfUnreferenced(id: string): Promise<void>;
}

interface SaveResult {
  revision: number;
  savedAt: string;
}

interface DesignRepository {
  get(id: string): Promise<DesignAggregate>;
  create(input: CreateDesignInput): Promise<DesignAggregate>;
  save(
    aggregate: DesignAggregate,
    expectedRevision: number
  ): Promise<SaveResult>;
  list(): Promise<DesignSummary[]>;
  remove(id: string): Promise<void>;
}
```

`DesignAggregate`:

```ts
interface DesignAggregate {
  design: Design;
  nodes: DesignNode[];
  paths: DesignPath[];
  pointAttachments: PointAttachment[];
  throughAttachments: ThroughAttachment[];
  pathAttachments: PathAttachment[];
  mirrorLinks: MirrorLink[];
}
```

---

## 29. Validation

### ImageAsset

- assetKindはpart_main / path_segment
- contentHash必須
- Storage PathはAsset IDごとに一意
- 参照中Assetの上書き・削除禁止

### ImportedPartCandidate

- URLはhttpsかつkiwaseisakujo.jp系のみ許可
- HTML fetch timeout初期値: 10秒
- HTML最大受信サイズ初期値: 5MB
- redirect後も許可ドメインを再検証
- 商品画像取得はhttpsのみ。redirect/DNS解決後にprivate/loopback/link-local IPを拒否
- 画像Content-Typeをimage/*へ限定し、最大20MBを初期値とする
- Candidateは直接Partへ保存せずユーザー確認必須
- fetchedAt必須
- success / partial / failedを正常に扱う

### Part

- DB `geometry_kind` とDomain `geometryKind`を1:1で対応
- geometryKind=node → widthMm > 0 かつ heightMm > 0
- geometryKind=path → widthMm / heightMmはNULL可
- geometryKind=path → PathRenderSpec必須
- imageAsset必須
- category必須
- tagsは重複除去
- archived Partは通常検索対象外
- physical numeric >= 0
- xNorm/yNorm 0..1
- ThroughHole entry/exit 0..1

### PurchaseSpec

- pack → packQuantity > 0
- length → saleLengthMm > 0
- minimumUnits >= 1
- price >= 0
- weightBasis=per_sale_length → weightBasisLengthMm > 0

### PartPathSpec

- segment_texture → segmentAssetId必須
- segment_texture → segmentPhysicalLengthMm > 0
- stroke_texture → segmentAssetId必須
- stroke_texture → nominalDiameterMm > 0
- solid_stroke → nominalDiameterMm > 0
- opacity: 0..1
- startMaxConnections >= 0
- endMaxConnections >= 0
- startMaxConnections > 0 → startPortType必須
- endMaxConnections > 0 → endPortType必須
- PortTypeがNULL → 対応するMaxConnectionsは0

### DesignPath

- shapeはu / v / straight
- physicalLengthMm > 0
- start/end座標はfinite
- endpointDistance <= physicalLengthMm
- u/v → bendSideは+1または-1
- u → sagがSolverで算出可能
- v → vertexOffsetがSolverで算出可能
- straight → endpointDistanceとphysicalLengthMmが許容誤差内
- Save時のarc length error <= max(0.5mm, physicalLengthMm * 0.005)
- Constraint未収束Pathは保存不可

### Attachment

Point:
- node/point存在
- maxConnection超過禁止
- orientationModeはalign_opposite / keep_rotation / manual
- relativeRotationDegはfinite

Through:
- node/hole/path存在
- distance 0..physicalLength
- flip180はboolean
- duplicate attachment禁止
- 占有intervalがPath範囲内
- 隣接intervalがallowedOverlapを超えて重ならない

Path Attachment:
- node/point/path存在
- orientationModeはworld_down / path_normal / path_tangent / keep_rotation
- rotationOffsetDegはfinite
- anchorKindはstart/end/position
- position → distance必須かつ 0..physicalLength
- start/end → distanceはNULL
- start/end connection countがPathSpec上限以内

---

## 30. Error Handling

### Image

- load failure → placeholder + retry
- high failure → medium fallback
- normalized image missing → edit禁止 / registration修正へ誘導

### Save

- error → dirty維持
- local recovery保存
- retry

### Conflict

- saveState=conflict
- explicit user selection

### Compatibility

- unknown → warningのみ
- incompatible → Attachment確定を止める

### Broken data

ロード時に参照切れを検出し、問題Entityを隔離してデザイン全体の読込失敗を避ける。

---

## 31. テスト

## 31.1 Unit

必須:

- world/screen transform
- rotation
- connection point world coordinate
- ThroughHole world coordinate
- Bezier point/tangent
- arc length
- distanceMm -> path position
- point snap
- Point align_opposite rotation
- Point keep_rotation
- Connected Component move
- Detach then partial move
- Through placement
- Through flip180 orientation
- Through occupancy / overflow
- Path attachment
- Path Anchor port compatibility
- start/end Path Anchor
- Length Constraint U/V/Straight
- impossible endpoint Clamp
- ChangePhysicalLength rejects attachment overflow
- PathAttachment world_down / path_normal / path_tangent
- Mirror coordinate / rotation transformation
- Mirror ConnectionPoint / ThroughHole transformation
- Mirror composite synchronization
- Compatibility
- Purchase calculation
- mirror logic
- undo/redo
- weight summary

---

## 31.2 Integration

- Kiwa URL import success / partial / failure fallback
- Kiwa refresh diff does not auto-overwrite Part
- Part登録→正規化→Editor追加
- Part保存失敗時にDB部分行が残らない
- 新画像DB保存失敗時に孤児Asset Cleanup対象となる
- 参照中Image Assetが上書きされない
- Path作成→ビーズ10個配置→保存→再読込
- Chain Path→中央にCharm接続→Path変形→追従
- Point Attachment chain
- Earrings Mirror deep clone
- pack quantity calculation
- length quantity calculation
- revision conflict
- Atomic Save rollback
- Part successor clones dependent specs and preserves old Design
- Mirror Linked bilateral edits
- local recovery

---

## 31.3 E2E Part Import

1. 貴和製作所の商品URLを入力
2. name / sku / price / image候補を確認
3. Candidateを修正
4. 画像をPrivate StorageへImport
5. Part保存
6. 同URLを再取得
7. 差分を表示
8. ユーザー未承認では既存Partが変わらないことを確認

---

## 31.4 E2E Necklace A: Beads

1. 新規Necklace
2. Wireを追加
3. length=450mm
4. 8mm beadを追加
5. 20個連続配置
6. Path長を超える追加が拒否されることを確認
7. 順番変更
8. Clasp追加
9. Compatibility確認
10. Save
11. Reload
12. BOM確認
13. PNG Export

---

## 31.5 E2E Necklace B: Chain

1. Chain追加
2. 400mm
3. U preset
4. startへClasp接続
5. endへAdjuster接続
6. Path中央へJump Ring追加
7. Charm接続
8. Path形状変更
9. start/end/中央Attachmentが追従
10. Save / Reload

---

## 31.6 E2E Earrings

1. Hook
2. Eye Pin
3. BeadをPinへThrough
4. Jump Ring
5. Charm
6. Mirror Linked
7. 右側生成
8. iPhone viewportへ変更
9. 編集
10. Save / Reload

---

## 31.7 実機

最低:

- Windows 11 + Chrome
- Windows 11 + Edge
- iPhone + Safari

可能なら小画面iPhone相当も確認する。

---

## 32. Performance Test

対象:

- 20 Nodes
- 50 Nodes
- 100 Nodes
- 200 Nodes
- Through bead 100連
- Chain segment 200描画単位

測定:

- drag FPS
- path edit FPS
- pinch FPS
- load
- save
- export
- memory

基準:

- 一般編集60fps目標
- 負荷時に継続30fps未満とならない
- Drag入力の体感遅延100ms未満

---

## 33. 開発フェーズ

### Phase 0: Foundation

- Next.js
- TypeScript
- Tailwind
- Zustand
- Supabase
- Auth
- PWA shell
- Test setup

### Phase 1: Domain / DB

- parts
- purchase specs
- image assets
- path specs
- part user state
- connection points
- through holes
- designs
- nodes
- paths
- 3 attachment tables
- mirror links
- Part archive/successor rules
- TypeScript domain

### Phase 2: Part Registration / Import

- Kiwa URL Import Assistant
- source snapshot / diff
- basic info
- image upload
- crop
- manual alpha mask
- perspective correction
- calibration
- point/hole annotation
- chain segment asset
- purchase spec
- tags/notes/user state

### Phase 3: Editor Core

- Stage
- mm coordinate
- node render
- select
- drag
- rotate
- zoom
- pan
- layers
- high/medium image switching

### Phase 4: Path Engine

- Bezier
- arc length table
- presets
- wire/string render
- chain segment render
- path editor
- start/end anchors
- length constraint solver

### Phase 5: Attachments

- Point orientation
- Connected Component move / Detach
- Point
- Through
- Path
- snapping
- group following
- path following

### Phase 6: Compatibility / BOM

- type matrix
- dimension rules
- Unknown handling
- piece/pack/length calculation
- weight summary

### Phase 7: Necklace

- bead necklace E2E
- chain necklace E2E
- clasp endpoints
- BOM

### Phase 8: Earrings

- pin carrier
- through bead
- point chain
- Mirror Linked

### Phase 9: Persistence / Mobile

- Atomic Save RPC
- optimistic revision
- auto-save
- IndexedDB recovery
- iPhone gestures
- Bottom Sheet

### Phase 10: Export / Hardening

- PNG
- performance
- real device
- defect fixes

---

## 34. 実装優先順位

P0 / P1はいずれもMVP必須。P0は先行ブロッカー、P1はP0成立後に実装するMVP機能。P2のみMVP後。

### P0

- Domain types
- DB
- Part registration
- Kiwa URL Import Assistant
- Image normalization
- mm coordinates
- Node render
- constrained Path Shape Engine
- Length Constraint
- Path start/end Anchor
- Point Attachment
- Through Attachment
- Path Attachment
- Atomic Save / Load
- Part successor protection
- Necklace
- Earrings
- iPhone basic operation

### P1

- Undo / Redo
- Compatibility
- Purchase/BOM
- Mirror
- Auto Save
- PNG
- Local Recovery

### P2

- advanced background removal
- richer material effect
- URL metadata helper
- full offline
- 3D preview

---

## 35. 最初の実装タスク

1. Next.js + TypeScript
2. Test runner
3. Supabase
4. DB migration v1.4
5. Domain TypeScript
6. Atomic Save RPC skeleton
7. Kiwa Import Service skeleton
8. Geometry Unit Tests
9. Point orientation Unit Tests
10. Connected Component / Detach Unit Tests
11. Path Shape / Length Constraint Unit Tests
12. Path Attachment orientation Unit Tests
13. Mirror transform Unit Tests
14. Purchase Unit Tests
15. Part registration basic form
16. Kiwa URL Import Candidate UI
17. Import refresh/diff UI
18. Image upload/storage
19. Crop/Mask/Perspective
20. Calibration
21. Connection/Hole annotation
22. Chain segment asset creation
23. Part successor/archive behavior
24. Editor Stage
25. mm coordinate transform
26. Node render
27. Zoom/Pan
28. constrained Path render
29. Point snap + align_opposite
30. Connected Component move / Detach
31. Through bead placement + occupancy validation
32. Path start/end/position attachment + orientation
33. Design Atomic Save/Load
34. Bead necklace E2E
35. Chain necklace E2E
36. Earrings + Mirror Linked E2E
37. iPhone gestures
38. Compatibility
39. BOM / Weight
40. Undo/Redo
41. PNG
42. Auto Save/Recovery
43. Performance test
44. Real-device test


---

## 36. 実装完了受入基準

### A. Part登録 / Import

- 貴和商品URLからCandidateを取得できる
- Import partial / failedでも手動登録へ継続できる
- 再取得差分がユーザー承認前にPartを変更しない
- 画像を自前Storageへ保存
- Crop可能
- 背景透明化可能
- Perspective補正可能
- 実寸キャリブレーション可能
- Point/Hole登録可能
- purchase spec登録可能
- segment_texture用の短区間画像を元商品画像から生成できる
- Favorite / Recent / Tags / Notesが保存・検索に反映される

### B. Bead Necklace

- Wire/String Pathを作れる
- Pathへ10個以上のビーズを通せる
- Path端からのはみ出し / 不正重複 / 長さ不足を検出できる
- 順序変更できる
- 実寸比が維持される
- 穴径/線径判定が動く
- 保存後に同じ順序で復元

### C. Chain Necklace

- Path Shapeがu / v / straightに限定され、shallow UはUのPresetとして扱われる
- Chain PathがU/V等で描画される
- start / end / positionの各AnchorへPart接続
- start/endのPort Type / MaxConnections判定が動く
- Path変形後も接続位置が追従
- Path操作確定後の長さ誤差が0.5%以内
- endpointDistanceが物理長を超える編集はClampされる

### D. Connection / Earrings

- Point align_oppositeで接続方向が自動整列
- Point接続済みComponentが通常Dragで一体移動
- Path拘束1個のComponentはPath上を追従移動
- Anchor回転差がPoint Component全体へ伝播
- start/end拘束または複数Path拘束Componentは不正な自由移動を拒否
- Detach後のみ部分移動
- Point Component回転は剛体回転し、Path拘束中は拒否
- Path Attachment orientationModeが反映
- Through flip180が反映
- PointとThroughを組み合わせられる
- Mirror Linkedで構造全体を複製
- Linked中の左右どちらからの編集も反対側へ同期
- Mirror操作が1回のUndo/Redoで左右同時に戻る
- Independent切替で同期が解除される
- mirrorPolicyが反映される
- Mirror後のConnection Point / Through Hole位置と方向が正しい

### E. BOM

- piece
- pack
- length

の3方式で購入量と金額が正しい。価格不明商品は0円扱いせず、既知価格合計と不明件数を分けて表示する。

### F. Realism

- 元商品画像を編集画面から使用
- 相対実寸誤差±3%以内
- Chain/cordがPath形状へ追従
- 高倍率時にHigh assetへ切替

### G. PC/iPhone

- PCで作成したDesignをiPhoneで編集
- iPhone保存後PCで再読込
- Pointer/Touch双方で主要操作可能

### H. Reliability

- 100回Undo/Redoで破綻しない
- 保存失敗時に編集内容を維持
- Revision conflictが検出される
- Save途中失敗時に全変更がRollbackされる
- Reload後Attachment / Mirror Link参照が壊れない
- 参照済みPartを更新しても既存Designの見た目・寸法が変わらない
- 旧Image Assetが上書きされず既存Designの画像が変化しない
- Part後継作成途中の失敗で従属定義の部分保存が発生しない

---

## 37. 実装上の禁止事項

- DBへpx座標を正データとして保存しない
- ビーズを単なるPoint Attachmentだけで表現しない
- チェーンを静的U字画像だけで表現しない
- MVPで自由Bezier / Polyline編集を実装しない
- shallow Uを独立Path ShapeとしてDB保存しない
- Path Partへダミーwidth/heightを要求しない
- Path Attachmentをt値だけで永続化しない
- Path start/endを暗黙のdistance=0/Lだけで表現しない
- Mirror対応をNode等へ重複保持しない
- Point接続の回転を実装者任せにしない
- Point接続済みNodeを暗黙Detachさせない
- Path拘束Componentを拘束無視で自由移動・自由回転させない
- Path形状編集でphysicalLengthMmを暗黙変更しない
- 外部商品画像URLをCanvasへ直接読み込まない
- Import Candidateをユーザー確認なしでPartへ自動反映しない
- Unknown compatibilityをCompatibleとして扱わない
- pack商品をNode数×商品価格で計算しない
- length商品をpiece扱いしない
- 価格不明商品を0円としてBOM総額へ加算しない
- React ComponentへGeometry/Compatibilityロジックを埋め込まない
- Design Aggregateを複数の独立DB保存リクエストで更新しない
- 参照中Partを破壊的更新またはHard Deleteしない
- Part後継作成時にConnection/Through/Path/Purchase定義のコピーを省略しない
- 参照中Image AssetのStorage objectを上書きしない
- Undo履歴をpointermoveごとに作らない
- iPhone UIをPCの単純縮小にしない
- 完全3DをMVPへ混ぜない

---

## 38. Definition of Done

この詳細設計におけるMVP完成とは、以下を1つのアプリ内で実現した状態とする。

1. 実在パーツ画像を登録・正規化できる
2. 実寸情報を保持できる
3. チェーン/ワイヤー/コードを制約付きPath Shapeとして扱える
4. ビーズをPathへ実際の構造に近い形で通し、占有長とPath範囲を検証できる
5. Pathの始点・終点・任意位置へパーツを接続できる
6. Pathの物理長をLength Constraintで維持できる
7. Point接続の向き・拘束を考慮した一体移動/回転・Detachが定義どおり動く
8. Mirror Linkedが継続同期する
9. 寸法互換性を3値判定できる
10. 使用量から購入単位を算出できる
11. PC/iPhone双方で編集できる
12. Atomic Saveで部分保存を防止できる
13. Part / Image Asset更新後も既存Designを不変に保てる
14. 保存・再読込後も全構造を復元できる
15. 貴和商品URLから候補取込・差分確認・手動フォールバックができる
16. 編集画面そのものが実物画像ベースのリアル2.5Dである

上記を満たした時点で、ネックレス・ピアスのMVP実装は完了と判定する。
