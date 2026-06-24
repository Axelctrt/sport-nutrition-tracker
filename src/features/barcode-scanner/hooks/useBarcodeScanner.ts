import { useCallback, useEffect, useRef, useState } from 'react';
import {
  normalizeBarcodeScannerError,
  type BarcodeScanResult,
  type BarcodeScannerPort,
} from '@/infrastructure/barcode-scanner/BarcodeScanner';
import { QuaggaBarcodeScanner } from '@/infrastructure/barcode-scanner/QuaggaBarcodeScanner';
import { validateFoodBarcode } from '@/features/barcode-scanner/utils/scannerBarcode';

export type BarcodeScannerStatus = 'idle' | 'requesting' | 'scanning' | 'detected' | 'error';

interface DetectionCandidate {
  code: string;
  count: number;
  lastDetectedAt: number;
}

interface UseBarcodeScannerOptions {
  scanner?: BarcodeScannerPort;
}

export function useBarcodeScanner({ scanner }: UseBarcodeScannerOptions = {}) {
  const scannerRef = useRef<BarcodeScannerPort>(scanner ?? new QuaggaBarcodeScanner());
  const mountedRef = useRef(true);
  const candidateRef = useRef<DetectionCandidate | undefined>(undefined);
  const [status, setStatus] = useState<BarcodeScannerStatus>('idle');
  const [result, setResult] = useState<BarcodeScanResult>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [informationMessage, setInformationMessage] = useState<string>();

  const stop = useCallback(async (message?: string) => {
    await scannerRef.current.stop();
    if (!mountedRef.current) return;
    setStatus((current) => current === 'detected' ? current : 'idle');
    if (message) setInformationMessage(message);
  }, []);

  const handleDetection = useCallback((incoming: BarcodeScanResult) => {
    const valid = validateFoodBarcode(incoming.code);
    if (!valid) return;

    const now = Date.now();
    const previous = candidateRef.current;
    const repeated = previous?.code === valid.code && now - previous.lastDetectedAt <= 2_000;
    const count = repeated ? previous.count + 1 : 1;
    candidateRef.current = { code: valid.code, count, lastDetectedAt: now };

    if (count < 2) return;

    const confirmed: BarcodeScanResult = {
      ...incoming,
      code: valid.code,
      format: incoming.format || valid.format,
    };
    setResult(confirmed);
    setStatus('detected');
    setErrorMessage(undefined);
    setInformationMessage(undefined);
    void scannerRef.current.stop();
  }, []);

  const start = useCallback(async (target: HTMLElement | null) => {
    if (!target) return;

    setStatus('requesting');
    setResult(undefined);
    setErrorMessage(undefined);
    setInformationMessage(undefined);
    candidateRef.current = undefined;

    try {
      await scannerRef.current.start({ target, onDetected: handleDetection });
      if (mountedRef.current) setStatus('scanning');
    } catch (error) {
      if (!mountedRef.current) return;
      const scannerError = normalizeBarcodeScannerError(error);
      setStatus('error');
      setErrorMessage(scannerError.message);
    }
  }, [handleDetection]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(undefined);
    setErrorMessage(undefined);
    setInformationMessage(undefined);
    candidateRef.current = undefined;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const scannerInstance = scannerRef.current;

    const stopForBackground = () => {
      if (document.visibilityState === 'hidden') {
        void stop('La caméra a été arrêtée lorsque l’application est passée en arrière-plan.');
      }
    };
    const stopForPageHide = () => {
      void scannerInstance.stop();
    };

    document.addEventListener('visibilitychange', stopForBackground);
    window.addEventListener('pagehide', stopForPageHide);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', stopForBackground);
      window.removeEventListener('pagehide', stopForPageHide);
      void scannerInstance.stop();
    };
  }, [stop]);

  return {
    status,
    result,
    errorMessage,
    informationMessage,
    start,
    stop,
    reset,
  };
}
