import type { ProgressReport } from '@/application/reports/progressReportService';
import {
  copyProgressReport,
  downloadProgressReport,
  printProgressReport,
  shareProgressReport,
} from '@/features/progress-reports/progressReportDelivery';

const report: ProgressReport = {
  generatedAt: '2026-06-28T14:00:00.000Z',
  period: {
    from: '2026-06-01',
    to: '2026-06-28',
    dayCount: 28,
  },
  sections: ['weight'],
  weight: {
    entryCount: 2,
    changeKg: -1.5,
  },
};

describe('progressReportDelivery', () => {
  it('télécharge un fichier texte nommé selon la période', () => {
    const download = vi.fn();

    downloadProgressReport(report, download);

    expect(download).toHaveBeenCalledWith(
      expect.stringContaining('RAPPORT DE PROGRESSION'),
      'sportpilot-rapport-2026-06-01-2026-06-28.txt',
      'text/plain',
    );
  });

  it('copie le rapport dans le presse-papiers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      copyProgressReport(report, { writeText }),
    ).resolves.toBe('done');

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Évolution : -1,5 kg'),
    );
  });

  it('partage le rapport avec la feuille native', async () => {
    const share = vi.fn().mockResolvedValue(undefined);

    await expect(
      shareProgressReport(report, { share }),
    ).resolves.toBe('done');

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rapport de progression SportPilot',
      }),
    );
  });

  it('déclenche l’impression', () => {
    const print = vi.fn();

    expect(printProgressReport(print)).toBe('done');
    expect(print).toHaveBeenCalledTimes(1);
  });
});
