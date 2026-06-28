import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  CsvExportFile,
  CsvExportOptions,
} from '@/infrastructure/backup/csvExportService';
import { AdvancedCsvExportPanel } from '@/features/backup/components/AdvancedCsvExportPanel';

const preparedFiles: CsvExportFile[] = [
  {
    key: 'weights',
    label: 'Poids',
    fileName:
      'sportpilot-poids-20260628-2026-05-30-2026-06-28.csv',
    content: 'date;poids\r\n',
    rowCount: 4,
  },
  {
    key: 'activities',
    label: 'Activités',
    fileName:
      'sportpilot-activites-20260628-2026-05-30-2026-06-28.csv',
    content: 'date;type\r\n',
    rowCount: 8,
  },
];

describe('AdvancedCsvExportPanel', () => {
  it('prépare la période et affiche les volumes', async () => {
    const user = userEvent.setup();
    const prepareExports = vi
      .fn<
        (options: CsvExportOptions) => Promise<CsvExportFile[]>
      >()
      .mockResolvedValue(preparedFiles);

    render(
      <AdvancedCsvExportPanel
        now={new Date('2026-06-28T12:00:00.000Z')}
        prepareExports={prepareExports}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Préparer les fichiers CSV',
      }),
    );

    expect(prepareExports).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-05-30',
        to: '2026-06-28',
      }),
    );
    expect(
      await screen.findByText('4 ligne(s) ·', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('8 ligne(s) ·', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('exige au moins un jeu de données', async () => {
    const user = userEvent.setup();
    const prepareExports = vi.fn();

    render(
      <AdvancedCsvExportPanel
        prepareExports={prepareExports}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Tout désélectionner',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Préparer les fichiers CSV',
      }),
    );

    expect(
      screen.getByText(
        'Sélectionne au moins un jeu de données à exporter.',
      ),
    ).toBeInTheDocument();
    expect(prepareExports).not.toHaveBeenCalled();
  });

  it('partage les fichiers préparés', async () => {
    const user = userEvent.setup();
    const shareMany = vi
      .fn()
      .mockResolvedValue('shared' as const);

    render(
      <AdvancedCsvExportPanel
        prepareExports={() =>
          Promise.resolve(preparedFiles)
        }
        shareMany={shareMany}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Préparer les fichiers CSV',
      }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'Partager la sélection',
      }),
    );

    expect(shareMany).toHaveBeenCalledWith(preparedFiles);
    expect(
      await screen.findByText(
        'Les fichiers ont été transmis à la feuille de partage.',
      ),
    ).toBeInTheDocument();
  });
});
