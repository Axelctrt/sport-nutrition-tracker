import { RepositoryError } from '@/domain/errors/RepositoryError';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { createEntity } from '@/shared/utils/entities';
import type { WeightEntry } from '@/domain/models/weight';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(
    `sportpilot-partial-update-test-${crypto.randomUUID()}`,
  );
}

describe('updateStoredEntity', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('préserve les champs modifiés après la lecture initiale', async () => {
    const original = createEntity<WeightEntry>(
      {
        date: '2026-06-23',
        weightKg: 60,
        note: 'Note initiale',
      },
      'weight:2026-06-23',
      '2026-06-23T08:00:00.000Z',
    );
    await database.weights.add(original);

    const staleSnapshot = await database.weights.get(original.id);
    expect(staleSnapshot).toBeDefined();

    await database.weights.update(original.id, {
      note: 'Modification concurrente',
    });

    const result = await updateStoredEntity(
      database.weights,
      staleSnapshot!,
      { weightKg: 61 },
      '2026-06-23T09:00:00.000Z',
    );

    expect(result).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      updatedAt: '2026-06-23T09:00:00.000Z',
      weightKg: 61,
      note: 'Modification concurrente',
    });
  });

  it('supprime un champ optionnel explicitement défini à undefined', async () => {
    const original = createEntity<WeightEntry>(
      {
        date: '2026-06-23',
        weightKg: 60,
        note: 'À supprimer',
      },
      'weight:2026-06-23',
      '2026-06-23T08:00:00.000Z',
    );
    await database.weights.add(original);

    const result = await updateStoredEntity(
      database.weights,
      original,
      { note: undefined },
      '2026-06-23T09:00:00.000Z',
    );

    expect(result.note).toBeUndefined();
    expect(Object.hasOwn(result, 'note')).toBe(false);
  });

  it('échoue si la ligne a disparu avant l’écriture', async () => {
    const original = createEntity<WeightEntry>(
      { date: '2026-06-23', weightKg: 60 },
      'weight:2026-06-23',
    );
    await database.weights.add(original);
    await database.weights.delete(original.id);

    await expect(
      updateStoredEntity(database.weights, original, { weightKg: 61 }),
    ).rejects.toBeInstanceOf(RepositoryError);
  });
});
