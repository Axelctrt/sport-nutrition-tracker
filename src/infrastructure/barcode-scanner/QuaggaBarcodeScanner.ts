import Quagga, { type QuaggaJSResultObject } from '@ericblade/quagga2';
import {
  BarcodeScannerError,
  normalizeBarcodeScannerError,
  type BarcodeScanResult,
  type BarcodeScannerPort,
  type BarcodeScannerStartOptions,
} from '@/infrastructure/barcode-scanner/BarcodeScanner';
import { sanitizeBarcode } from '@/infrastructure/open-food-facts/barcode';

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function assertCameraEnvironment(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new BarcodeScannerError(
      'unsupported-browser',
      'Le scanner nécessite un navigateur disposant d’une caméra.',
    );
  }

  if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
    throw new BarcodeScannerError(
      'insecure-context',
      'La caméra nécessite une adresse HTTPS. Le test depuis une adresse locale en HTTP sur téléphone ne peut pas ouvrir la caméra.',
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new BarcodeScannerError(
      'unsupported-browser',
      'Ce navigateur ne permet pas l’accès à la caméra. Utilise Safari ou Chrome à jour.',
    );
  }
}

function stopTracksInside(target?: HTMLElement): void {
  if (!target) return;

  for (const video of target.querySelectorAll('video')) {
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    video.srcObject = null;
  }
}

export class QuaggaBarcodeScanner implements BarcodeScannerPort {
  private target: HTMLElement | undefined;
  private detectionCallback: ((result: QuaggaJSResultObject) => void) | undefined;
  private running = false;

  async start({ target, onDetected }: BarcodeScannerStartOptions): Promise<void> {
    assertCameraEnvironment();
    await this.stop();

    this.target = target;
    this.detectionCallback = (result) => {
      const rawCode = result.codeResult?.code;
      if (!rawCode) return;

      const code = sanitizeBarcode(rawCode);
      if (!/^\d+$/.test(code)) return;

      const scanResult: BarcodeScanResult = {
        code,
        format: result.codeResult.format || 'unknown',
        detectedAt: new Date().toISOString(),
      };
      onDetected(scanResult);
    };

    Quagga.onDetected(this.detectionCallback);

    try {
      await Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target,
          constraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          area: {
            top: '20%',
            right: '5%',
            bottom: '20%',
            left: '5%',
            borderColor: 'rgba(255, 255, 255, 0.9)',
            borderWidth: 2,
          },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader'],
          multiple: false,
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        locate: true,
        frequency: 10,
        numOfWorkers: 1,
        canvas: {
          createOverlay: true,
        },
      });
      Quagga.start();
      this.running = true;
    } catch (error) {
      Quagga.offDetected(this.detectionCallback);
      this.detectionCallback = undefined;
      stopTracksInside(this.target);
      this.target?.replaceChildren();
      this.target = undefined;
      throw normalizeBarcodeScannerError(error);
    }
  }

  async stop(): Promise<void> {
    if (this.detectionCallback) {
      Quagga.offDetected(this.detectionCallback);
      this.detectionCallback = undefined;
    }

    if (this.running) {
      try {
        await Quagga.stop();
      } catch {
        // L’arrêt manuel des pistes ci-dessous reste exécuté même si Quagga échoue.
      }
    }

    stopTracksInside(this.target);
    this.target?.replaceChildren();
    this.target = undefined;
    this.running = false;
  }
}
