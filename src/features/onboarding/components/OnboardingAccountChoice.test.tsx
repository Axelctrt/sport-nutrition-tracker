import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingAccountChoice } from '@/features/onboarding/components/OnboardingAccountChoice';
import type { SyncPrototypeClient, SyncPrototypeSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';

function createSnapshot(overrides: Partial<SyncPrototypeSnapshot> = {}): SyncPrototypeSnapshot {
  return {
    account: { isLoggedIn: false, isLoading: false },
    sync: { status: 'disconnected', phase: 'initial' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: { databaseName: 'test-cloud', databaseVersion: 1, visibleWeightCount: 0, deletedWeightCount: 0 },
    ...overrides,
  };
}

function createClient(initialSnapshot = createSnapshot()) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const client: SyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async (email: string) => {
      snapshot = { ...snapshot, interaction: { type: 'otp', title: 'Code de connexion', alerts: [{ type: 'info', messageCode: 'OTP_SENT', message: 'Code envoyé', messageParams: { email } }], submitLabel: 'Valider le code', cancelLabel: 'Annuler' } };
      notify();
    }),
    submitInteraction: vi.fn((params: Readonly<Record<string, string>>) => {
      if (params.otp) {
        const { interaction: _interaction, ...nextSnapshot } = snapshot;
        snapshot = { ...nextSnapshot, account: { isLoggedIn: true, isLoading: false, email: 'maya@example.com', userId: 'maya@example.com' } };
        notify();
      }
    }),
    cancelInteraction: vi.fn(() => { const { interaction: _interaction, ...nextSnapshot } = snapshot; snapshot = nextSnapshot; notify(); }),
    logout: vi.fn(async () => { snapshot = createSnapshot(); notify(); }),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({ localWeightCount: 0, cloudWeightCount: 0, localDeletionCount: 0, cloudDeletionCount: 0, differingEntityCount: 0 })),
    syncRealWeights: vi.fn(async () => ({ localWeightCount: 0, cloudWeightCount: 0, localDeletionCount: 0, cloudDeletionCount: 0, differingEntityCount: 0, uploadedWeights: 0, downloadedWeights: 0, removedLocalWeights: 0, removedCloudWeights: 0, uploadedDeletionRecords: 0, downloadedDeletionRecords: 0, completedAt: '2026-07-01T08:00:00.000Z' })),
    saveWeight: vi.fn(async () => { throw new Error('not used'); }),
    deleteWeight: vi.fn(async () => undefined),
  };
  return client;
}

const baseProps = {
  onChooseLocal: vi.fn(),
  onChooseAccount: vi.fn(),
  onBackToChoice: vi.fn(),
  onContinueWithAccount: vi.fn(),
};

describe('OnboardingAccountChoice', () => {
  it('limite le premier écran aux deux choix sans formulaire', async () => {
    const onChooseLocal = vi.fn();
    const onChooseAccount = vi.fn();
    render(<OnboardingAccountChoice {...baseProps} accountEnabled client={createClient()} screen="choice" onChooseLocal={onChooseLocal} onChooseAccount={onChooseAccount} />);

    expect(screen.queryByLabelText(/Adresse e-mail/)).not.toBeInTheDocument();
    expect(screen.getByText(/Paramètres → Compte et appareils/)).toBeInTheDocument();
    expect(screen.getByText(/L’adresse e-mail sera demandée à l’étape suivante/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choisir le mode local' }));
    expect(onChooseLocal).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Connecter un compte' }));
    expect(onChooseAccount).toHaveBeenCalledTimes(1);
  });

  it('connecte le compte sur l’écran suivant par email et code', async () => {
    const user = userEvent.setup();
    const client = createClient();
    const onContinueWithAccount = vi.fn();
    render(<OnboardingAccountChoice {...baseProps} accountEnabled client={client} screen="connection" onContinueWithAccount={onContinueWithAccount} />);

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText(/Adresse e-mail/), 'maya@example.com');
    await user.click(screen.getByRole('button', { name: 'Recevoir un code' }));
    expect(await screen.findByLabelText(/Code reçu/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Code reçu/), '123456');
    await user.click(screen.getByRole('button', { name: 'Valider le code' }));
    expect(await screen.findByText(/maya@example.com/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onContinueWithAccount).toHaveBeenCalledTimes(1);
  });

  it('déconnecte le compte avant de revenir au mode local', async () => {
    const onChooseLocal = vi.fn();
    const client = createClient(createSnapshot({ account: { isLoggedIn: true, isLoading: false, email: 'local@example.com', userId: 'local@example.com' } }));
    render(<OnboardingAccountChoice {...baseProps} accountEnabled client={client} screen="choice" onChooseLocal={onChooseLocal} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choisir le mode local' }));
    await waitFor(() => expect(client.logout).toHaveBeenCalledTimes(1));
    expect(onChooseLocal).toHaveBeenCalledTimes(1);
  });
});
