import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { createEntity } from '@/shared/utils/entities';
import type { WeightEntry } from '@/domain/models/weight';
import { createTechnicalDiagnostic, serializeTechnicalDiagnostic } from '@/infrastructure/diagnostics/diagnosticService';

const databaseName = 'sportpilot-diagnostic-test';
let database: AppDatabase;

beforeEach(async () => {
  database = new AppDatabase(databaseName);
  await database.open();
  await database.appSettings.put(createDefaultAppSettings());
  await database.weights.add(createEntity<WeightEntry>({
    date: '2026-06-26',
    weightKg: 69.4,
    note: 'information personnelle qui ne doit pas sortir',
  }));
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('createTechnicalDiagnostic', () => {
  it('exporte uniquement des informations techniques et des compteurs', async () => {
    const diagnostic = await createTechnicalDiagnostic(database, '2026-06-26T12:00:00.000Z');
    const serialized = serializeTechnicalDiagnostic(diagnostic);

    expect(diagnostic.recordCounts.weights).toBe(1);
    expect(serialized).not.toContain('69.4');
    expect(serialized).not.toContain('information personnelle');
    expect(serialized).not.toContain('firstName');
  });
});
