import {
  MAX_PROGRESS_PHOTO_INPUT_BYTES,
  processProgressPhotoFile,
  ProgressPhotoImageError,
  readMetadataSafeJpegDimensions,
  stripJpegIccProfileSegments,
  validateProgressPhotoFile,
} from '@/application/progress-photos/progressPhotoImageService';

describe('progressPhotoImageService', () => {
  it('refuse les formats non image, les fichiers vides et les fichiers trop lourds', () => {
    expect(() => validateProgressPhotoFile(
      new File(['texte'], 'notes.txt', { type: 'text/plain' }),
    )).toThrow(ProgressPhotoImageError);

    expect(() => validateProgressPhotoFile(
      new File([], 'vide.jpg', { type: 'image/jpeg' }),
    )).toThrow('vide');

    const oversized = new File(
      [new Uint8Array(MAX_PROGRESS_PHOTO_INPUT_BYTES + 1)],
      'lourde.jpg',
      { type: 'image/jpeg' },
    );
    expect(() => validateProgressPhotoFile(oversized)).toThrow('25 Mo');
  });

  it('crée un original limité à 2048 px et une miniature limitée à 480 px', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 4_000,
      height: 3_000,
      close,
    }));

    const createdCanvases: Array<{ width: number; height: number }> = [];
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        }),
        toBlob: (callback: BlobCallback) => {
          createdCanvases.push({ width: canvas.width, height: canvas.height });
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    }) as unknown as typeof document.createElement);

    try {
      const result = await processProgressPhotoFile(
        new File(['photo'], 'progression.jpg', { type: 'image/jpeg' }),
      );

      expect(result.original).toMatchObject({
        width: 2_048,
        height: 1_536,
        mimeType: 'image/jpeg',
      });
      expect(result.thumbnail).toMatchObject({
        width: 480,
        height: 360,
        mimeType: 'image/jpeg',
      });
      expect(createdCanvases).toEqual(expect.arrayContaining([
        { width: 2_048, height: 1_536 },
        { width: 480, height: 360 },
      ]));
      expect(close).toHaveBeenCalledOnce();
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('conserve l’URL de secours jusqu’à la fin des dessins canvas', async () => {
    const createObjectURL = vi.fn(() => 'blob:progress-photo');
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    class FakeImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';

      get src(): string {
        return this.value;
      }

      set src(value: string) {
        this.value = value;
        if (value) queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);

    const drawImage = vi.fn(() => {
      expect(revokeObjectURL).not.toHaveBeenCalled();
    });
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage,
        }),
        toBlob: (callback: BlobCallback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    }) as unknown as typeof document.createElement);

    try {
      await processProgressPhotoFile(
        new File(['photo'], 'progression.png', { type: 'image/png' }),
      );

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(drawImage).toHaveBeenCalledTimes(2);
      expect(revokeObjectURL).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:progress-photo');
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          writable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });

  it('retente via une data URL lorsque WebKit refuse l’URL blob', async () => {
    const createObjectURL = vi.fn(() => 'blob:webkit-refused');
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    class FakeImage {
      naturalWidth = 640;
      naturalHeight = 480;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';

      get src(): string {
        return this.value;
      }

      set src(value: string) {
        this.value = value;
        if (!value) return;
        queueMicrotask(() => {
          if (value.startsWith('blob:')) {
            this.onerror?.();
            return;
          }
          this.onload?.();
        });
      }
    }

    class FakeFileReader {
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsDataURL(): void {
        this.result = 'data:image/png;base64,ZmFrZS1waG90bw==';
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
    vi.stubGlobal('FileReader', FakeFileReader as unknown as typeof FileReader);

    const drawImage = vi.fn();
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage,
        }),
        toBlob: (callback: BlobCallback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    }) as unknown as typeof document.createElement);

    try {
      const result = await processProgressPhotoFile(
        new File(['photo'], 'progression.png', { type: 'image/png' }),
      );

      expect(result.original).toMatchObject({ width: 640, height: 480 });
      expect(result.thumbnail).toMatchObject({ width: 480, height: 360 });
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:webkit-refused');
      expect(drawImage).toHaveBeenCalledTimes(2);
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          writable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });

  it('conserve un petit JPEG sûr lorsque les décodeurs navigateur échouent', async () => {
    const jpegBytes = Uint8Array.from(
      atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJABeKv/2Q=='),
      (character) => character.charCodeAt(0),
    );
    const originalCreateObjectURL = URL.createObjectURL;
    const createElement = vi.spyOn(document, 'createElement');

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(
      new Error('WebKit decoder unavailable'),
    ));
    vi.stubGlobal('FileReader', undefined);

    try {
      const result = await processProgressPhotoFile(
        new File([jpegBytes], 'petite-photo.jpg', { type: 'image/jpeg' }),
      );

      expect(result.original).toMatchObject({
        width: 8,
        height: 6,
        mimeType: 'image/jpeg',
        byteSize: jpegBytes.byteLength,
      });
      expect(result.thumbnail).toMatchObject({
        width: 8,
        height: 6,
        mimeType: 'image/jpeg',
        byteSize: jpegBytes.byteLength,
      });
      expect(createElement).not.toHaveBeenCalledWith('canvas');

      const iccProfileSegment = Uint8Array.from([
        0xff, 0xe2, 0x00, 0x10,
        0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f,
        0x46, 0x49, 0x4c, 0x45, 0x00, 0x01, 0x01,
      ]);
      const jpegWithIccProfile = new Uint8Array(
        jpegBytes.byteLength + iccProfileSegment.byteLength,
      );
      jpegWithIccProfile.set(jpegBytes.slice(0, 2), 0);
      jpegWithIccProfile.set(iccProfileSegment, 2);
      jpegWithIccProfile.set(
        jpegBytes.slice(2),
        2 + iccProfileSegment.byteLength,
      );

      expect(readMetadataSafeJpegDimensions(jpegWithIccProfile)).toBeUndefined();
      const sanitizedJpeg = stripJpegIccProfileSegments(jpegWithIccProfile);
      expect(sanitizedJpeg).toEqual(jpegBytes);
      expect(readMetadataSafeJpegDimensions(sanitizedJpeg)).toEqual({
        width: 8,
        height: 6,
      });

      const exifSegment = Uint8Array.from([
        0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      ]);
      const jpegWithExif = new Uint8Array(jpegBytes.byteLength + exifSegment.byteLength);
      jpegWithExif.set(jpegBytes.slice(0, 2), 0);
      jpegWithExif.set(exifSegment, 2);
      jpegWithExif.set(jpegBytes.slice(2), 2 + exifSegment.byteLength);

      await expect(processProgressPhotoFile(
        new File([jpegWithExif], 'photo-exif.jpg', { type: 'image/jpeg' }),
      )).rejects.toThrow(ProgressPhotoImageError);

      const customApp0Segment = Uint8Array.from([
        0xff, 0xe0, 0x00, 0x08, 0x4a, 0x46, 0x58, 0x58, 0x00, 0x01,
      ]);
      const jpegWithCustomApp0 = new Uint8Array(
        jpegBytes.byteLength + customApp0Segment.byteLength,
      );
      jpegWithCustomApp0.set(jpegBytes.slice(0, 2), 0);
      jpegWithCustomApp0.set(customApp0Segment, 2);
      jpegWithCustomApp0.set(
        jpegBytes.slice(2),
        2 + customApp0Segment.byteLength,
      );

      await expect(processProgressPhotoFile(
        new File([jpegWithCustomApp0], 'photo-app0.jpg', { type: 'image/jpeg' }),
      )).rejects.toThrow(ProgressPhotoImageError);
      await expect(processProgressPhotoFile(
        new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], 'invalide.jpg', {
          type: 'image/jpeg',
        }),
      )).rejects.toThrow(ProgressPhotoImageError);
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
    }
  });
});
