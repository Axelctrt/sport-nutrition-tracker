import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import { UnsavedChangesGuard } from '@/shared/ui/UnsavedChangesGuard';

interface RouteUnsavedChangesBoundaryProps {
  children: ReactNode;
}

const protectedSettingsPaths = new Set<string>([
  routePaths.settingsAppearanceAccessibility,
  routePaths.settingsNotificationsRoutines,
  routePaths.settingsNutritionCalculations,
  routePaths.settingsAdvanced,
  routePaths.reminders,
  routePaths.dashboardCustomization,
]);

const saveSuccessMessages = [
  'Paramètres enregistrés',
  'Préférences enregistrées.',
  'Personnalisation enregistrée',
] as const;

const settingsResetDialogTitle = 'Rétablir les paramètres par défaut ?';
const settingsResetConfirmLabel = 'Rétablir';

function elementKey(element: HTMLElement, index: number): string {
  return (
    element.getAttribute('name')
    ?? element.id
    ?? element.getAttribute('aria-label')
    ?? `${element.tagName.toLowerCase()}-${index}`
  );
}

function serializeElements(elements: readonly HTMLElement[]): string {
  return JSON.stringify(elements.map((element, index) => {
    const key = elementKey(element, index);

    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        return [key, element.type, element.checked, element.value];
      }
      if (element.type === 'file') {
        return [
          key,
          element.type,
          Array.from(element.files ?? [], (file) => `${file.name}:${file.size}:${file.type}`),
        ];
      }
      return [key, element.type, element.value];
    }

    if (element instanceof HTMLTextAreaElement) {
      return [key, 'textarea', element.value];
    }

    if (element instanceof HTMLSelectElement) {
      return [
        key,
        element.multiple ? 'select-multiple' : 'select',
        Array.from(element.selectedOptions, (option) => option.value),
      ];
    }

    return [key, 'aria-pressed', element.getAttribute('aria-pressed')];
  }));
}

function formWithButtonLabel(
  container: HTMLElement,
  label: string,
): HTMLFormElement | undefined {
  return Array.from(container.querySelectorAll<HTMLFormElement>('form')).find((form) =>
    Array.from(form.querySelectorAll<HTMLButtonElement>('button')).some(
      (button) => button.textContent?.trim() === label,
    ),
  );
}

function trackedElements(
  container: HTMLElement,
  pathname: string,
): HTMLElement[] {
  const root = pathname === routePaths.reminders
    ? container
    : pathname === routePaths.dashboardCustomization
      ? formWithButtonLabel(container, 'Enregistrer')
      : formWithButtonLabel(container, 'Enregistrer les paramètres');

  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>([
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"])',
    'textarea',
    'select',
    'button[aria-pressed]',
  ].join(',')));
}

function hasSaveSuccess(container: HTMLElement): boolean {
  const text = container.textContent ?? '';
  return saveSuccessMessages.some((message) => text.includes(message));
}

function isConfirmedSettingsReset(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const button = target.closest('button');
  if (button?.textContent?.trim() !== settingsResetConfirmLabel) return false;

  const dialog = button.closest<HTMLElement>('[role="alertdialog"]');
  if (!dialog) return false;

  return dialog.querySelector('h2')?.textContent?.trim() === settingsResetDialogTitle;
}

export function RouteUnsavedChangesBoundary({
  children,
}: RouteUnsavedChangesBoundaryProps) {
  const { pathname } = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<string>();
  const checkVersionRef = useRef(0);
  const saveSuccessVisibleRef = useRef(false);
  const resetPendingRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const shouldProtect = protectedSettingsPaths.has(pathname);

  const readSnapshot = useCallback((): string | undefined => {
    const container = containerRef.current;
    if (!container) return undefined;
    const elements = trackedElements(container, pathname);
    return elements.length > 0 ? serializeElements(elements) : undefined;
  }, [pathname]);

  const resetBaseline = useCallback(() => {
    const snapshot = readSnapshot();
    if (snapshot === undefined) return;
    baselineRef.current = snapshot;
    setIsDirty(false);
  }, [readSnapshot]);

  const scheduleCheck = useCallback(() => {
    if (!shouldProtect) return;
    const version = ++checkVersionRef.current;
    queueMicrotask(() => {
      if (version !== checkVersionRef.current) return;
      const snapshot = readSnapshot();
      if (snapshot === undefined || baselineRef.current === undefined) return;
      setIsDirty(snapshot !== baselineRef.current);
    });
  }, [readSnapshot, shouldProtect]);

  useLayoutEffect(() => {
    checkVersionRef.current += 1;
    baselineRef.current = undefined;
    saveSuccessVisibleRef.current = false;
    resetPendingRef.current = false;
    setIsDirty(false);

    if (!shouldProtect) return;

    resetBaseline();
    const frame = window.requestAnimationFrame(resetBaseline);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, resetBaseline, shouldProtect]);

  useEffect(() => {
    if (!shouldProtect) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (isConfirmedSettingsReset(event.target)) {
        resetPendingRef.current = true;
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [shouldProtect]);

  useEffect(() => {
    if (!shouldProtect) return;

    const observer = new MutationObserver(() => {
      const container = containerRef.current;
      if (!container) return;

      if (baselineRef.current === undefined) resetBaseline();

      const saveSuccessVisible = hasSaveSuccess(container);
      if (saveSuccessVisible && !saveSuccessVisibleRef.current) {
        resetBaseline();
      }
      saveSuccessVisibleRef.current = saveSuccessVisible;

      if (
        resetPendingRef.current
        && !document.querySelector('[role="alertdialog"]')
      ) {
        resetPendingRef.current = false;
        resetBaseline();
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'checked', 'value'],
    });

    return () => observer.disconnect();
  }, [resetBaseline, shouldProtect]);

  return (
    <div
      ref={containerRef}
      onInputCapture={scheduleCheck}
      onChangeCapture={scheduleCheck}
      onClick={scheduleCheck}
    >
      <UnsavedChangesGuard when={shouldProtect && isDirty} />
      {children}
    </div>
  );
}
