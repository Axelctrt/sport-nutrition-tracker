import { type ReactNode, useCallback, useEffect, useRef } from 'react';

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
  const frameRef = useRef<number>();

  const readForm = useCallback(() =>
    containerRef.current?.querySelector<HTMLFormElement>('form') ?? null,
  []);

  const cancelScheduledCheck = useCallback(() => {
    if (frameRef.current === undefined) return;
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
  }, []);

  const scheduleCheck = useCallback(() => {
    cancelScheduledCheck();
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = undefined;
      const form = readForm();
      if (!form || baselineRef.current === undefined) return;
      onDirtyChange(serializeForm(form) !== baselineRef.current);
    });
  }, [cancelScheduledCheck, onDirtyChange, readForm]);

  useEffect(() => {
    cancelScheduledCheck();
    const frameId = window.requestAnimationFrame(() => {
      const form = readForm();
      baselineRef.current = form ? serializeForm(form) : undefined;
      onDirtyChange(false);
    });
    frameRef.current = frameId;

    return cancelScheduledCheck;
  }, [cancelScheduledCheck, onDirtyChange, readForm, resetKey]);

  return (
    <div
      ref={containerRef}
      className={className}
      onInputCapture={scheduleCheck}
      onChangeCapture={scheduleCheck}
      onClickCapture={scheduleCheck}
    >
      {children}
    </div>
  );
}
