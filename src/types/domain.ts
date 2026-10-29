export type PartCategory =
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

export type SaleMode = "piece" | "pack" | "length";

export type MirrorPolicy =
  | "keep_orientation"
  | "mirror_image"
  | "manual";

export type CompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "unknown";

export type PathRenderMode =
  | "segment_texture"
  | "stroke_texture"
  | "solid_stroke";

export interface PathRenderSpec {
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

export interface PurchaseSpec {
  saleMode: SaleMode;
  packQuantity?: number;
  saleLengthMm?: number;
  minimumUnits: number;
  unitPrice?: number;
  currency: "JPY";
  weightBasis?: "per_piece" | "per_sale_length";
  weightBasisLengthMm?: number;
}

export interface ConnectionPoint {
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

export interface ThroughHole {
  id: string;
  name: string;
  entryXNorm: number;
  entryYNorm: number;
  exitXNorm: number;
  exitYNorm: number;
  diameterMm?: number;
  axisDeg: number;
}

export type PartGeometryKind = "node" | "path";

export interface HoleReference{sourceDraftId:string;sourceUrl:string;descriptionSha256:string;minMm:number;maxMm:number;approximate:boolean;presence:'through'|'blind'|'none';sizeText:string;reviewedAt:string}
export interface Part {
  metadata?: {guideAnchor?:{version:1;status:'photo-estimate';referenceKind?:'source-central-projection'|'visible-opening'|'surface-entry-estimate';rotationMode?:'keep-current'|'reviewed-in-plane';xNorm:number;yNorm:number;imageAssetId:string;sourceDraftId:string;photoSha256:string;evidenceText:string;reviewedAt:string};sourceDraftId?:string;nominalPlacement?: {imageScaleVerified: boolean;connectionReady: boolean;photoSha256?:string};guideOrientation?:{version:1;status:'reviewed-axis'|'no-through-hole';axisDeg?:number;imageAssetId:string;sourceDraftId:string;photoSha256:string;descriptionSha256:string;evidenceText:string;reviewedAt:string}};
  id: string;
  name: string;
  sku?: string;
  sourceName?: string;
  material?: string;
  color?: string;
  subCategory?: string;
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
  holeReference?:HoleReference;
  selectionReference?:{displayName:string;offerDraftId:string;sourceUrl:string;purchaseText:string;price:number|null;currency:string|null;available:boolean;sourceFetchedAt:string;retainedSourceDraftId:string;status:'minimum-sale-unit-reference';scope?:'same-product-subgroup';approximateCount?:number};
  purchaseSpec?: PurchaseSpec;
  pathRenderSpec?: PathRenderSpec;
  connectionPoints: ConnectionPoint[];
  throughHoles: ThroughHole[];
}

export interface DesignNode {
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

export interface Vec2 {
  x: number;
  y: number;
}

export interface DesignPath {
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

export type PointOrientationMode =
  | "align_opposite"
  | "keep_rotation"
  | "manual";

export interface PointAttachment {
  id: string;
  kind: "point";
  nodeAId: string;
  pointAId: string;
  nodeBId: string;
  pointBId: string;
  orientationMode: PointOrientationMode;
  relativeRotationDeg: number;
}

export interface ThroughAttachment {
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

export type PathAnchorKind = "start" | "end" | "position";

export type PathAttachmentOrientationMode =
  | "world_down"
  | "path_normal"
  | "path_tangent"
  | "keep_rotation";

export interface PathAttachment {
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

export interface MirrorLink {
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

export type Attachment =
  | PointAttachment
  | ThroughAttachment
  | PathAttachment;
