import { revealElement } from '@/shared/motion/revealElement';

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }) as MediaQueryList);
}

describe('revealElement', () => {
  it('focalise sans scroll séparé puis révèle avec un mouvement fluide', () => {
    mockMatchMedia(false);
    const target = document.createElement('button');
    const calls: string[] = [];
    const focus = vi.fn(() => calls.push('focus'));
    const scrollIntoView = vi.fn(() => calls.push('scroll'));
    Object.defineProperty(target, 'focus', {
      configurable: true,
      value: focus,
    });
    Object.defineProperty(target, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    revealElement(target, {
      focus: true,
      block: 'start',
      inline: 'center',
    });

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'center',
    });
    expect(calls).toEqual(['focus', 'scroll']);
  });

  it('désactive le mouvement fluide lorsque le mouvement réduit est demandé', () => {
    mockMatchMedia(true);
    const target = document.createElement('div');
    const scrollIntoView = vi.fn();
    Object.defineProperty(target, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    revealElement(target);

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
      inline: 'nearest',
    });
  });

  it('reste sûre sans cible ou sans scrollIntoView', () => {
    const target = document.createElement('div');
    Object.defineProperty(target, 'scrollIntoView', {
      configurable: true,
      value: undefined,
    });

    expect(() => revealElement(undefined)).not.toThrow();
    expect(() => revealElement(target)).not.toThrow();
  });
});
