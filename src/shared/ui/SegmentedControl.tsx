import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/shared/utils/cn';

export interface SegmentedControlItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  label: string;
  items: readonly SegmentedControlItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl({
  label,
  items,
  value,
  onChange,
  className,
  disabled = false,
}: SegmentedControlProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const enabledIndexes = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !disabled && !item.disabled)
      .map(({ index }) => index);
    if (enabledIndexes.length === 0) return;

    let nextIndex: number;
    if (event.key === 'Home') {
      nextIndex = enabledIndexes[0]!;
    } else if (event.key === 'End') {
      nextIndex = enabledIndexes[enabledIndexes.length - 1]!;
    } else {
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const currentEnabledIndex = Math.max(0, enabledIndexes.indexOf(currentIndex));
      nextIndex = enabledIndexes[(currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length]!;
    }

    const next = items[nextIndex];
    if (!next) return;
    onChange(next.value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(
        'grid min-h-[var(--sp-control-height-md)] auto-cols-fr grid-flow-col rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const itemDisabled = disabled || item.disabled;
        return (
          <button
            key={item.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={itemDisabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => moveSelection(event, index)}
            className={cn(
              'min-h-10 min-w-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              selected
                ? 'bg-[var(--sp-surface-elevated)] text-[var(--sp-text-primary)] shadow-sm'
                : 'text-[var(--sp-text-secondary)] hover:text-[var(--sp-text-primary)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <span className="block truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
