import type { DesignNode, DesignPath, MirrorLink, Part, PathAttachment, PointAttachment, ThroughAttachment } from './domain';
import type { SourceSnapshotInput } from '../domain/part/importCandidate';

export interface Design {
  id: string;
  name: string;
  type: 'necklace' | 'earrings';
  canvasConfig: Record<string, unknown>;
  editorConfig: Record<string, unknown>;
  thumbnailPath?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignAggregate {
  design: Design;
  nodes: DesignNode[];
  paths: DesignPath[];
  pointAttachments: PointAttachment[];
  throughAttachments: ThroughAttachment[];
  pathAttachments: PathAttachment[];
  mirrorLinks: MirrorLink[];
}

export interface ImageAssetInput {
  id: string;
  assetKind: 'part_main' | 'path_segment';
  contentHash: string;
  originalPath: string;
  normalizedHighPath: string;
  normalizedMediumPath: string;
  thumbnailPath: string;
  pixelWidth: number;
  pixelHeight: number;
  calibrationMmPerPx: number;
  sourceTransform: Record<string, unknown>;
}

type NullableOptional<T> = {[K in keyof T]:undefined extends T[K]?T[K]|null:T[K]};
export interface PartSaveInput {
  part: Partial<NullableOptional<Omit<Part, 'id' | 'isArchived' | 'supersedesPartId' | 'purchaseSpec' | 'pathRenderSpec' | 'connectionPoints' | 'throughHoles'>>>;
  imageAsset?: ImageAssetInput;
  segmentAsset?: ImageAssetInput;
  purchaseSpec?: Part['purchaseSpec'] | null;
  pathSpec?: Part['pathRenderSpec'] | null;
  connectionPoints?: Part['connectionPoints'];
  throughHoles?: Part['throughHoles'];
  sourceSnapshots?:SourceSnapshotInput[];
}
