import { createSafetyBackupFileName } from '@/application/backup/safetyBackupService';

describe('sauvegarde de sécurité de restauration sélective', () => {
  it('utilise un nom explicite avant la restauration', () => {
    expect(
      createSafetyBackupFileName(
        '2026-06-28T16:00:00.000Z',
        'before-selective-restore',
      ),
    ).toBe(
      'sportpilot-securite-avant-restauration-selective-2026-06-28T16-00-00-000Z.json',
    );
  });
});
