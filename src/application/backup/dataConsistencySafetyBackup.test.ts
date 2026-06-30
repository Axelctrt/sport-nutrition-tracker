import { createSafetyBackupFileName } from '@/application/backup/safetyBackupService';

describe('sauvegarde de sécurité de cohérence', () => {
  it('utilise un nom explicite avant la réparation', () => {
    expect(
      createSafetyBackupFileName(
        '2026-06-28T15:00:00.000Z',
        'before-consistency-repair',
      ),
    ).toBe(
      'sportpilot-securite-avant-reparation-coherence-2026-06-28T15-00-00-000Z.json',
    );
  });
});
