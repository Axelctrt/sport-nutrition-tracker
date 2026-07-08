export const SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT =
  'sportpilot:social-activity-privacy-changed';

export function notifySocialActivityPrivacyChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT));
}
