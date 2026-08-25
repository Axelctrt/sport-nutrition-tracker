import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import type { WeightEntry } from '@/domain/models/weight';
import { WeightPage } from '@/features/weight/pages/WeightPage';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const mocks = vi.hoisted(() => ({
  recalculateTargets: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  useWeightHistory: vi.fn(),
}));

vi.mock('@/application/daily/referenceWeightRecalculationService', () => ({
  recalculateTargetsAfterWeightChange: mocks.recalculateTargets,
}));

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({
    profile: {
      id: 'profile-1',
      initialWeightKg: 61,
    },
  }),
}));

vi.mock('@/features/weight/hooks/useWeightHistory', () => ({
  useWeightHistory: mocks.useWeightHistory,
}));

vi.mock('@/features/weight/components/WeightHistoryChart', () => ({
  WeightHistoryChart: () => <div>Graphique du poids</div>,
}));

vi.mock('@/features/weight/components/WeightSummary', () => ({
  WeightSummary: () => <div>Résumé du poids</div>,
}));

const entry: WeightEntry = {
  id: 'weight-1',
  date: '2026-06-25',
  weightKg: 61,
  note: 'Pesée au réveil',
  createdAt: '2026-06-25T08:00:00.000Z',
  updatedAt: '2026-06-25T08:00:00.000Z',
};

beforeEach(() => {
  mocks.recalculateTargets.mockResolvedValue([]);
  mocks.remove.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue({
    ...entry,
    weightKg: 61.4,
    updatedAt: '2026-06-30T12:00:00.000Z',
  });
  mocks.useWeightHistory.mockReturnValue({
    status: 'ready',
    entries: [entry],
    errorMessage: undefined,
    refresh: vi.fn(),
    save: mocks.save,
    remove: mocks.remove,
    getApplicableWeight: () => ({
      weightKg: entry.weightKg,
      source: 'entry',
      entry,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WeightPage', () => {
  it('affiche le résultat dans la page sans toast de succès redondant', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/weight?date=2026-06-25']}>
        <ToastProvider>
          <WeightPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    const weightInput = screen.getByRole('spinbutton', {
      name: /Poids en kilogrammes/,
    });
    await user.clear(weightInput);
    await user.type(weightInput, '61.4');
    await user.click(screen.getByRole('button', { name: 'Mettre à jour la pesée' }));

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith({
        date: '2026-06-25',
        weightKg: 61.4,
        note: 'Pesée au réveil',
        provenance: 'userMeasurement',
      });
    });
    expect(mocks.recalculateTargets).toHaveBeenCalledWith(
      '2026-06-25',
      expect.objectContaining({ id: 'profile-1' }),
    );
    expect(await screen.findByText('Historique mis à jour')).toBeInTheDocument();
    expect(screen.getByText(/La pesée du 25 juin 2026 a été mise à jour/)).toBeInTheDocument();
    expect(screen.queryByText('Pesée mise à jour')).not.toBeInTheDocument();
  });
});
