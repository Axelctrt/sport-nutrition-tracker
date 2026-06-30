import {
  mobileMoreNavigation,
  mobileNavigation,
  primaryNavigation,
  secondaryNavigation,
} from '@/app/navigation';
import { routePaths } from '@/app/routePaths';
import { getSyncPrototypeRoutes } from '@/app/syncPrototypeRoutes';

describe('route de gestion du compte Dexie Cloud', () => {
  it('reste enregistrée lorsque le feature flag est désactivé', () => {
    const routes = getSyncPrototypeRoutes({
      VITE_ENABLE_SYNC_PROTOTYPE: 'false',
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe(routePaths.syncPrototype);
  });

  it('reste enregistrée lorsque la configuration est invalide', () => {
    const routes = getSyncPrototypeRoutes({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe(routePaths.syncPrototype);
  });

  it('reste absente des navigations principales', () => {
    const navigationPaths = [
      ...primaryNavigation,
      ...secondaryNavigation,
      ...mobileNavigation,
      ...mobileMoreNavigation.flatMap((section) => section.items),
    ].map((item) => item.path);

    expect(navigationPaths).not.toContain(routePaths.syncPrototype);
  });

  it('reste enregistrée avec une configuration sûre', () => {
    const routes = getSyncPrototypeRoutes({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_DEXIE_CLOUD_DATABASE_URL:
        'https://sportpilot-prototype.dexie.cloud',
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe(routePaths.syncPrototype);
  });
});
