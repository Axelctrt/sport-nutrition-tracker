const INVALID_FIELD_SELECTOR = '[aria-invalid="true"], [data-invalid="true"]';

export function focusFirstInvalidField(container: ParentNode): HTMLElement | null {
  const field = container.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR);
  if (!field) return null;

  let parent = field.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }

  field.focus({ preventScroll: true });
  field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  return field;
}
