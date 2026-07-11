import { routePaths } from '@/app/routePaths';

export const primaryMobileRoutes = new Set<string>([
  routePaths.dashboard,
  routePaths.food,
  routePaths.activities,
  routePaths.progression,
]);

export function mobileHeaderBackDestination(pathname: string): string {
  if (pathname.startsWith('/food/') || pathname.startsWith('/recipes')) {
    return routePaths.food;
  }
  if (pathname.startsWith('/activities/') || pathname.startsWith('/strength')) {
    return routePaths.activities;
  }
  if (
    pathname === routePaths.weight ||
    pathname === routePaths.analytics ||
    pathname === routePaths.reports ||
    pathname === routePaths.goals ||
    pathname === routePaths.weeklyReview ||
    pathname === routePaths.history ||
    pathname === routePaths.rewards
  ) {
    return routePaths.progression;
  }
  if (pathname.startsWith('/settings/') && pathname !== routePaths.settings) {
    return routePaths.settings;
  }
  return routePaths.dashboard;
}
