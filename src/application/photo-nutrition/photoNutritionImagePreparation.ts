const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_MAX_OUTPUT_SIZE_BYTES = 1.5 * 1024 * 1024;
const MAX_INPUT_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export interface PhotoPreparationOptions {
  maxDimension?: number;
  maxOutputSizeBytes?: number;
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

export function calculatePreparedPhotoDimensions(
  width: number,
  height: number,
  maxDimension = DEFAULT_MAX_DIMENSION,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    throw new Error('Photo illisible.');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function assertSupportedPhoto(file: File): void {
  if (file.size <= 0) throw new Error('Photo illisible.');
  if (file.size > MAX_INPUT_SIZE_BYTES) {
    throw new Error('Photo trop volumineuse. Choisis une image de moins de 25 Mo.');
  }

  const mimeType = file.type.trim().toLowerCase();
  if (mimeType && !SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new Error('Format non pris en charge. Utilise une image JPEG, PNG, WebP ou HEIC.');
  }
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Photo illisible.'));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function decodePhoto(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Some Safari versions decode HEIC through an image element but not createImageBitmap.
    }
  }

  return decodeWithImageElement(file);
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Impossible de préparer cette photo.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

function preparedFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '').trim() || 'repas';
  return `${baseName}.jpg`;
}

export async function preparePhotoForNutritionAnalysis(
  file: File,
  options: PhotoPreparationOptions = {},
): Promise<File> {
  assertSupportedPhoto(file);

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxOutputSizeBytes = options.maxOutputSizeBytes ?? DEFAULT_MAX_OUTPUT_SIZE_BYTES;
  const decoded = await decodePhoto(file).catch(() => {
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
    throw new Error(
      isHeic
        ? 'Cette photo HEIC ne peut pas être lue sur cet appareil. Exporte-la en JPEG puis réessaie.'
        : 'Cette photo ne peut pas être lue. Essaie une image JPEG, PNG ou WebP.',
    );
  });

  try {
    let dimensions = calculatePreparedPhotoDimensions(decoded.width, decoded.height, maxDimension);
    let lastBlob: Blob | undefined;

    for (let sizeAttempt = 0; sizeAttempt < 4; sizeAttempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Impossible de préparer cette photo.');

      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);

      for (const quality of [0.84, 0.74, 0.64, 0.54]) {
        lastBlob = await encodeCanvas(canvas, quality);
        if (lastBlob.size <= maxOutputSizeBytes) {
          return new File([lastBlob], preparedFileName(file.name), {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
        }
      }

      dimensions = {
        width: Math.max(1, Math.round(dimensions.width * 0.82)),
        height: Math.max(1, Math.round(dimensions.height * 0.82)),
      };
    }

    throw new Error(
      `Photo encore trop volumineuse après compression (${Math.ceil((lastBlob?.size ?? 0) / 1024)} Ko).`,
    );
  } finally {
    decoded.release();
  }
}

export const photoNutritionImagePreparationInternals = {
  MAX_INPUT_SIZE_BYTES,
  SUPPORTED_IMAGE_TYPES,
};
