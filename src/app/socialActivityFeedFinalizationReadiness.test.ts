import serverSource from '../../functions/_shared/socialActivitySnapshots.js?raw';
import cloudFeedSource from '@/domain/friends/socialActivityCloudFeed.ts?raw';
import feedCardSource from '@/features/friends/components/SocialActivityFeedCard.tsx?raw';
import panelSource from '@/features/friends/components/SocialActivityFeedPanel.tsx?raw';
import gatewaySource from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts?raw';

describe('social activity feed finalization readiness 0.29.0 A22', () => {
  it('stabilise l’ordre, la déduplication et les réponses concurrentes', () => {
    expect(cloudFeedSource).toContain('normalizeSocialActivityFeedCards');
    expect(cloudFeedSource).toContain('compareSocialActivityFeedCards');
    expect(panelSource).toContain('feedRequestSequenceRef');
    expect(panelSource).toContain('loadMoreInFlightRef');
    expect(serverSource).toContain('ORDER BY sort_time DESC, s.created_at DESC, s.snapshot_id DESC');
  });

  it('préserve la lecture et isole les comptes sans mettre le fil en cache', () => {
    expect(panelSource).toContain('pendingScrollAnchorRef');
    expect(panelSource).toContain('activeRecipientRef');
    expect(panelSource).toContain('Réessayer');
    expect(feedCardSource).toContain('data-social-feed-card-id');
    expect(gatewaySource).toContain("cache: 'no-store'");
  });

  it('ne réintroduit aucune donnée brute dans la présentation', () => {
    expect(panelSource).not.toContain('rawActivity');
    expect(cloudFeedSource).not.toContain('personalNotes');
  });
});
