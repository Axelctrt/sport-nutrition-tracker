import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/utils/cn';

export const OTP_CODE_LENGTH = 8;

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
  onClick,
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

  const handleClick = (event: MouseEvent<HTMLInputElement>) => {
    onClick?.(event);
    if (disabled || event.defaultPrevented) return;

    const input = event.currentTarget;
    if (input.selectionStart !== input.selectionEnd) return;

    const bounds = input.getBoundingClientRect();
    if (bounds.width <= 0) {
      moveCaret(value.length);
      return;
    }

    const relativeX = Math.min(
      Math.max(event.clientX - bounds.left, 0),
      bounds.width,
    );
    const requestedPosition = Math.min(
      Math.floor((relativeX / bounds.width) * OTP_CODE_LENGTH),
      OTP_CODE_LENGTH - 1,
    );

    moveCaret(Math.min(requestedPosition, value.length));
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
        'relative grid w-full max-w-md grid-cols-8 gap-1 sm:gap-1.5',
        disabled && 'cursor-not-allowed opacity-70',
        className,
      )}
      data-otp-code-input
    >
      <input
        {...inputProps}
        autoCapitalize={inputProps.autoCapitalize ?? 'none'}
        autoComplete={inputProps.autoComplete ?? 'one-time-code'}
        autoCorrect={inputProps.autoCorrect ?? 'off'}
        className="absolute inset-0 z-20 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-brand-200/70 [-webkit-text-fill-color:transparent] dark:selection:bg-brand-800/70"
        disabled={disabled}
        inputMode={inputProps.inputMode ?? 'text'}
        onBlur={handleBlur}
        onChange={handleChange}
        onClick={handleClick}
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
              'pointer-events-none relative z-10 grid min-h-12 min-w-0 place-items-center rounded-lg border bg-white font-mono text-base font-semibold text-slate-950 shadow-sm transition sm:rounded-xl sm:text-lg',
              'dark:bg-slate-950 dark:text-white',
              invalid
                ? 'border-red-500 dark:border-red-400'
                : 'border-slate-300 dark:border-slate-700',
              active && !invalid
                ? 'border-brand-600 ring-2 ring-brand-600/20'
                : '',
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
