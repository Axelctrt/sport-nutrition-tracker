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

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0,
  0xc1,
  0xc2,
  0xc3,
  0xc5,
  0xc6,
  0xc7,
  0xc9,
  0xca,
  0xcb,
  0xcd,
  0xce,
  0xcf,
]);

const IMAGE_DECODE_ERROR_MESSAGE =
  'Cette image ne peut pas être décodée. Essaie un fichier JPEG, PNG ou WebP.';

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

interface JpegDimensions {
  width: number;
  height: number;
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

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01
    || marker === 0xd8
    || (marker >= 0xd0 && marker <= 0xd7);
}

function containsJpegEndMarker(bytes: Uint8Array, startOffset: number): boolean {
  for (let offset = bytes.length - 2; offset >= startOffset; offset -= 1) {
    const currentByte = bytes[offset];
    const nextByte = bytes[offset + 1];
    if (currentByte === 0xff && nextByte === 0xd9) return true;
  }
  return false;
}

function readMetadataSafeJpegDimensions(bytes: Uint8Array): JpegDimensions | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return undefined;
  }

  let offset = 2;
  let dimensions: JpegDimensions | undefined;
  while (offset + 1 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return undefined;

    const marker = bytes[offset];
    if (marker === undefined) return undefined;
    offset += 1;
    if (marker === 0xd9) return undefined;
    if (isStandaloneJpegMarker(marker)) continue;
    if (offset + 1 >= bytes.length) return undefined;

    const segmentLengthHigh = bytes[offset];
    const segmentLengthLow = bytes[offset + 1];
    if (segmentLengthHigh === undefined || segmentLengthLow === undefined) {
      return undefined;
    }
    const segmentLength = (segmentLengthHigh << 8) | segmentLengthLow;
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return undefined;
    }

    // Un JPEG conservé sans passage canvas ne doit contenir ni EXIF, ni commentaire,
    // ni autre segment applicatif susceptible d’embarquer des données personnelles.
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      return undefined;
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 8) return undefined;
      const heightHigh = bytes[offset + 3];
      const heightLow = bytes[offset + 4];
      const widthHigh = bytes[offset + 5];
      const widthLow = bytes[offset + 6];
      if (
        heightHigh === undefined
        || heightLow === undefined
        || widthHigh === undefined
        || widthLow === undefined
      ) {
        return undefined;
      }
      const height = (heightHigh << 8) | heightLow;
      const width = (widthHigh << 8) | widthLow;
      if (!(width > 0) || !(height > 0)) return undefined;
      dimensions = { width, height };
    }

    if (marker === 0xda) {
      const scanStart = offset + segmentLength;
      return dimensions && containsJpegEndMarker(bytes, scanStart)
        ? dimensions
        : undefined;
    }

    offset += segmentLength;
  }

  return undefined;
}

function readFileAsArrayBufferWithFileReader(file: File): Promise<ArrayBuffer> {
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new ProgressPhotoImageError(
      IMAGE_DECODE_ERROR_MESSAGE,
    ));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new ProgressPhotoImageError(IMAGE_DECODE_ERROR_MESSAGE));
    };
    reader.onerror = () => reject(new ProgressPhotoImageError(
      IMAGE_DECODE_ERROR_MESSAGE,
      { cause: reader.error },
    ));
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return await file.arrayBuffer();
    } catch {
      // Certains WebKit exposent Blob.arrayBuffer() mais échouent sur un File
      // injecté. FileReader reste la voie locale compatible dans ce cas.
    }
  }

  return readFileAsArrayBufferWithFileReader(file);
}

async function createSmallJpegPassThrough(
  file: File,
): Promise<ProcessedProgressPhotoPair | undefined> {
  if (file.type.toLowerCase() !== 'image/jpeg'
    || file.size > MAX_PROGRESS_PHOTO_THUMBNAIL_BYTES) {
    return undefined;
  }

  try {
    const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
    const dimensions = readMetadataSafeJpegDimensions(bytes);
    if (!dimensions
      || Math.max(dimensions.width, dimensions.height) > MAX_PROGRESS_PHOTO_THUMBNAIL_EDGE) {
      return undefined;
    }

    const createProcessedImage = (): ProcessedProgressPhotoImage => {
      const blob = file.slice(0, file.size, 'image/jpeg');
      return {
        blob,
        mimeType: 'image/jpeg',
        width: dimensions.width,
        height: dimensions.height,
        byteSize: blob.size,
      };
    };

    return {
      original: createProcessedImage(),
      thumbnail: createProcessedImage(),
    };
  } catch {
    return undefined;
  }
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

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new ProgressPhotoImageError(
      IMAGE_DECODE_ERROR_MESSAGE,
    ));
    element.src = source;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new ProgressPhotoImageError(
      IMAGE_DECODE_ERROR_MESSAGE,
    ));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new ProgressPhotoImageError(IMAGE_DECODE_ERROR_MESSAGE));
    };
    reader.onerror = () => reject(new ProgressPhotoImageError(
      IMAGE_DECODE_ERROR_MESSAGE,
      { cause: reader.error },
    ));
    reader.readAsDataURL(file);
  });
}

function decodedImageFromElement(
  image: HTMLImageElement,
  close: () => void,
): DecodedImage {
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close,
  };
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new ProgressPhotoImageError(
      'Le navigateur ne permet pas de préparer cette image.',
    );
  }

  if (typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImageElement(objectUrl);
      let closed = false;
      return decodedImageFromElement(image, () => {
        if (closed) return;
        closed = true;
        image.src = '';
        URL.revokeObjectURL(objectUrl);
      });
    } catch {
      URL.revokeObjectURL(objectUrl);
    }
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(dataUrl);
    let closed = false;
    return decodedImageFromElement(image, () => {
      if (closed) return;
      closed = true;
      image.src = '';
    });
  } catch (error) {
    if (error instanceof ProgressPhotoImageError) throw error;
    throw new ProgressPhotoImageError(IMAGE_DECODE_ERROR_MESSAGE, {
      cause: error,
    });
  }
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

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch (error) {
    const passThrough = await createSmallJpegPassThrough(file);
    if (passThrough) return passThrough;
    throw error;
  }

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
