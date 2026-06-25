import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';

describe('focusFirstInvalidField', () => {
  it('focalise et révèle uniquement le premier champ invalide', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input id="valid" />
      <input id="first" aria-invalid="true" />
      <input id="second" aria-invalid="true" />
    `;
    document.body.append(form);
    const first = form.querySelector<HTMLInputElement>('#first')!;
    const scrollIntoView = vi.fn();
    Object.defineProperty(first, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    expect(focusFirstInvalidField(form)).toBe(first);
    expect(first).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    form.remove();
  });
});
