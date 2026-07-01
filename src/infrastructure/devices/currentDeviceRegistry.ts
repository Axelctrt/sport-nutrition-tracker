export const CURRENT_DEVICE_STORAGE_KEY = 'sportpilot:current-device:v1';

export interface DeviceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CurrentDeviceDescriptor {
  readonly id: string;
  readonly label: string;
  readonly platform: string;
  readonly browser: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
}

export interface CurrentDeviceRegistryOptions {
  readonly storage?: DeviceStorage;
  readonly now?: Date | string;
  readonly userAgent?: string;
  readonly platform?: string;
  readonly randomUUID?: () => string;
}

function resolveStorage(): DeviceStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function resolveNow(now: Date | string | undefined): string {
  if (typeof now === 'string') return now;
  return (now ?? new Date()).toISOString();
}

function browserLabel(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/CriOS\//i.test(userAgent)) return 'Chrome iOS';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/FxiOS\//i.test(userAgent)) return 'Firefox iOS';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  return 'Navigateur';
}

function platformLabel(userAgent: string, platform: string): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent) || /Win/i.test(platform)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform)) return 'macOS';
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) return 'Linux';
  return 'Appareil';
}

function createDeviceId(randomUUID?: () => string): string {
  const uuid = randomUUID?.()
    ?? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

  return `device-${uuid.toLowerCase()}`;
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isValidDevice(value: unknown): value is CurrentDeviceDescriptor {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CurrentDeviceDescriptor>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.startsWith('device-') &&
    typeof candidate.label === 'string' &&
    candidate.label.length > 0 &&
    typeof candidate.platform === 'string' &&
    candidate.platform.length > 0 &&
    typeof candidate.browser === 'string' &&
    candidate.browser.length > 0 &&
    isIsoDateTime(candidate.createdAt) &&
    isIsoDateTime(candidate.lastSeenAt)
  );
}

export function getOrCreateCurrentDevice(
  options: CurrentDeviceRegistryOptions = {},
): CurrentDeviceDescriptor {
  const storage = options.storage ?? resolveStorage();
  const timestamp = resolveNow(options.now);
  const userAgent = options.userAgent
    ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  const platform = options.platform
    ?? (typeof navigator === 'undefined' ? '' : navigator.platform);
  const browser = browserLabel(userAgent);
  const detectedPlatform = platformLabel(userAgent, platform);

  if (storage) {
    try {
      const raw = storage.getItem(CURRENT_DEVICE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isValidDevice(parsed)) {
          const updated: CurrentDeviceDescriptor = {
            ...parsed,
            label: `${browser} sur ${detectedPlatform}`,
            platform: detectedPlatform,
            browser,
            lastSeenAt: timestamp,
          };
          storage.setItem(CURRENT_DEVICE_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        }
      }
    } catch {
      // Une identité locale corrompue est remplacée sans bloquer l'application.
    }
  }

  const created: CurrentDeviceDescriptor = {
    id: createDeviceId(options.randomUUID),
    label: `${browser} sur ${detectedPlatform}`,
    platform: detectedPlatform,
    browser,
    createdAt: timestamp,
    lastSeenAt: timestamp,
  };

  storage?.setItem(CURRENT_DEVICE_STORAGE_KEY, JSON.stringify(created));
  return created;
}
