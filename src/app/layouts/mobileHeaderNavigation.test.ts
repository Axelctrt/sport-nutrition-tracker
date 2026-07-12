import {
  mobileHeaderBackDestination,
  resolveMobileHeaderBackAction,
} from '@/app/layouts/mobileHeaderNavigation';

describe('mobileHeaderNavigation', () => {
  it('utilise l’historique réel lorsqu’une entrée applicative précédente existe', () => {
    expect(resolveMobileHeaderBackAction({
      pathname: '/food/barcode-scanner',
      key: 'scanner-entry',
      state: {
        foodJournalReturn: {
          path: '/food?date=2026-07-12',
          scrollKey: 'journal-key',
        },
      },
    })).toEqual({ kind: 'history' });
  });

  it('restaure un contexte métier lorsque la page est ouverte sans historique exploitable', () => {
    expect(resolveMobileHeaderBackAction({
      pathname: '/food/entries/entry-1/edit',
      key: 'default',
      state: {
        foodJournalReturn: {
          path: '/food?date=2026-07-12',
          scrollKey: 'journal-key',
        },
      },
    })).toEqual({
      kind: 'link',
      to: '/food?date=2026-07-12',
      state: {
        scroll: 'restore',
        restoreScrollKey: 'journal-key',
      },
    });
  });

  it('honore une destination explicite et refuse les chemins externes', () => {
    expect(resolveMobileHeaderBackAction({
      pathname: '/strength/sessions/session-1',
      key: 'session-entry',
      state: {
        mobileHeaderBack: {
          path: '/strength/planning?date=2026-07-12',
          state: { selectedSessionId: 'session-1' },
        },
      },
    })).toEqual({
      kind: 'link',
      to: '/strength/planning?date=2026-07-12',
      state: { selectedSessionId: 'session-1' },
    });

    expect(resolveMobileHeaderBackAction({
      pathname: '/food/add',
      key: 'default',
      state: { mobileHeaderBack: { path: '//example.com' } },
    })).toEqual({ kind: 'link', to: '/food' });
  });

  it('conserve les replis par domaine pour les accès directs', () => {
    expect(mobileHeaderBackDestination('/weight')).toBe('/progression');
    expect(mobileHeaderBackDestination('/weekly-review')).toBe('/progression');
    expect(mobileHeaderBackDestination('/settings/advanced')).toBe('/settings');
    expect(mobileHeaderBackDestination('/strength/templates/new')).toBe('/activities');
  });
});
