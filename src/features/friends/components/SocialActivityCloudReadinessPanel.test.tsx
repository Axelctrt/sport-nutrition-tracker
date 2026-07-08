import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SocialActivityCloudReadinessPanel } from '@/features/friends/components/SocialActivityCloudReadinessPanel';
import type { SocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';

const credentials = { userId: 'friend-user', accessToken: 'token' };

function gateway(
  status: 'ready' | 'migrationRequired' | 'prerequisiteMissing' = 'ready',
): SocialActivityFeedCloudGateway {
  return {
    listPage: vi.fn(async () => ({ items: [] })),
    readDetail: vi.fn(async () => { throw new Error('Détail non attendu.'); }),
    readReadiness: vi.fn(async () => ({
      status,
      contractVersion: '0.29.0-a3',
      authVerified: true,
      databaseBound: true,
      requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
      missingPrerequisites: status === 'prerequisiteMissing' ? ['social_friendships'] : [],
      missingActivitySchema: status === 'migrationRequired' ? ['social_activity_snapshots'] : [],
      checkedAt: '2026-07-07T18:00:00.000Z',
    })),
  };
}

describe('SocialActivityCloudReadinessPanel', () => {
  it('confirme une activation complète et permet une nouvelle vérification', async () => {
    const user = userEvent.setup();
    const cloudGateway = gateway('ready');
    render(
      <SocialActivityCloudReadinessPanel
        gateway={cloudGateway}
        getCredentials={() => credentials}
        isOnline={() => true}
      />,
    );

    expect(await screen.findByText('Cloud social prêt')).toBeInTheDocument();
    expect(screen.getByText('Activation validée')).toBeInTheDocument();
    expect(screen.getByText('Contrat 0.29.0-a3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(cloudGateway.readReadiness).toHaveBeenCalledTimes(2);
  });

  it('signale explicitement la migration D1 attendue', async () => {
    render(
      <SocialActivityCloudReadinessPanel
        gateway={gateway('migrationRequired')}
        getCredentials={() => credentials}
        isOnline={() => true}
      />,
    );

    expect(await screen.findByText('Migration D1 requise')).toBeInTheDocument();
    expect(screen.getByText(/0001_social_activity_snapshots_0_29_0\.sql/u)).toBeInTheDocument();
  });

  it('distingue une connexion manquante et le mode hors ligne', async () => {
    const { rerender } = render(
      <SocialActivityCloudReadinessPanel
        gateway={gateway()}
        getCredentials={() => undefined}
        isOnline={() => true}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Connexion requise' })).toBeInTheDocument();

    rerender(
      <SocialActivityCloudReadinessPanel
        gateway={gateway()}
        getCredentials={() => credentials}
        isOnline={() => false}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Vérification hors ligne' })).toBeInTheDocument();
  });
});
