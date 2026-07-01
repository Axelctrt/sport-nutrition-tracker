import {
  CURRENT_DEVICE_STORAGE_KEY,
  getOrCreateCurrentDevice,
  type DeviceStorage,
} from '@/infrastructure/devices/currentDeviceRegistry';

class MemoryStorage implements DeviceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('currentDeviceRegistry', () => {
  it('crée une identité locale opaque et lisible', () => {
    const storage = new MemoryStorage();
    const device = getOrCreateCurrentDevice({
      storage,
      now: '2026-07-01T10:00:00.000Z',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      randomUUID: () => 'ABCDEF01-2345-6789-ABCD-EF0123456789',
    });

    expect(device).toEqual({
      id: 'device-abcdef01-2345-6789-abcd-ef0123456789',
      label: 'Safari sur iPhone',
      platform: 'iPhone',
      browser: 'Safari',
      createdAt: '2026-07-01T10:00:00.000Z',
      lastSeenAt: '2026-07-01T10:00:00.000Z',
    });
    expect(storage.getItem(CURRENT_DEVICE_STORAGE_KEY)).not.toContain('@');
  });

  it('conserve le même identifiant et actualise la dernière activité', () => {
    const storage = new MemoryStorage();
    const first = getOrCreateCurrentDevice({
      storage,
      now: '2026-07-01T10:00:00.000Z',
      userAgent: 'Mozilla/5.0 Windows Chrome/149.0.0.0',
      platform: 'Win32',
      randomUUID: () => 'device-one',
    });
    const second = getOrCreateCurrentDevice({
      storage,
      now: '2026-07-01T11:00:00.000Z',
      userAgent: 'Mozilla/5.0 Windows Chrome/149.0.0.0',
      platform: 'Win32',
      randomUUID: () => 'device-two',
    });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.lastSeenAt).toBe('2026-07-01T11:00:00.000Z');
  });

  it('remplace une identité corrompue sans bloquer le démarrage', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_DEVICE_STORAGE_KEY, '{invalid');

    expect(
      getOrCreateCurrentDevice({
        storage,
        now: '2026-07-01T10:00:00.000Z',
        userAgent: 'Mozilla/5.0 Linux Firefox/140.0',
        platform: 'Linux x86_64',
        randomUUID: () => 'replacement',
      }).id,
    ).toBe('device-replacement');
  });
});
