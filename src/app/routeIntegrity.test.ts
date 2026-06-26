import { matchPath } from 'react-router-dom';
import {
  mobileMoreNavigation,
  mobileNavigation,
  primaryNavigation,
  secondaryNavigation,
} from '@/app/navigation';
import { getRouteTitle } from '@/app/routeMetadata';
import { routePaths } from '@/app/routePaths';
import { appShellRoutes } from '@/app/router';

function samplePath(pattern: string): string {
  return pattern.replace(/:[^/]+/g, 'sample-id');
}

describe('intégrité des routes de la Release Candidate', () => {
  const registeredPatterns = appShellRoutes
    .map((route) => route.path)
    .filter((path): path is string => typeof path === 'string');

  it('ne déclare aucune route dupliquée', () => {
    expect(new Set(registeredPatterns).size).toBe(registeredPatterns.length);
    expect(new Set(Object.values(routePaths)).size).toBe(Object.values(routePaths).length);
  });

  it('enregistre toutes les destinations proposées par les navigations', () => {
    const navigationPaths = [
      ...primaryNavigation,
      ...secondaryNavigation,
      ...mobileNavigation,
      ...mobileMoreNavigation.flatMap((section) => section.items),
    ].map((item) => item.path);

    for (const navigationPath of navigationPaths) {
      expect(
        registeredPatterns.some((pattern) =>
          matchPath({ path: pattern, end: true }, navigationPath),
        ),
      ).toBe(true);
    }
  });

  it('associe un titre précis à chaque route affichée dans le shell', () => {
    const missingTitles = registeredPatterns.filter(
      (pattern) => getRouteTitle(samplePath(pattern)) === 'SportPilot',
    );

    expect(missingTitles).toEqual([]);
  });
});
