import { useCallback, useEffect, useId, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { cn } from '@/shared/utils/cn';

export interface WheelPickerOption {
  value: string;
  label: string;
}

interface WheelPickerProps {
  label: string;
  value: string;
  options: readonly WheelPickerOption[];
  onChange: (value: string) => void;
  description?: string;
  error?: string | undefined;
  disabled?: boolean;
  className?: string;
  visibleItems?: 3 | 5;
  compact?: boolean;
  itemHeight?: number;
  scrollSensitivity?: number;
}

const ITEM_HEIGHT = 52;
const SCROLL_SETTLE_DELAY_MS = 90;

export function WheelPicker({
  label,
  value,
  options,
  onChange,
  description,
  error,
  disabled = false,
  className,
  visibleItems = 3,
  compact = false,
  itemHeight: itemHeightOverride,
  scrollSensitivity = 1.15,
}: WheelPickerProps) {
  const id = useId();
  const descriptionId = useId();
  const errorId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | undefined>(undefined);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const safeVisibleItems = visibleItems % 2 === 0 ? visibleItems + 1 : visibleItems;
  const itemHeight = itemHeightOverride ?? (compact ? 44 : ITEM_HEIGHT);
  const safeScrollSensitivity = Math.min(1.5, Math.max(1, scrollSensitivity));
  const edgePadding = ((safeVisibleItems - 1) / 2) * itemHeight;
  const activeOptionId = `${id}-option-${selectedIndex}`;

  const viewportStyle = useMemo(() => ({
    '--wheel-picker-height': `${safeVisibleItems * itemHeight}px`,
    '--wheel-picker-edge': `${edgePadding}px`,
  }) as CSSProperties, [edgePadding, itemHeight, safeVisibleItems]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = index * itemHeight;
    const resolvedBehavior = behavior === 'smooth'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : behavior;
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top, behavior: resolvedBehavior });
    } else {
      viewport.scrollTop = top;
    }
  }, [itemHeight]);

  useEffect(() => {
    scrollToIndex(selectedIndex, 'auto');
  }, [scrollToIndex, selectedIndex]);

  useEffect(() => () => {
    if (scrollTimerRef.current !== undefined) {
      window.clearTimeout(scrollTimerRef.current);
    }
  }, []);

  const selectIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (disabled || options.length === 0) return;
    const safeIndex = Math.min(options.length - 1, Math.max(0, index));
    const option = options[safeIndex];
    if (!option) return;
    scrollToIndex(safeIndex, behavior);
    if (option.value !== value) onChange(option.value);
  };

  const commitScrollPosition = () => {
    const viewport = viewportRef.current;
    if (!viewport || disabled || options.length === 0) return;
    const scrollDeltaInItems = (viewport.scrollTop - selectedIndex * itemHeight) / itemHeight;
    const nextIndex = Math.min(
      options.length - 1,
      Math.max(0, selectedIndex + Math.round(scrollDeltaInItems * safeScrollSensitivity)),
    );
    const option = options[nextIndex];
    if (option && option.value !== value) onChange(option.value);
    scrollToIndex(nextIndex, 'smooth');
  };

  const handleScroll = () => {
    if (scrollTimerRef.current !== undefined) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(commitScrollPosition, SCROLL_SETTLE_DELAY_MS);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = selectedIndex - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = selectedIndex + 1;
        break;
      case 'PageUp':
        nextIndex = selectedIndex - safeVisibleItems;
        break;
      case 'PageDown':
        nextIndex = selectedIndex + safeVisibleItems;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectIndex(nextIndex);
  };

  return (
    <div className={cn('min-w-0 text-center', className)}>
      <p id={`${id}-label`} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </p>
      {description ? (
        <p id={descriptionId} className="mt-0.5 text-xs leading-4 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      <div className="relative mx-auto mt-2 max-w-sm overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-brand-500/50 bg-brand-50/80 dark:bg-brand-950/40"
          style={{ height: itemHeight }}
        />
        <div
          ref={viewportRef}
          aria-activedescendant={activeOptionId}
          aria-describedby={[description ? descriptionId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
          aria-disabled={disabled || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-labelledby={`${id}-label`}
          data-scroll-sensitivity={safeScrollSensitivity}
          className={cn(
            'relative z-20 h-[var(--wheel-picker-height)] snap-y snap-mandatory overflow-y-auto overscroll-contain touch-pan-y scroll-smooth motion-reduce:scroll-auto outline-none',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          role="listbox"
          style={viewportStyle}
          tabIndex={disabled ? -1 : 0}
        >
          <div aria-hidden="true" style={{ height: edgePadding }} />
          {options.map((option, index) => (
            <div
              aria-selected={index === selectedIndex}
              className={cn(
                'flex snap-center items-center justify-center px-2 text-center text-base transition-[color,font-size,font-weight,opacity] motion-reduce:transition-none',
                index === selectedIndex
                  ? 'text-lg font-bold text-slate-950 dark:text-white'
                  : 'text-slate-500 opacity-65 dark:text-slate-400',
              )}
              id={`${id}-option-${index}`}
              key={option.value}
              onClick={() => selectIndex(index)}
              role="option"
              style={{ height: itemHeight }}
            >
              {option.label}
            </div>
          ))}
          <div aria-hidden="true" style={{ height: edgePadding }} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-30 h-12 bg-gradient-to-b from-white to-transparent dark:from-slate-900" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-12 bg-gradient-to-t from-white to-transparent dark:from-slate-900" />
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
