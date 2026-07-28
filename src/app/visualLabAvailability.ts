export const visualLabBuildEnabled = import.meta.env.DEV
  || import.meta.env.VITE_ENABLE_VISUAL_LAB === 'true';

export function visualLabHostnameAllowed(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'sportpilot-pages.pages.dev'
    && hostname.endsWith('.sportpilot-pages.pages.dev');
}
