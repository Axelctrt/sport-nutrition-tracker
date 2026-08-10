import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { GoalQuickEntryOverlay } from '@/features/dashboard/components/GoalQuickEntryOverlay';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

const stepsEntry = createEntity<DailySteps>({
  date: '2026-08-04',
  totalSteps: 4_200,
  source: 'manual',
}, 'steps-current');

const weightEntry = createEntity<WeightEntry>({
  date: '2026-08-04',
  weightKg: 72.4,
  note: '',
}, 'weight-current');

const snapshot = {
  stepsEntry,
  dateWeightEntry: weightEntry,
  weight: {
    weightKg: 72.4,
  },
} as DailyTargetSnapshot;

function renderOverlay(
  action: 'steps' | 'weight',
  overrides?: Partial<React.ComponentProps<typeof GoalQuickEntryOverlay>>,
) {
  const props: React.ComponentProps<typeof GoalQuickEntryOverlay> = {
    date: '2026-08-04',
    snapshot,
    onSaveWeight: vi.fn().mockResolvedValue(undefined),
    onSaveSteps: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(
    <MemoryRouter initialEntries={[`/?action=${action}`]}>
      <ToastProvider>
        <GoalQuickEntryOverlay {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );

  return props;
}

describe('GoalQuickEntryOverlay', () => {
  it('ouvre la saisie des pas depuis le paramètre puis nettoie l’URL après succès', async () => {
    const user = userEvent.setup();
    const onSaveSteps = vi.fn().mockResolvedValue(undefined);
    renderOverlay('steps', { onSaveSteps });

    const dialog = screen.getByRole('dialog', { name: 'Saisir les pas' });
    const input = screen.getByRole('spinbutton', {
      name: /Pas totaux de la journée/,
    });
    expect(dialog).toBeInTheDocument();
    expect(input).toHaveValue(4_200);

    await user.clear(input);
    await user.type(input, '6800');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(onSaveSteps).toHaveBeenCalledWith({
        date: '2026-08-04',
        totalSteps: 6_800,
        source: 'manual',
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Pas enregistrés');
  });

  it('ouvre la saisie du poids et conserve la valeur existante', async () => {
    const user = userEvent.setup();
    const onSaveWeight = vi.fn().mockResolvedValue(undefined);
    renderOverlay('weight', { onSaveWeight });

    expect(
      screen.getByRole('dialog', { name: 'Ajouter une pesée' }),
    ).toBeInTheDocument();
    const input = screen.getByRole('spinbutton', {
      name: /Poids en kilogrammes/,
    });
    expect(input).toHaveValue(72.4);

    await user.clear(input);
    await user.type(input, '71.9');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(onSaveWeight).toHaveBeenCalledWith({
        date: '2026-08-04',
        weightKg: 71.9,
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Poids enregistré');
  });

  it('garde une erreur unique sur place sans fermer la saisie', async () => {
    const user = userEvent.setup();
    const onSaveSteps = vi.fn().mockRejectedValue(new Error('Écriture impossible'));
    renderOverlay('steps', { onSaveSteps });

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaveSteps).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Saisir les pas' })).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Écriture impossible');
  });
});
