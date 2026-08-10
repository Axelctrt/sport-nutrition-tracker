import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import { DailyInputsPanel } from '@/features/dashboard/components/DailyInputsPanel';
import { ToastProvider } from '@/shared/toast/ToastProvider';

afterEach(cleanup);

const snapshot = {
  date: '2026-08-10',
  weight: { weightKg: 72.4 },
  dateWeightEntry: undefined,
  stepsEntry: undefined,
} as DailyTargetSnapshot;

function renderPanel(overrides?: Partial<React.ComponentProps<typeof DailyInputsPanel>>) {
  const props: React.ComponentProps<typeof DailyInputsPanel> = {
    snapshot,
    onSaveWeight: vi.fn().mockResolvedValue(undefined),
    onSaveSteps: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(
    <ToastProvider>
      <DailyInputsPanel {...props} />
    </ToastProvider>,
  );

  return props;
}

describe('DailyInputsPanel', () => {
  it('reste silencieux avant toute action puis affiche un seul succès local pour le poids', async () => {
    const user = userEvent.setup();
    const onSaveWeight = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onSaveWeight });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer la pesée' }));

    await waitFor(() => {
      expect(onSaveWeight).toHaveBeenCalledWith({
        date: '2026-08-10',
        weightKg: 72.4,
      });
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Poids enregistré');
  });

  it('affiche une seule erreur locale et conserve la saisie des pas', async () => {
    const user = userEvent.setup();
    const onSaveSteps = vi.fn().mockRejectedValue(new Error('Stockage indisponible'));
    renderPanel({ onSaveSteps });

    const input = screen.getByRole('spinbutton', { name: /Pas totaux de la journée/ });
    await user.clear(input);
    await user.type(input, '7400');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les pas' }));

    await waitFor(() => {
      expect(onSaveSteps).toHaveBeenCalledWith({
        date: '2026-08-10',
        totalSteps: 7400,
        source: 'manual',
      });
    });
    expect(input).toHaveValue(7400);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Stockage indisponible');
  });
});
