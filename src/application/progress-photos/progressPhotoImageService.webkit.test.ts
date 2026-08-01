import {
  processProgressPhotoFile,
} from '@/application/progress-photos/progressPhotoImageService';

describe('progressPhotoImageService WebKit', () => {
  it('lit un petit JPEG via FileReader lorsque File.arrayBuffer échoue', async () => {
    const jpegBytes = Uint8Array.from(
      atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJABeKv/2Q=='),
      (character) => character.charCodeAt(0),
    );
    const file = new File([jpegBytes], 'petite-photo.jpg', {
      type: 'image/jpeg',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('WebKit File.arrayBuffer failure')),
    });

    const originalCreateObjectURL = URL.createObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    class FakeImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';

      get src(): string {
        return this.value;
      }

      set src(value: string) {
        this.value = value;
        if (value) queueMicrotask(() => this.onerror?.());
      }
    }

    const readAsArrayBuffer = vi.fn();
    class FakeFileReader {
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsDataURL(): void {
        this.result = 'data:image/jpeg;base64,invalid-for-image-element';
        queueMicrotask(() => this.onload?.());
      }

      readAsArrayBuffer(): void {
        readAsArrayBuffer();
        this.result = jpegBytes.buffer.slice(
          jpegBytes.byteOffset,
          jpegBytes.byteOffset + jpegBytes.byteLength,
        );
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(
      new Error('WebKit decoder unavailable'),
    ));
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
    vi.stubGlobal('FileReader', FakeFileReader as unknown as typeof FileReader);

    try {
      const result = await processProgressPhotoFile(file);

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
      expect(file.arrayBuffer).toHaveBeenCalledOnce();
      expect(readAsArrayBuffer).toHaveBeenCalledOnce();
    } finally {
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
