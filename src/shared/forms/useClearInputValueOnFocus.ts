import { useEffect } from 'react';

interface FocusState {
  initialValue: string;
  changed: boolean;
}

const activeInputs = new WeakMap<HTMLInputElement | HTMLTextAreaElement, FocusState>();

const excludedInputTypes = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'password',
  'radio',
  'range',
  'reset',
  'search',
  'submit',
  'time',
  'week',
]);

function isTextEntryField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return false;
  if (target.disabled || target.readOnly) return false;
  if (target.dataset.clearOnFocus === 'false') return false;
  if (target instanceof HTMLInputElement && excludedInputTypes.has(target.type)) return false;
  return true;
}

function setElementValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function useClearInputValueOnFocus(): void {
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (!isTextEntryField(event.target)) return;
      const field = event.target;
      if (field.value === '') return;
      activeInputs.set(field, { initialValue: field.value, changed: false });
      setElementValue(field, '');
    };

    const handleInput = (event: Event) => {
      if (!isTextEntryField(event.target)) return;
      const state = activeInputs.get(event.target);
      if (!state) return;
      if (event.target.value !== '') state.changed = true;
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isTextEntryField(event.target)) return;
      const field = event.target;
      const state = activeInputs.get(field);
      if (!state) return;
      activeInputs.delete(field);
      if (!state.changed && field.value === '') {
        setElementValue(field, state.initialValue);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
}
