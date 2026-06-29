import {
  mobileMoreNavigation,
  mobileNavigation,
  primaryNavigation,
  secondaryNavigation,
} from '@/app/navigation';
import { routePaths } from '@/app/routePaths';
import { getSyncPrototypeRoutes } from '@/app/syncPrototypeRoutes';

describe('route expérimentale Dexie Cloud', () => {
  it('reste absente lorsque le feature flag est désactivé', () => {
    expect(
      getSyncPrototypeRoutes({
        VITE_ENABLE_SYNC_PROTOTYPE: 'false',
      }),
    ).toEqual([]);
  });

  it('reste absente de toutes les navigations', () => {
    const navigationPaths = [
      ...primaryNavigation,
      ...secondaryNavigation,
      ...mobileNavigation,
      ...mobileMoreNavigation.flatMap((section) => section.items),
    ].map((item) => item.path);

    expect(navigationPaths).not.toContain(routePaths.syncPrototype);
  });

  it('est enregistrée uniquement avec une configuration sûre', () => {
    const routes = getSyncPrototypeRoutes({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_DEXIE_CLOUD_DATABASE_URL:
        'https://sportpilot-prototype.dexie.cloud',
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe(routePaths.syncPrototype);
  });
});
