import { useCallback, useEffect, useState } from 'react';

import type { FriendsSectionId } from '@/app/friends/FriendsSectionNavigation';

const validSections = new Set<FriendsSectionId>(['feed', 'friends', 'requests', 'profile']);

function readSection(): FriendsSectionId {
  const query = window.location.hash.split('?')[1] ?? '';
  const section = new URLSearchParams(query).get('section') as FriendsSectionId | null;
  return section && validSections.has(section) ? section : 'feed';
}

export function useFriendsSection() {
  const [section, setSection] = useState<FriendsSectionId>(readSection);

  useEffect(() => {
    const syncSection = () => setSection(readSection());
    window.addEventListener('hashchange', syncSection);
    window.addEventListener('popstate', syncSection);
    return () => {
      window.removeEventListener('hashchange', syncSection);
      window.removeEventListener('popstate', syncSection);
    };
  }, []);

  const selectSection = useCallback((nextSection: FriendsSectionId) => {
    if (nextSection === readSection()) {
      setSection(nextSection);
      return;
    }

    const [hashPath = '#/friends'] = window.location.hash.split('?');
    window.history.pushState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${hashPath}?section=${nextSection}`,
    );
    setSection(nextSection);
  }, []);

  return { section, selectSection };
}
