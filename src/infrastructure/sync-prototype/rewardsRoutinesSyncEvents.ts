export const REWARDS_ROUTINES_CHANGED_EVENT =
  'sportpilot:rewards-routines-changed';

export function notifyRewardsRoutinesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(REWARDS_ROUTINES_CHANGED_EVENT));
}
