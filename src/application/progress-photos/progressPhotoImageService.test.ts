import {
  MAX_PROGRESS_PHOTO_INPUT_BYTES,
  processProgressPhotoFile,
  ProgressPhotoImageError,
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
    }) as typeof document.createElement);

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
});
