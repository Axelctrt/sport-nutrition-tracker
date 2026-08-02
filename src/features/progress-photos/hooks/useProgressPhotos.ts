import { useCallback, useEffect, useRef, useState } from 'react';

import {
  saveProgressPhoto,
  type SaveProgressPhotoInput,
} from '@/application/progress-photos/progressPhotoService';
import type { ProgressPhoto } from '@/domain/models/progressPhoto';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface ProgressPhotoListItem {
  photo: ProgressPhoto;
  thumbnailUrl: string;
}

export type ProgressPhotosStatus = 'loading' | 'ready' | 'error';

function revokeUrls(urls: readonly string[]): void {
  if (typeof URL.revokeObjectURL !== 'function') return;
  urls.forEach((url) => URL.revokeObjectURL(url));
}

export function useProgressPhotos() {
  const [status, setStatus] = useState<ProgressPhotosStatus>('loading');
  const [items, setItems] = useState<ProgressPhotoListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const objectUrls = useRef<string[]>([]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setErrorMessage(undefined);
    try {
      await repositories.progressPhotos.cleanupOrphans();
      const photos = await repositories.progressPhotos.listAll();
      const nextItems = await Promise.all(photos.map(async (photo) => {
        const asset = await repositories.progressPhotos.getAsset(photo.thumbnailAssetId);
        if (!asset || typeof URL.createObjectURL !== 'function') {
          return { photo, thumbnailUrl: '' };
        }
        return { photo, thumbnailUrl: URL.createObjectURL(asset.blob) };
      }));
      revokeUrls(objectUrls.current);
      objectUrls.current = nextItems
        .map(({ thumbnailUrl }) => thumbnailUrl)
        .filter(Boolean);
      setItems(nextItems);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Les photos de progression ne peuvent pas être chargées.',
      );
      if (!silent) setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => revokeUrls(objectUrls.current);
  }, [refresh]);

  const save = useCallback(async (input: SaveProgressPhotoInput) => {
    const saved = await saveProgressPhoto(repositories.progressPhotos, input);
    await refresh(true);
    return saved;
  }, [refresh]);

  const remove = useCallback(async (photoId: string) => {
    await repositories.progressPhotos.delete(photoId);
    await refresh(true);
  }, [refresh]);

  return {
    status,
    items,
    errorMessage,
    refresh,
    save,
    remove,
  };
}
