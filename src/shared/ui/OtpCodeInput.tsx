import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/utils/cn';

export const OTP_CODE_LENGTH = 6;

const nonAlphanumericPattern = /[^a-zA-Z0-9]/g;

function sanitizeOtpCode(value: string): string {
  return value.replace(nonAlphanumericPattern, '').slice(0, OTP_CODE_LENGTH);
}

interface OtpCodeInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'className' | 'maxLength' | 'onChange' | 'type' | 'value'
  > {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function OtpCodeInput({
  value,
  onValueChange,
  className,
  disabled,
  onBlur,
  onFocus,
  onKeyUp,
  onSelect,
  onPaste,
  ...inputProps
}: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectionStart, setSelectionStart] = useState(value.length);

  const moveCaret = (position: number) => {
    const input = inputRef.current;
    if (!input) return;

    const nextPosition = Math.min(Math.max(position, 0), value.length);
    input.focus();
    input.setSelectionRange(nextPosition, nextPosition);
    setSelectionStart(nextPosition);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    event.preventDefault();
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-otp-cell-index]');
    const requestedPosition = cell
      ? Number(cell.dataset.otpCellIndex)
      : value.length;

    moveCaret(Number.isFinite(requestedPosition) ? requestedPosition : value.length);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const rawSelectionStart = event.target.selectionStart ?? rawValue.length;
    const nextValue = sanitizeOtpCode(rawValue);
    const nextSelectionStart = sanitizeOtpCode(
      rawValue.slice(0, rawSelectionStart),
    ).length;

    onValueChange(nextValue);
    setSelectionStart(Math.min(nextSelectionStart, nextValue.length));

    queueMicrotask(() => {
      inputRef.current?.setSelectionRange(
        Math.min(nextSelectionStart, nextValue.length),
        Math.min(nextSelectionStart, nextValue.length),
      );
    });
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setSelectionStart(event.currentTarget.selectionStart ?? value.length);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const handleSelect = (event: SyntheticEvent<HTMLInputElement>) => {
    setSelectionStart(event.currentTarget.selectionStart ?? value.length);
    onSelect?.(event);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    setSelectionStart(event.currentTarget.selectionStart ?? value.length);
    onKeyUp?.(event);
  };

  const activeCellIndex = Math.min(selectionStart, OTP_CODE_LENGTH - 1);
  const invalid = inputProps['aria-invalid'] === true
    || inputProps['aria-invalid'] === 'true';

  return (
    <div
      className={cn(
        'relative grid w-full max-w-sm grid-cols-6 gap-1.5 sm:gap-2',
        disabled && 'cursor-not-allowed opacity-70',
        className,
      )}
      data-otp-code-input
      onPointerDown={handlePointerDown}
    >
      <input
        {...inputProps}
        autoCapitalize={inputProps.autoCapitalize ?? 'none'}
        autoComplete={inputProps.autoComplete ?? 'one-time-code'}
        autoCorrect={inputProps.autoCorrect ?? 'off'}
        className="absolute inset-0 z-0 h-full w-full cursor-text opacity-0"
        disabled={disabled}
        inputMode={inputProps.inputMode ?? 'text'}
        maxLength={OTP_CODE_LENGTH}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyUp={handleKeyUp}
        onPaste={onPaste}
        onSelect={handleSelect}
        ref={inputRef}
        spellCheck={inputProps.spellCheck ?? false}
        type="text"
        value={value}
      />
      {Array.from({ length: OTP_CODE_LENGTH }, (_, index) => {
        const character = value[index] ?? '';
        const active = isFocused && activeCellIndex === index;

        return (
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 grid min-h-12 min-w-0 cursor-text place-items-center rounded-xl border bg-white font-mono text-lg font-semibold text-slate-950 shadow-sm transition',
              'dark:bg-slate-950 dark:text-white',
              invalid
                ? 'border-red-500 dark:border-red-400'
                : 'border-slate-300 dark:border-slate-700',
              active && !invalid
                ? 'border-brand-600 ring-2 ring-brand-600/20'
                : '',
              disabled ? 'cursor-not-allowed' : '',
            )}
            data-otp-cell-index={index}
            data-testid={`otp-cell-${index}`}
            key={index}
          >
            {character}
          </span>
        );
      })}
    </div>
  );
}
