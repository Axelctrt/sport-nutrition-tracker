import { useEffect } from 'react';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function elementToCenter(trigger: HTMLElement): HTMLElement {
  const controlledId = trigger.getAttribute('aria-controls');
  if (controlledId) {
    const controlled = document.getElementById(controlledId);
    if (controlled) return controlled;
  }

  return trigger.closest<HTMLElement>('article, section, details')
    ?? trigger.parentElement
    ?? trigger;
}

export function useCenterExpandedContent() {
  useEffect(() => {
    const frameIds = new Set<number>();

    const scheduleCenter = (element: HTMLElement) => {
      if (typeof element.scrollIntoView !== 'function') return;
      const firstFrame = window.requestAnimationFrame(() => {
        frameIds.delete(firstFrame);
        const secondFrame = window.requestAnimationFrame(() => {
          frameIds.delete(secondFrame);
          element.scrollIntoView({
            block: 'center',
            inline: 'nearest',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          });
        });
        frameIds.add(secondFrame);
      });
      frameIds.add(firstFrame);
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const summary = event.target.closest('summary');
      if (summary) {
        const details = summary.closest('details');
        if (!details || details.dataset.noAutoCenter === 'true') return;

        const frameId = window.requestAnimationFrame(() => {
          frameIds.delete(frameId);
          if (details.open) scheduleCenter(details);
        });
        frameIds.add(frameId);
        return;
      }

      const trigger = event.target.closest<HTMLElement>('[aria-expanded]');
      if (!trigger || trigger.dataset.noAutoCenter === 'true') return;
      if (trigger.getAttribute('aria-expanded') === 'true') return;

      const frameId = window.requestAnimationFrame(() => {
        frameIds.delete(frameId);
        if (trigger.getAttribute('aria-expanded') === 'true') {
          scheduleCenter(elementToCenter(trigger));
        }
      });
      frameIds.add(frameId);
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, []);
}
