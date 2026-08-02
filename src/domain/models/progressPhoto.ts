import type { DatedEntity, EntityMetadata } from '@/domain/models/common';

export const PROGRESS_PHOTO_VIEWS = [
  'front',
  'left',
  'right',
  'back',
  'free',
] as const;

export type ProgressPhotoView = (typeof PROGRESS_PHOTO_VIEWS)[number];

export const PROGRESS_PHOTO_ASSET_KINDS = ['original', 'thumbnail'] as const;

export type ProgressPhotoAssetKind =
  (typeof PROGRESS_PHOTO_ASSET_KINDS)[number];

export interface ProgressPhoto extends DatedEntity {
  view: ProgressPhotoView;
  weightKg?: number;
  note?: string;
  originalFileName?: string;
  originalAssetId: string;
  thumbnailAssetId: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface ProgressPhotoAsset extends EntityMetadata {
  photoId: string;
  kind: ProgressPhotoAssetKind;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface ProcessedProgressPhotoImage {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}
