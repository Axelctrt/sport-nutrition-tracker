import type { RouteObject } from 'react-router-dom';
import { LazySyncPrototypePage } from '@/app/LazyRoutePages';
import { routePaths } from '@/app/routePaths';
import type { SyncPrototypeEnvironment } from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export function getSyncPrototypeRoutes(
  _environment: SyncPrototypeEnvironment = import.meta.env,
): RouteObject[] {
  return [
    {
      path: routePaths.syncPrototype,
      element: <LazySyncPrototypePage />,
    },
  ];
}
