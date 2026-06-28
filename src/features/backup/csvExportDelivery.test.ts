import type { CsvExportFile } from '@/infrastructure/backup/csvExportService';
import {
  downloadCsvExportFiles,
  shareCsvExportFiles,
} from '@/features/backup/csvExportDelivery';

const files: CsvExportFile[] = [
  {
    key: 'weights',
    label: 'Poids',
    fileName: 'poids.csv',
    content: 'date;poids\r\n',
    rowCount: 1,
  },
  {
    key: 'activities',
    label: 'Activités',
    fileName: 'activites.csv',
    content: 'date;type\r\n',
    rowCount: 2,
  },
];

describe('csvExportDelivery', () => {
  it('télécharge chaque fichier sélectionné', () => {
    const download = vi.fn();

    expect(downloadCsvExportFiles(files, download)).toBe(2);
    expect(download).toHaveBeenNthCalledWith(
      1,
      files[0]?.content,
      'poids.csv',
      'text/csv',
    );
    expect(download).toHaveBeenNthCalledWith(
      2,
      files[1]?.content,
      'activites.csv',
      'text/csv',
    );
  });

  it('partage plusieurs fichiers avec la feuille native', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const navigatorLike = {
      canShare: vi.fn().mockReturnValue(true),
      share,
    };

    await expect(
      shareCsvExportFiles(files, navigatorLike),
    ).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [
          expect.any(File),
          expect.any(File),
        ],
        title: 'Exports CSV SportPilot',
      }),
    );
  });

  it('indique quand le partage de fichiers est indisponible', async () => {
    await expect(
      shareCsvExportFiles(files, {
        canShare: () => false,
        share: vi.fn(),
      }),
    ).resolves.toBe('unsupported');
  });
});
