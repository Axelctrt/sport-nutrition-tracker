import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SocialActivityCloudFeedCard } from '@/domain/friends/socialActivityCloudFeed';
import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';
import { SocialActivityFeedPanel } from '@/features/friends/components/SocialActivityFeedPanel';
import type { SocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';

const card: SocialActivityCloudFeedCard = {
  contractVersion: '0.29.0-a3',
  snapshotId: 'social-activity-snapshot-v2:owner-user:strengthSession:session-1:friend-user',
  ownerUserId: 'owner-user',
  recipientUserId: 'friend-user',
  sourceKind: 'strengthSession',
  sourceActivityId: 'session-1',
  sourceRevision: 'revision-1',
  createdAt: '2026-07-07T18:00:00.000Z',
  updatedAt: '2026-07-07T18:00:00.000Z',
  state: 'active',
  visibility: 'detailed',
  family: 'strength',
  activityType: 'strengthTraining',
  title: 'Push du mardi',
  occurredOn: '2026-07-07',
  occurredTime: '18:00',
  allowedFields: {
    common: ['activityType', 'title', 'date', 'time', 'duration'],
    cardio: [],
    strength: ['exercises', 'sets', 'repetitions'],
  },
  summary: {
    durationMinutes: 62,
    exerciseCount: 1,
  },
  detailAvailable: true,
  ownerProfile: {
    userId: 'owner-user',
    handle: 'lea.fit',
    displayName: 'Léa Fit',
  },
};

const detail: ActiveSocialActivitySnapshot = {
  ...card,
  detail: {
    family: 'strength',
    sessionName: 'Push du mardi',
    exercises: [{
      name: 'Développé couché',
      sets: [
        { setNumber: 1, repetitions: 10 },
        { setNumber: 2, repetitions: 8 },
      ],
    }],
  },
};

function gateway(overrides: Partial<SocialActivityFeedCloudGateway> = {}): SocialActivityFeedCloudGateway {
  return {
    listPage: vi.fn(async () => ({ items: [card] })),
    readDetail: vi.fn(async () => detail),
    ...overrides,
  };
}

const getCredentials = () => ({ userId: 'friend-user', accessToken: 'token' });

describe('SocialActivityFeedPanel', () => {
  it('charge les cartes cloud et ouvre un détail vertical sans inventer les charges', async () => {
    const user = userEvent.setup();
    const feedGateway = gateway();
    render(<SocialActivityFeedPanel gateway={feedGateway} getCredentials={getCredentials} isOnline={() => true} />);

    expect(await screen.findByText('Léa Fit')).toBeInTheDocument();
    expect(screen.getByText('@lea.fit')).toBeInTheDocument();
    expect(screen.getByText('Push du mardi')).toBeInTheDocument();
    expect(screen.getByText('62 min')).toBeInTheDocument();
    expect(screen.getByText('1 exercice')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Voir le détail autorisé/u }));
    expect(await screen.findByRole('dialog', { name: 'Push du mardi' })).toBeInTheDocument();
    expect(screen.getByText('Développé couché')).toBeInTheDocument();
    expect(screen.getByText(/10 répétitions/u)).toBeInTheDocument();
    expect(screen.queryByText(/kg/u)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fermer le détail' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('pagine sans dupliquer les snapshots déjà affichés', async () => {
    const user = userEvent.setup();
    const secondCard: SocialActivityCloudFeedCard = {
      ...card,
      snapshotId: 'social-activity-snapshot-v2:owner-user:activity:run-2:friend-user',
      sourceKind: 'activity',
      sourceActivityId: 'run-2',
      sourceRevision: 'revision-2',
      family: 'cardio',
      activityType: 'running',
      title: 'Footing facile',
      visibility: 'summary',
      occurredOn: '2026-07-06',
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance'],
        strength: [],
      },
      summary: { durationMinutes: 35, distanceKm: 5.8 },
      detailAvailable: false,
    };
    const listPage = vi.fn()
      .mockResolvedValueOnce({ items: [card], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ items: [card, secondCard] });
    render(<SocialActivityFeedPanel gateway={gateway({ listPage })} getCredentials={getCredentials} isOnline={() => true} />);

    await screen.findByText('Push du mardi');
    await user.click(screen.getByRole('button', { name: 'Afficher plus d’activités' }));

    expect(await screen.findByText('Footing facile')).toBeInTheDocument();
    expect(screen.getAllByText('Push du mardi')).toHaveLength(1);
    expect(listPage).toHaveBeenLastCalledWith(getCredentials(), { cursor: 'cursor-2', limit: 10 });
  });

  it('affiche un état hors ligne sans appeler le serveur', async () => {
    const feedGateway = gateway();
    render(<SocialActivityFeedPanel gateway={feedGateway} getCredentials={getCredentials} isOnline={() => false} />);

    expect(await screen.findByText('Mode hors ligne')).toBeInTheDocument();
    expect(feedGateway.listPage).not.toHaveBeenCalled();
  });
});
