import { ChevronDown, ChevronUp } from 'lucide-react';
import { useId } from 'react';
import { IconAction } from '@/shared/ui/IconAction';
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
  disabled?: boolean;
  className?: string;
}

export function WheelPicker({
  label,
  value,
  options,
  onChange,
  description,
  disabled = false,
  className,
}: WheelPickerProps) {
  const id = useId();
  const descriptionId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const canDecrement = !disabled && selectedIndex > 0;
  const canIncrement = !disabled && selectedIndex < options.length - 1;

  const selectAt = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
  };

  return (
    <div className={cn('text-center', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      ) : null}
      <div className="mx-auto mt-3 flex max-w-sm flex-col items-center gap-2">
        <IconAction
          icon={ChevronUp}
          label={`Diminuer ${label.toLocaleLowerCase('fr-FR')}`}
          variant="ghost"
          disabled={!canDecrement}
          onClick={() => selectAt(selectedIndex - 1)}
        />
        <div className="relative w-full">
          <select
            id={id}
            value={value}
            disabled={disabled}
            aria-describedby={description ? descriptionId : undefined}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-20 w-full appearance-none rounded-[var(--sp-radius-card)] border border-slate-300 bg-white px-12 text-center text-3xl font-bold tracking-tight text-slate-950 shadow-sm outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-slate-500 dark:text-slate-400">
            <ChevronDown className="size-5" />
          </span>
        </div>
        <IconAction
          icon={ChevronDown}
          label={`Augmenter ${label.toLocaleLowerCase('fr-FR')}`}
          variant="ghost"
          disabled={!canIncrement}
          onClick={() => selectAt(selectedIndex + 1)}
        />
      </div>
    </div>
  );
}
