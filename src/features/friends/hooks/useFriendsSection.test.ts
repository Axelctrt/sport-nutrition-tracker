import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFriendsSection } from '@/features/friends/hooks/useFriendsSection';

describe('useFriendsSection', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('ouvre le Fil par défaut et inscrit la rubrique choisie dans l’URL', () => {
    window.history.replaceState({}, '', '/#/friends');
    const { result } = renderHook(() => useFriendsSection());

    expect(result.current.section).toBe('feed');

    act(() => result.current.selectSection('requests'));

    expect(result.current.section).toBe('requests');
    expect(window.location.hash).toBe('#/friends?section=requests');
  });

  it('restaure un lien profond et suit la navigation Retour', () => {
    window.history.replaceState({}, '', '/#/friends?section=friends');
    const { result } = renderHook(() => useFriendsSection());

    expect(result.current.section).toBe('friends');

    act(() => result.current.selectSection('profile'));
    expect(result.current.section).toBe('profile');

    act(() => {
      window.history.replaceState({}, '', '/#/friends?section=friends');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.section).toBe('friends');
  });
});
