import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  ProgressReport,
  ProgressReportOptions,
} from '@/application/reports/progressReportService';
import { ProgressReportsPage } from '@/features/progress-reports/pages/ProgressReportsPage';

const report: ProgressReport = {
  generatedAt: '2026-06-28T14:00:00.000Z',
  period: {
    from: '2026-05-30',
    to: '2026-06-28',
    dayCount: 30,
  },
  sections: ['weight', 'activities'],
  weight: {
    entryCount: 3,
    averageWeightKg: 79,
    changeKg: -1.5,
  },
  activities: {
    sessionCount: 8,
    durationMinutes: 420,
    estimatedCaloriesKcal: 3500,
    runningDistanceKm: 42,
    cyclingDistanceKm: 0,
    swimmingDistanceMeters: 2000,
    breakdown: [],
  },
};

describe('ProgressReportsPage', () => {
  it('crée un rapport de 30 jours et affiche l’aperçu', async () => {
    const user = userEvent.setup();
    const createReport = vi
      .fn<
        (
          options: ProgressReportOptions,
        ) => Promise<ProgressReport>
      >()
      .mockResolvedValue(report);

    render(
      <ProgressReportsPage
        now={new Date('2026-06-28T12:00:00.000Z')}
        createReport={createReport}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Créer le rapport',
      }),
    );

    expect(createReport).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-05-30',
        to: '2026-06-28',
        includeIdentity: false,
      }),
    );

    expect(
      await screen.findByText('Rapport SportPilot'),
    ).toBeInTheDocument();
    expect(screen.getByText('-1,5 kg')).toBeInTheDocument();
    expect(screen.getByText('42 km')).toBeInTheDocument();
  });

  it('permet de limiter les rubriques et d’inclure l’identité', async () => {
    const user = userEvent.setup();
    const createReport = vi
      .fn()
      .mockResolvedValue(report);

    render(
      <ProgressReportsPage
        createReport={createReport}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Tout désélectionner',
      }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: /Poids/,
      }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: /Inclure mon prénom/,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Créer le rapport',
      }),
    );

    expect(createReport).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: ['weight'],
        includeIdentity: true,
      }),
    );
  });

  it('copie, télécharge, partage et imprime le rapport', async () => {
    const user = userEvent.setup();
    const downloadReport = vi.fn();
    const copyReport = vi.fn().mockResolvedValue('done');
    const shareReport = vi.fn().mockResolvedValue('done');
    const printReport = vi.fn().mockReturnValue('done');

    render(
      <ProgressReportsPage
        createReport={() => Promise.resolve(report)}
        downloadReport={downloadReport}
        copyReport={copyReport}
        shareReport={shareReport}
        printReport={printReport}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Créer le rapport',
      }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Copier',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Télécharger',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Partager',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Imprimer',
      }),
    );

    expect(copyReport).toHaveBeenCalledWith(report);
    expect(downloadReport).toHaveBeenCalledWith(report);
    expect(shareReport).toHaveBeenCalledWith(report);
    expect(printReport).toHaveBeenCalledTimes(1);
  });
});
