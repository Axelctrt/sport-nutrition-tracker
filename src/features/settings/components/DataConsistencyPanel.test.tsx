import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataConsistencyPanel } from '@/features/settings/components/DataConsistencyPanel';
import type {
  DataConsistencyRepairResult,
  DataConsistencyReport,
} from '@/infrastructure/database/dataConsistencyService';

function createReport(
  overrides: Partial<DataConsistencyReport> = {},
): DataConsistencyReport {
  return {
    checkedAt: '2026-06-28T15:00:00.000Z',
    status: 'healthy',
    totalRecordCount: 42,
    issueCount: 0,
    repairableIssueCount: 0,
    issues: [],
    ...overrides,
  };
}

describe('DataConsistencyPanel', () => {
  it('affiche un contrôle sain et permet de le relancer', async () => {
    const auditConsistency = vi
      .fn()
      .mockResolvedValue(createReport());

    render(
      <DataConsistencyPanel
        auditConsistency={auditConsistency}
      />,
    );

    expect(
      await screen.findByText(
        'Relations de données cohérentes',
      ),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Revérifier',
      }),
    );

    await waitFor(() => {
      expect(auditConsistency).toHaveBeenCalledTimes(2);
    });
  });

  it('crée la sauvegarde avant la réparation', async () => {
    const user = userEvent.setup();
    const before = createReport({
      status: 'error',
      issueCount: 1,
      repairableIssueCount: 1,
      issues: [
        {
          id: 'orphan:strengthSets:set-1',
          code: 'orphan-strength-set-exercise',
          severity: 'error',
          tableName: 'strengthSets',
          recordId: 'set-1',
          message: 'Une série est orpheline.',
          repairable: true,
        },
      ],
    });
    const after = createReport();
    const repairResult: DataConsistencyRepairResult = {
      repairedRecordCount: 1,
      before,
      after,
    };
    const createSafetyBackup = vi
      .fn()
      .mockResolvedValue(undefined);
    const repairConsistency = vi
      .fn()
      .mockResolvedValue(repairResult);

    render(
      <DataConsistencyPanel
        auditConsistency={() => Promise.resolve(before)}
        createSafetyBackup={createSafetyBackup}
        repairConsistency={repairConsistency}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Réparer les orphelins sûrs',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Sauvegarder et réparer',
      }),
    );

    await screen.findByText('Réparation terminée');

    expect(createSafetyBackup).toHaveBeenCalledTimes(1);
    expect(repairConsistency).toHaveBeenCalledTimes(1);
    expect(
      createSafetyBackup.mock.invocationCallOrder[0],
    ).toBeLessThan(
      repairConsistency.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('télécharge le diagnostic JSON', async () => {
    const user = userEvent.setup();
    const downloadDiagnostic = vi.fn();
    const report = createReport();

    render(
      <DataConsistencyPanel
        auditConsistency={() => Promise.resolve(report)}
        downloadDiagnostic={downloadDiagnostic}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Diagnostic',
      }),
    );

    expect(downloadDiagnostic).toHaveBeenCalledWith(
      expect.stringContaining(
        'sportpilot-data-consistency-report',
      ),
      'sportpilot-coherence-donnees-2026-06-28T15-00-00-000Z.json',
      'application/json',
    );
  });
});
