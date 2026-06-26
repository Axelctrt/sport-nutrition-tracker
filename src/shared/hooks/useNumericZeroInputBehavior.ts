import { useEffect } from 'react';

const autoClearedAttribute = 'data-sportpilot-auto-cleared-zero';

function isEditableNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement
    && target.type === 'number'
    && !target.disabled
    && !target.readOnly
    && target.dataset.preserveZeroOnFocus !== 'true';
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function containsOnlyZero(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

export function useNumericZeroInputBehavior() {
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableNumberInput(event.target) || !containsOnlyZero(event.target.value)) return;

      event.target.setAttribute(autoClearedAttribute, 'true');
      setNativeInputValue(event.target, '');
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isEditableNumberInput(event.target)
        || event.target.getAttribute(autoClearedAttribute) !== 'true') return;

      event.target.removeAttribute(autoClearedAttribute);
      if (event.target.value === '') setNativeInputValue(event.target, '0');
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
}
