import gatewaySource from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts?raw';
import panelSource from '@/features/friends/components/SocialActivityFeedPanel.tsx?raw';
import { createSocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';

describe('social activity feed runtime readiness 0.29.0 A7', () => {
  it('expose les routes cloud paginées et le détail à la demande', () => {
    const gateway = createSocialActivityFeedCloudGateway({
      fetcher: vi.fn<typeof fetch>(),
    });
    expect(gateway.listPage).toBeTypeOf('function');
    expect(gateway.readDetail).toBeTypeOf('function');

    expect(gatewaySource).toContain('/api/social-activity-feed');
    expect(gatewaySource).toContain('/api/social-activity-snapshots/detail');
    expect(gatewaySource).toContain('authorization: `Bearer ${credentials.accessToken}`');
  });

  it('branche une interface verticale mobile-first sans exposer les identifiants métier', () => {
    expect(panelSource).toContain('max-h-[92dvh]');
    expect(panelSource).toContain('Voir le détail autorisé');
    expect(panelSource).toContain('Afficher plus d’activités');
    expect(panelSource).not.toContain('{card.sourceActivityId}');
    expect(panelSource).not.toContain('{card.recipientUserId}');
  });
});
