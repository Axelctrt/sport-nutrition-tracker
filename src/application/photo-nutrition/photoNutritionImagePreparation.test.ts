import {
  calculatePreparedPhotoDimensions,
  preparePhotoForNutritionAnalysis,
} from '@/application/photo-nutrition/photoNutritionImagePreparation';

describe('photoNutritionImagePreparation', () => {
  it('limite le plus grand côté à 1600 px sans déformer la photo', () => {
    expect(calculatePreparedPhotoDimensions(4032, 3024)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(calculatePreparedPhotoDimensions(900, 1200)).toEqual({
      width: 900,
      height: 1200,
    });
  });

  it('refuse un format qui ne peut pas être envoyé comme image', async () => {
    const file = new File(['texte'], 'repas.pdf', { type: 'application/pdf' });

    await expect(preparePhotoForNutritionAnalysis(file)).rejects.toThrow(
      'JPEG, PNG, WebP ou HEIC',
    );
  });

  it('applique l’orientation du fichier, redimensionne et produit un JPEG léger', async () => {
    const close = vi.fn();
    const bitmap = {
      width: 3200,
      height: 2400,
      close,
    } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));

    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob([new Uint8Array(700 * 1024)], { type: 'image/jpeg' }));
      }),
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement').mockImplementation(
      ((tagName: string) => tagName === 'canvas'
        ? canvas
        : originalCreateElement(tagName)) as typeof document.createElement,
    );

    try {
      const result = await preparePhotoForNutritionAnalysis(
        new File([new Uint8Array(2 * 1024 * 1024)], 'repas.png', {
          type: 'image/png',
          lastModified: 123,
        }),
      );

      expect(createImageBitmap).toHaveBeenCalledWith(
        expect.any(File),
        { imageOrientation: 'from-image' },
      );
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
      expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200);
      expect(result.name).toBe('repas.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBe(700 * 1024);
      expect(close).toHaveBeenCalledOnce();
    } finally {
      createElement.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
