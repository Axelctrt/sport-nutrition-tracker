import { type ReactNode, useCallback, useLayoutEffect, useRef } from 'react';

interface UnsavedFormBoundaryProps {
  children: ReactNode;
  onDirtyChange: (isDirty: boolean) => void;
  resetKey: string;
  className?: string;
}

function serializeForm(form: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(form).entries(), ([name, value]) => [
      name,
      typeof value === 'string' ? value : `${value.name}:${value.size}:${value.type}`,
    ]),
  );
}

export function UnsavedFormBoundary({
  children,
  onDirtyChange,
  resetKey,
  className,
}: UnsavedFormBoundaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<string>();
  const checkVersionRef = useRef(0);

  const readForm = useCallback(() =>
    containerRef.current?.querySelector<HTMLFormElement>('form') ?? null,
  []);

  const scheduleCheck = useCallback(() => {
    const version = ++checkVersionRef.current;
    queueMicrotask(() => {
      if (version !== checkVersionRef.current) return;
      const form = readForm();
      if (!form || baselineRef.current === undefined) return;
      onDirtyChange(serializeForm(form) !== baselineRef.current);
    });
  }, [onDirtyChange, readForm]);

  useLayoutEffect(() => {
    checkVersionRef.current += 1;
    const form = readForm();
    baselineRef.current = form ? serializeForm(form) : undefined;
    onDirtyChange(false);
  }, [onDirtyChange, readForm, resetKey]);

  return (
    <div
      ref={containerRef}
      className={className}
      onInputCapture={scheduleCheck}
      onChangeCapture={scheduleCheck}
      onClick={scheduleCheck}
    >
      {children}
    </div>
  );
}
