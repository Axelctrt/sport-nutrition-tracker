import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DashboardQuickActions } from '@/features/dashboard/components/DashboardQuickActions';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

const activeWorkout: ActiveWorkoutSummary = {
  session: createEntity({
    date: '2026-06-25',
    status: 'inProgress',
    startedAt: '2026-06-25T16:00:00.000Z',
    sourceTemplateNameSnapshot: 'Haut du corps',
  }, 'session-current'),
  exerciseCount: 5,
};

const stepsEntry = createEntity<DailySteps>({
  date: '2026-06-25',
  totalSteps: 4200,
  source: 'manual' as const,
}, 'steps-current');

const weightEntry = createEntity<WeightEntry>({
  date: '2026-06-25',
  weightKg: 60.2,
  note: '',
}, 'weight-current');

function renderActions(overrides?: Partial<React.ComponentProps<typeof DashboardQuickActions>>) {
  const props: React.ComponentProps<typeof DashboardQuickActions> = {
    date: '2026-06-25',
    totalSteps: 4200,
    stepsEntry,
    weightKg: 60.2,
    weightEntry,
    onSaveWeight: vi.fn().mockResolvedValue(undefined),
    onSaveSteps: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <DashboardQuickActions {...props} />
    </MemoryRouter>,
  );

  return props;
}

describe('DashboardQuickActions', () => {
  it('expose les six actions fréquentes sans route pour les saisies locales', () => {
    renderActions();

    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Ajouter un aliment' })).toHaveAttribute(
      'href',
      '/food/add?date=2026-06-25&slot=snacks',
    );
    expect(screen.getByRole('link', { name: 'Scanner un produit' })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-06-25&slot=snacks',
    );
    expect(screen.getByRole('button', { name: 'Saisir les pas' })).not.toHaveAttribute('href');
    expect(screen.getByRole('button', { name: 'Saisir le poids' })).not.toHaveAttribute('href');
    expect(screen.getByRole('link', { name: 'Démarrer une séance' })).toHaveAttribute(
      'href',
      '/strength/sessions',
    );
  });

  it('ouvre la saisie des pas dans une boîte de dialogue et enregistre sans navigation', async () => {
    const user = userEvent.setup();
    const onSaveSteps = vi.fn().mockResolvedValue(undefined);
    renderActions({ onSaveSteps });

    await user.click(screen.getByRole('button', { name: 'Saisir les pas' }));

    expect(screen.getByRole('dialog', { name: 'Saisir les pas' })).toBeInTheDocument();
    const input = screen.getByRole('spinbutton', { name: /Pas totaux de la journée/ });
    expect(input).toHaveValue(4200);

    await user.clear(input);
    await user.type(input, '6500');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(onSaveSteps).toHaveBeenCalledWith({
        date: '2026-06-25',
        totalSteps: 6500,
        source: 'manual',
      });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pas enregistrés');
  });

  it('ouvre la saisie du poids dans une boîte de dialogue et conserve le poids du jour', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Saisir le poids' }));

    expect(screen.getByRole('dialog', { name: 'Saisir le poids' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Poids en kilogrammes/ })).toHaveValue(60.2);
    expect(screen.getByText('60,2 kg sont déjà enregistrés aujourd’hui.')).toBeInTheDocument();
  });

  it('remplace le démarrage par la reprise directe lorsqu’une séance existe', () => {
    renderActions({ activeWorkout });

    expect(screen.getByRole('link', { name: 'Reprendre la séance' })).toHaveAttribute(
      'href',
      '/strength/sessions/session-current',
    );
  });
});
