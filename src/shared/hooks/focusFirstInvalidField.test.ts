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

  it('ouvre les sections repliées avant de focaliser le champ invalide', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <details>
        <summary>Options</summary>
        <input id="hidden-invalid" aria-invalid="true" />
      </details>
    `;
    document.body.append(form);
    const details = form.querySelector('details')!;
    const field = form.querySelector<HTMLInputElement>('#hidden-invalid')!;
    Object.defineProperty(field, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    expect(details.open).toBe(false);
    focusFirstInvalidField(form);

    expect(details.open).toBe(true);
    expect(field).toHaveFocus();
    form.remove();
  });
});
