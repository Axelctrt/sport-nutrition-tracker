import type { LocalDate } from '@/domain/models/common';
import type {
  ProcessedProgressPhotoImage,
  ProgressPhoto,
  ProgressPhotoAsset,
  ProgressPhotoView,
} from '@/domain/models/progressPhoto';

export interface CreateProgressPhotoInput {
  date: LocalDate;
  view: ProgressPhotoView;
  weightKg?: number;
  note?: string;
  originalFileName?: string;
  original: ProcessedProgressPhotoImage;
  thumbnail: ProcessedProgressPhotoImage;
}

export interface ProgressPhotoWithAssets {
  photo: ProgressPhoto;
  original: ProgressPhotoAsset;
  thumbnail: ProgressPhotoAsset;
}

export interface ProgressPhotoCleanupResult {
  removedAssets: number;
  removedPhotos: number;
}

export interface ProgressPhotoRepository {
  listAll(): Promise<ProgressPhoto[]>;
  listByView(view: ProgressPhotoView): Promise<ProgressPhoto[]>;
  getById(photoId: string): Promise<ProgressPhoto | undefined>;
  getAsset(assetId: string): Promise<ProgressPhotoAsset | undefined>;
  getWithAssets(photoId: string): Promise<ProgressPhotoWithAssets | undefined>;
  create(input: CreateProgressPhotoInput): Promise<ProgressPhoto>;
  delete(photoId: string): Promise<void>;
  clearAll(): Promise<void>;
  cleanupOrphans(): Promise<ProgressPhotoCleanupResult>;
}
