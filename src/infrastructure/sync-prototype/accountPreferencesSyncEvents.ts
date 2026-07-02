export const ACCOUNT_PREFERENCES_CHANGED_EVENT =
  'sportpilot:account-preferences-changed';

export function notifyAccountPreferencesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ACCOUNT_PREFERENCES_CHANGED_EVENT));
}
