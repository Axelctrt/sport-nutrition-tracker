import { useEffect } from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { routePaths } from '@/app/routePaths';

export const GLOBAL_SEARCH_FOCUS_EVENT =
  'sportpilot:focus-global-search';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.matches(
      'input, textarea, select, [contenteditable="true"]',
    ) || Boolean(target.closest('[contenteditable="true"]'))
  );
}

export function GlobalSearchShortcut() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const commandShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLocaleLowerCase('fr') === 'k';
      const slashShortcut =
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditableTarget(event.target);

      if (!commandShortcut && !slashShortcut) return;

      event.preventDefault();

      if (location.pathname === routePaths.search) {
        window.dispatchEvent(
          new Event(GLOBAL_SEARCH_FOCUS_EVENT),
        );
        return;
      }

      navigate(routePaths.search);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [location.pathname, navigate]);

  return null;
}
