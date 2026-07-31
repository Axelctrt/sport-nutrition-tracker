import type { ProcessedProgressPhotoImage } from '@/domain/models/progressPhoto';

export const MAX_PROGRESS_PHOTO_INPUT_BYTES = 25 * 1024 * 1024;
export const MAX_PROGRESS_PHOTO_EDGE = 2_048;
export const MAX_PROGRESS_PHOTO_BYTES = 2_500_000;
export const MAX_PROGRESS_PHOTO_THUMBNAIL_EDGE = 480;
export const MAX_PROGRESS_PHOTO_THUMBNAIL_BYTES = 300_000;

const ACCEPTED_PROGRESS_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

interface ResizeOptions {
  maxEdge: number;
  maximumBytes: number;
  initialQuality: number;
}

export interface ProcessedProgressPhotoPair {
  original: ProcessedProgressPhotoImage;
  thumbnail: ProcessedProgressPhotoImage;
}

export class ProgressPhotoImageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProgressPhotoImageError';
  }
}

function imageDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    throw new ProgressPhotoImageError('Les dimensions de cette image sont invalides.');
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeWithImageBitmap(file: File): Promise<DecodedImage | undefined> {
  if (typeof createImageBitmap !== 'function') return undefined;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    return undefined;
  }
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  if (
    typeof document === 'undefined'
    || typeof Image === 'undefined'
    || typeof URL.createObjectURL !== 'function'
  ) {
    throw new ProgressPhotoImageError(
      'Le navigateur ne permet pas de préparer cette image.',
    );
  }

  const objectUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ProgressPhotoImageError(
        'Cette image ne peut pas être décodée. Essaie un fichier JPEG, PNG ou WebP.',
      ));
      element.src = objectUrl;
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  let closed = false;
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => {
      if (closed) return;
      closed = true;
      image.src = '';
      URL.revokeObjectURL(objectUrl);
    },
  };
}

async function decodeImage(file: File): Promise<DecodedImage> {
  const bitmap = await decodeWithImageBitmap(file);
  if (bitmap) return bitmap;
  return decodeWithImageElement(file);
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ProgressPhotoImageError(
          'Le navigateur n’a pas pu compresser cette image.',
        ));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  });
}

async function resizeDecodedImage(
  decoded: DecodedImage,
  options: ResizeOptions,
): Promise<ProcessedProgressPhotoImage> {
  if (typeof document === 'undefined') {
    throw new ProgressPhotoImageError(
      'Le navigateur ne permet pas de préparer cette image.',
    );
  }
  const dimensions = imageDimensions(decoded.width, decoded.height, options.maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new ProgressPhotoImageError(
      'Le navigateur ne permet pas de redimensionner cette image.',
    );
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, dimensions.width, dimensions.height);
  context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);

  let quality = options.initialQuality;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > options.maximumBytes && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.1);
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > options.maximumBytes) {
    throw new ProgressPhotoImageError(
      'La photo reste trop volumineuse après compression. Choisis une image moins lourde.',
    );
  }

  return {
    blob,
    mimeType: blob.type || 'image/jpeg',
    width: dimensions.width,
    height: dimensions.height,
    byteSize: blob.size,
  };
}

export function validateProgressPhotoFile(file: File): void {
  if (!ACCEPTED_PROGRESS_PHOTO_TYPES.has(file.type.toLowerCase())) {
    throw new ProgressPhotoImageError(
      'Format non pris en charge. Choisis une image JPEG, PNG, WebP ou HEIC.',
    );
  }
  if (file.size <= 0) {
    throw new ProgressPhotoImageError('Le fichier sélectionné est vide.');
  }
  if (file.size > MAX_PROGRESS_PHOTO_INPUT_BYTES) {
    throw new ProgressPhotoImageError(
      'Cette photo dépasse 25 Mo. Choisis une image moins volumineuse.',
    );
  }
}

export async function processProgressPhotoFile(
  file: File,
): Promise<ProcessedProgressPhotoPair> {
  validateProgressPhotoFile(file);
  const decoded = await decodeImage(file);
  try {
    const [original, thumbnail] = await Promise.all([
      resizeDecodedImage(decoded, {
        maxEdge: MAX_PROGRESS_PHOTO_EDGE,
        maximumBytes: MAX_PROGRESS_PHOTO_BYTES,
        initialQuality: 0.86,
      }),
      resizeDecodedImage(decoded, {
        maxEdge: MAX_PROGRESS_PHOTO_THUMBNAIL_EDGE,
        maximumBytes: MAX_PROGRESS_PHOTO_THUMBNAIL_BYTES,
        initialQuality: 0.78,
      }),
    ]);
    return { original, thumbnail };
  } finally {
    decoded.close();
  }
}
