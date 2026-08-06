const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface RevealElementOptions {
  focus?: boolean;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
}

export function revealElement(
  target: HTMLElement | null | undefined,
  {
    focus = false,
    block = 'center',
    inline = 'nearest',
  }: RevealElementOptions = {},
): void {
  if (!target) return;

  if (focus && typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }

  if (typeof target.scrollIntoView !== 'function') return;

  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block,
    inline,
  });
}
