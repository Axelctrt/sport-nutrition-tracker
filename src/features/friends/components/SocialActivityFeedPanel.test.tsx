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
    readReadiness: vi.fn(async () => ({
      status: 'ready' as const,
      contractVersion: '0.29.0-a3',
      authVerified: true,
      databaseBound: true,
      requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
      missingPrerequisites: [],
      missingActivitySchema: [],
      checkedAt: '2026-07-07T18:00:00.000Z',
    })),
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
    expect(screen.getByText('1 h 02')).toBeInTheDocument();
    expect(screen.getByText('1 exercice')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ouvrir l’activité/u }));
    expect(await screen.findByRole('dialog', { name: 'Push du mardi' })).toBeInTheDocument();
    expect(screen.getByText('Développé couché')).toBeInTheDocument();
    expect(screen.getByText(/10 répétitions/u)).toBeInTheDocument();
    expect(screen.queryByText(/kg/u)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fermer l’activité' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('présente correctement les charges, le poids du corps, le RPE et le repos autorisés', async () => {
    const user = userEvent.setup();
    const strengthDetail: ActiveSocialActivitySnapshot = {
      ...detail,
      allowedFields: {
        common: ['activityType', 'title', 'date', 'time', 'duration'],
        cardio: [],
        strength: ['exercises', 'sets', 'repetitions', 'loads', 'bodyweight', 'rpe', 'restTimes'],
      },
      detail: {
        family: 'strength',
        sessionName: 'Push du mardi',
        exercises: [{
          name: 'Tractions puis développé couché',
          trackingMode: 'loadRepetitions',
          sets: [
            { setNumber: 1, repetitions: 9, loadUnit: 'bodyweight' },
            {
              setNumber: 2,
              repetitions: 10,
              loadKg: 60,
              loadUnit: 'kg',
              type: 'working',
              rpe: 8,
              restSeconds: 90,
            },
          ],
        }],
      },
    };
    render(
      <SocialActivityFeedPanel
        gateway={gateway({ readDetail: vi.fn(async () => strengthDetail) })}
        getCredentials={getCredentials}
        isOnline={() => true}
      />,
    );

    const openButton = await screen.findByRole('button', { name: /Ouvrir l’activité/u });
    await user.click(openButton);

    expect(await screen.findByText('Poids du corps × 9')).toBeInTheDocument();
    expect(screen.getByText('60 kg × 10')).toBeInTheDocument();
    expect(screen.getByText('Travail')).toBeInTheDocument();
    expect(screen.getByText('RPE 8 · 1:30 de repos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer l’activité' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(openButton).toHaveFocus();
  });

  it('affiche les libellés cardio et un graphique uniquement lorsque les points autorisés existent', async () => {
    const user = userEvent.setup();
    const cardioCard: SocialActivityCloudFeedCard = {
      ...card,
      snapshotId: 'social-activity-snapshot-v2:owner-user:activity:run-1:friend-user',
      sourceKind: 'activity',
      sourceActivityId: 'run-1',
      family: 'cardio',
      activityType: 'running',
      title: 'Footing vallonné',
      summary: {
        durationMinutes: 45,
        distanceKm: 8.2,
        paceMinutesPerKm: 5.49,
        elevationGainMeters: 120,
      },
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance', 'pace', 'sessionType', 'terrain', 'paceSeries', 'chart'],
        strength: [],
      },
    };
    const cardioDetail: ActiveSocialActivitySnapshot = {
      ...cardioCard,
      detail: {
        family: 'cardio',
        sessionType: 'easy',
        terrainType: 'trail',
        chart: {
          metric: 'pace',
          points: [
            { elapsedSeconds: 0, value: 5.5 },
            { elapsedSeconds: 900, value: 5.25 },
            { elapsedSeconds: 1800, value: 5.75 },
          ],
        },
      },
    };
    render(
      <SocialActivityFeedPanel
        gateway={gateway({
          listPage: vi.fn(async () => ({ items: [cardioCard] })),
          readDetail: vi.fn(async () => cardioDetail),
        })}
        getCredentials={getCredentials}
        isOnline={() => true}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Ouvrir l’activité/u }));

    expect(await screen.findByText('Footing')).toBeInTheDocument();
    expect(screen.getByText('Trail / sentier')).toBeInTheDocument();
    expect(screen.getByLabelText('Évolution de l’allure, 3 points')).toBeInTheDocument();
    expect(screen.getByText('15:00 : 5\'15"/km')).toBeInTheDocument();
  });

  it('ouvre aussi une activité partagée en résumé et explique la portée limitée', async () => {
    const user = userEvent.setup();
    const summaryCard: SocialActivityCloudFeedCard = {
      ...card,
      visibility: 'summary',
      detailAvailable: false,
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: [],
        strength: ['exerciseCount'],
      },
    };
    const summaryDetail: ActiveSocialActivitySnapshot = {
      ...summaryCard,
      state: 'active',
    };
    render(
      <SocialActivityFeedPanel
        gateway={gateway({
          listPage: vi.fn(async () => ({ items: [summaryCard] })),
          readDetail: vi.fn(async () => summaryDetail),
        })}
        getCredentials={getCredentials}
        isOnline={() => true}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Ouvrir l’activité/u }));

    expect(await screen.findByRole('dialog', { name: 'Push du mardi' })).toBeInTheDocument();
    expect(screen.getByText('Résumé uniquement')).toBeInTheDocument();
    expect(screen.getByText('Ton ami partage uniquement le résumé affiché ci-dessus.')).toBeInTheDocument();
    expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
  });

  it('refuse un détail qui ne correspond pas à la carte sélectionnée', async () => {
    const user = userEvent.setup();
    render(
      <SocialActivityFeedPanel
        gateway={gateway({
          readDetail: vi.fn(async () => ({ ...detail, ownerUserId: 'another-owner' })),
        })}
        getCredentials={getCredentials}
        isOnline={() => true}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Ouvrir l’activité/u }));

    expect(await screen.findByText('Activité indisponible')).toBeInTheDocument();
    expect(screen.getByText('La réponse reçue ne correspond pas à l’activité sélectionnée.')).toBeInTheDocument();
    expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
  });

  it('ne rouvre pas la fiche lorsqu’une réponse tardive arrive après sa fermeture', async () => {
    const user = userEvent.setup();
    let resolveDetail: ((value: ActiveSocialActivitySnapshot) => void) | undefined;
    const pendingDetail = new Promise<ActiveSocialActivitySnapshot>((resolve) => {
      resolveDetail = resolve;
    });
    render(
      <SocialActivityFeedPanel
        gateway={gateway({ readDetail: vi.fn(async () => pendingDetail) })}
        getCredentials={getCredentials}
        isOnline={() => true}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Ouvrir l’activité/u }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fermer l’activité' }));
    resolveDetail?.(detail);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
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
