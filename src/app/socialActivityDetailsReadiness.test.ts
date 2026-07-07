import cardioDetailSource from '@/features/friends/components/SocialCardioActivityDetail.tsx?raw';
import chartSource from '@/features/friends/components/SocialActivityDetailChart.tsx?raw';
import dialogSource from '@/features/friends/components/SocialActivityDetailDialog.tsx?raw';
import feedCardSource from '@/features/friends/components/SocialActivityFeedCard.tsx?raw';
import strengthDetailSource from '@/features/friends/components/SocialStrengthActivityDetail.tsx?raw';
import presentationSource from '@/features/friends/components/socialActivityFeedPresentation.ts?raw';

describe('social activity details readiness 0.29.0 A8', () => {
  it('rend les graphiques réellement fournis sans message de simulation', () => {
    expect(chartSource).toContain('ResponsiveContainer');
    expect(chartSource).toContain('touchAction: \'pan-y\'');
    expect(cardioDetailSource).toContain('presentSocialActivityChart');
    expect(presentationSource).toContain('if (detail.chart?.points.length)');
    expect(presentationSource).toContain('if (detail.paceSeries?.length)');
    expect(cardioDetailSource).not.toContain('sera finalisée');
  });

  it('présente les séances de musculation verticalement avec les unités autorisées', () => {
    expect(strengthDetailSource).toContain('grid-cols-[2.5rem_minmax(0,1fr)]');
    expect(presentationSource).toContain('Poids du corps ×');
    expect(presentationSource).toContain('Assistance ${formatNumber(set.loadKg)} kg');
    expect(strengthDetailSource).toContain('strengthTrackingModeLabel');
  });

  it('conserve des zones tactiles et une feuille mobile sécurisée', () => {
    expect(feedCardSource).toContain('min-h-11 w-full');
    expect(dialogSource).toContain('sticky top-0');
    expect(dialogSource).toContain('max-h-[92dvh]');
    expect(dialogSource).toContain('closeButtonRef.current?.focus()');
    expect(dialogSource).toContain('previouslyFocusedElementRef.current?.focus()');
  });
});
