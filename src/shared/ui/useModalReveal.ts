import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalRevealRefs {
  backdropRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLButtonElement | null>;
}

export function useModalReveal(onEscape: () => void): ModalRevealRefs {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const backgroundStates = Array.from(document.body.children)
      .filter((element): element is HTMLElement => (
        element instanceof HTMLElement && element !== backdrop
      ))
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.inert,
      }));

    document.body.style.overflow = 'hidden';
    backgroundStates.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    const focusFrame = window.requestAnimationFrame(() => {
      const focusTarget = initialFocusRef.current
        ?? dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        ?? dialog;
      focusTarget.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundStates.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });

      const activeElement = document.activeElement;
      if (
        previouslyFocused?.isConnected
        && (
          activeElement === document.body
          || (activeElement instanceof Node && dialog.contains(activeElement))
        )
      ) previouslyFocused.focus();
    };
  }, []);

  return { backdropRef, dialogRef, initialFocusRef };
}
