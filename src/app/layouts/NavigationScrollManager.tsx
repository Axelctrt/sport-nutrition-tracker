import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getScrollPosition, saveScrollPosition } from '@/app/layouts/scrollPositionStore';

type ScrollInstruction = 'top' | 'preserve';

interface ScrollLocationState {
  scroll?: ScrollInstruction;
}


function runAfterPaint(callback: () => void): void {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
    return;
  }
  window.setTimeout(callback, 0);
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

    const target = navigationType === 'POP'
      ? getScrollPosition(location.key) ?? 0
      : 0;

    runAfterPaint(() => {
      window.scrollTo({ top: target, behavior: 'instant' });
    });
    previousLocationRef.current = location;
  }, [location, navigationType]);

  useEffect(() => () => {
    saveScrollPosition(location.key, window.scrollY);
  }, [location.key]);

  return null;
}
