import {
  DATA_SPACE_REGISTRY_STORAGE_KEY,
  activateAccountDataSpace,
  activateGuestDataSpace,
  getActiveDataSpace,
  readDataSpaceRegistry,
  registerAccountDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/databaseNames';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const NOW = '2026-07-01T08:00:00.000Z';
const LATER = '2026-07-01T09:00:00.000Z';

describe('dataSpaceRegistry', () => {
  it('conserve la base historique comme espace invité par défaut', () => {
    const storage = new MemoryStorage();

    expect(getActiveDataSpace(storage, NOW)).toEqual({
      id: 'guest',
      kind: 'guest',
      databaseName: DEFAULT_DATABASE_NAME,
      label: 'Espace local invité',
      createdAt: NOW,
      lastActivatedAt: NOW,
    });
  });

  it('ignore un registre local corrompu sans bloquer le démarrage', () => {
    const storage = new MemoryStorage();
    storage.setItem(DATA_SPACE_REGISTRY_STORAGE_KEY, '{invalid');

    expect(readDataSpaceRegistry(storage, NOW).activeSpaceId).toBe('guest');
  });

  it('prépare un espace de compte distinct sans stocker l’identifiant brut', () => {
    const storage = new MemoryStorage();
    const accountSpace = registerAccountDataSpace(
      'acct-A1B2C3D4',
      storage,
      NOW,
    );

    expect(accountSpace).toMatchObject({
      id: 'account:acct-a1b2c3d4',
      kind: 'account',
      databaseName: `${DEFAULT_DATABASE_NAME}--acct-a1b2c3d4`,
      accountFingerprint: 'acct-a1b2c3d4',
    });
    expect(getActiveDataSpace(storage, NOW).id).toBe('guest');

    const raw = storage.getItem(DATA_SPACE_REGISTRY_STORAGE_KEY);
    expect(raw).toContain('acct-a1b2c3d4');
    expect(raw).not.toContain('@');
  });

  it('active explicitement un compte puis permet de revenir à l’invité', () => {
    const storage = new MemoryStorage();

    activateAccountDataSpace('acct-A1B2C3D4', storage, NOW);
    expect(getActiveDataSpace(storage, NOW)).toMatchObject({
      id: 'account:acct-a1b2c3d4',
      kind: 'account',
      lastActivatedAt: NOW,
    });

    activateGuestDataSpace(storage, LATER);
    expect(getActiveDataSpace(storage, LATER)).toMatchObject({
      id: 'guest',
      kind: 'guest',
      lastActivatedAt: LATER,
    });
  });
});
