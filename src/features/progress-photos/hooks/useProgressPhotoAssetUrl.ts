import { useEffect, useState } from 'react';

import { repositories } from '@/infrastructure/repositories/repositories';

export function useProgressPhotoAssetUrl(assetId: string | undefined) {
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl('');
    setErrorMessage(undefined);

    if (!assetId) return () => undefined;

    void repositories.progressPhotos.getAsset(assetId).then((asset) => {
      if (!active) return;
      if (!asset || typeof URL.createObjectURL !== 'function') {
        setErrorMessage('Le fichier de cette photo est introuvable.');
        return;
      }
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le fichier de cette photo ne peut pas être chargé.',
      );
    });

    return () => {
      active = false;
      if (objectUrl && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assetId]);

  return { url, errorMessage };
}
