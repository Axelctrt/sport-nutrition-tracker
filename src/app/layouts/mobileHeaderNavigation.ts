import { routePaths } from '@/app/routePaths';

export const primaryMobileRoutes = new Set<string>([
  routePaths.dashboard,
  routePaths.food,
  routePaths.activities,
  routePaths.progression,
]);

interface MobileHeaderReturnContext {
  path: string;
  scrollKey?: string;
}

interface MobileHeaderExplicitBackTarget {
  path: string;
  state?: unknown;
}

interface MobileHeaderNavigationState {
  mobileHeaderBack?: MobileHeaderExplicitBackTarget;
  foodJournalReturn?: MobileHeaderReturnContext;
  foodLibraryReturn?: MobileHeaderReturnContext;
  activityJournalReturn?: MobileHeaderReturnContext;
}

export interface MobileHeaderLocation {
  pathname: string;
  key?: string;
  state?: unknown;
}

export type MobileHeaderBackAction =
  | { kind: 'history' }
  | { kind: 'link'; to: string; state?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeAppPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function readNavigationState(value: unknown): MobileHeaderNavigationState | undefined {
  return isRecord(value) ? value as MobileHeaderNavigationState : undefined;
}

function readReturnContext(value: unknown): MobileHeaderReturnContext | undefined {
  if (!isRecord(value) || !isSafeAppPath(value.path)) return undefined;
  return {
    path: value.path,
    ...(typeof value.scrollKey === 'string' && value.scrollKey !== ''
      ? { scrollKey: value.scrollKey }
      : {}),
  };
}

function contextBackAction(state: MobileHeaderNavigationState | undefined): MobileHeaderBackAction | undefined {
  const explicit = state?.mobileHeaderBack;
  if (explicit && isSafeAppPath(explicit.path)) {
    return {
      kind: 'link',
      to: explicit.path,
      ...(explicit.state === undefined ? {} : { state: explicit.state }),
    };
  }

  const context = [
    state?.foodJournalReturn,
    state?.foodLibraryReturn,
    state?.activityJournalReturn,
  ].map(readReturnContext).find(Boolean);

  if (!context) return undefined;

  return {
    kind: 'link',
    to: context.path,
    ...(context.scrollKey
      ? {
          state: {
            scroll: 'restore' as const,
            restoreScrollKey: context.scrollKey,
          },
        }
      : {}),
  };
}

export function mobileHeaderBackDestination(pathname: string): string {
  if (pathname.startsWith('/food/') || pathname.startsWith('/recipes')) {
    return routePaths.food;
  }
  if (pathname.startsWith('/activities/') || pathname.startsWith('/strength')) {
    return routePaths.activities;
  }
  if (
    pathname === routePaths.weight
    || pathname === routePaths.analytics
    || pathname === routePaths.reports
    || pathname === routePaths.goals
    || pathname === routePaths.weeklyReview
    || pathname === routePaths.history
    || pathname === routePaths.rewards
  ) {
    return routePaths.progression;
  }
  if (pathname.startsWith('/settings/') && pathname !== routePaths.settings) {
    return routePaths.settings;
  }
  return routePaths.dashboard;
}

export function resolveMobileHeaderBackAction(
  location: MobileHeaderLocation,
): MobileHeaderBackAction {
  const state = readNavigationState(location.state);
  const explicit = state?.mobileHeaderBack;

  if (explicit && isSafeAppPath(explicit.path)) {
    return contextBackAction(state) ?? {
      kind: 'link',
      to: mobileHeaderBackDestination(location.pathname),
    };
  }

  if (location.key && location.key !== 'default') {
    return { kind: 'history' };
  }

  return contextBackAction(state) ?? {
    kind: 'link',
    to: mobileHeaderBackDestination(location.pathname),
  };
}
