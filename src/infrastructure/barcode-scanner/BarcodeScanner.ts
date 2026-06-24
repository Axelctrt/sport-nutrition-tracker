export type BarcodeScannerErrorCode =
  | 'insecure-context'
  | 'unsupported-browser'
  | 'permission-denied'
  | 'camera-unavailable'
  | 'camera-busy'
  | 'initialization-failed';

export interface BarcodeScanResult {
  code: string;
  format: string;
  detectedAt: string;
}

export interface BarcodeScannerStartOptions {
  target: HTMLElement;
  onDetected: (result: BarcodeScanResult) => void;
}

export interface BarcodeScannerPort {
  start(options: BarcodeScannerStartOptions): Promise<void>;
  stop(): Promise<void>;
}

export class BarcodeScannerError extends Error {
  readonly code: BarcodeScannerErrorCode;

  constructor(
    code: BarcodeScannerErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'BarcodeScannerError';
    this.code = code;
  }
}

function browserErrorName(error: unknown): string | undefined {
  if (error instanceof DOMException) return error.name;
  if (error instanceof Error && error.name) return error.name;
  return undefined;
}

export function normalizeBarcodeScannerError(error: unknown): BarcodeScannerError {
  if (error instanceof BarcodeScannerError) return error;

  const errorName = browserErrorName(error);
  const cause = error instanceof Error ? error : undefined;

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return new BarcodeScannerError(
      'permission-denied',
      'L’accès à la caméra a été refusé. Autorise la caméra dans les réglages du navigateur puis réessaie.',
      { cause },
    );
  }

  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
    return new BarcodeScannerError(
      'camera-unavailable',
      'Aucune caméra compatible n’est disponible sur cet appareil.',
      { cause },
    );
  }

  if (errorName === 'NotReadableError' || errorName === 'AbortError') {
    return new BarcodeScannerError(
      'camera-busy',
      'La caméra ne peut pas être ouverte. Ferme les autres applications qui l’utilisent puis réessaie.',
      { cause },
    );
  }

  if (errorName === 'SecurityError') {
    return new BarcodeScannerError(
      'insecure-context',
      'La caméra nécessite une page sécurisée en HTTPS.',
      { cause },
    );
  }

  return new BarcodeScannerError(
    'initialization-failed',
    'La caméra n’a pas pu être initialisée. Réessaie ou utilise la saisie manuelle.',
    { cause },
  );
}
