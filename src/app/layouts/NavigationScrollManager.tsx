import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getScrollPosition, saveScrollPosition } from '@/app/layouts/scrollPositionStore';

type ScrollInstruction = 'top' | 'preserve' | 'restore';

interface ScrollLocationState {
  scroll?: ScrollInstruction;
  restoreScrollKey?: string;
}


function runAfterPaint(callback: () => void): () => void {
  if (typeof window.requestAnimationFrame === 'function') {
    let secondFrame: number | undefined;
    let cancelled = false;
    const firstFrame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      secondFrame = window.requestAnimationFrame(() => {
        if (!cancelled) callback();
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
    };
  }
  const timeout = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeout);
}

function hasNewIntentionalFocus(previouslyFocused: Element | null): boolean {
  const currentlyFocused = document.activeElement;
  return currentlyFocused !== previouslyFocused
    && currentlyFocused !== null
    && currentlyFocused !== document.body
    && currentlyFocused !== document.documentElement;
}

export function NavigationScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocationRef = useRef(location);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const previousLocation = previousLocationRef.current;
    if (previousLocation.key === location.key) return;

    saveScrollPosition(previousLocation.key, window.scrollY);
    const state = location.state as ScrollLocationState | null;

    if (state?.scroll === 'preserve' || previousLocation.pathname === location.pathname) {
      previousLocationRef.current = location;
      return;
    }

    const target = state?.scroll === 'restore' && state.restoreScrollKey
      ? getScrollPosition(state.restoreScrollKey) ?? 0
      : navigationType === 'POP'
        ? getScrollPosition(location.key) ?? 0
        : 0;

    const focusedAtNavigation = document.activeElement;
    const cancelAfterPaint = runAfterPaint(() => {
      window.scrollTo({ top: target, behavior: 'instant' });
      if (navigationType === 'PUSH' && !hasNewIntentionalFocus(focusedAtNavigation)) {
        document.getElementById('main-content')?.focus({
          preventScroll: true,
        });
      }
    });
    previousLocationRef.current = location;
    return cancelAfterPaint;
  }, [location, navigationType]);

  useEffect(() => () => {
    saveScrollPosition(location.key, window.scrollY);
  }, [location.key]);

  return null;
}
