import type { HTMLAttributes, ReactNode } from 'react';

export interface FormFieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  id: string;
  label: string;
  children: ReactNode | ((controlProps: FormFieldControlProps) => ReactNode);
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  optionalLabel?: string | undefined;
}

export function FormField({
  id,
  label,
  children,
  description,
  error,
  required = false,
  optionalLabel,
  className,
  ...props
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const controlProps: FormFieldControlProps = {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true } : {}),
    ...(required ? { 'aria-required': true } : {}),
  };

  return (
    <div className={className} {...props}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
        {required ? (
          <>
            <span className="ml-1 text-red-700 dark:text-red-300" aria-hidden="true">*</span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        ) : optionalLabel ? (
          <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">({optionalLabel})</span>
        ) : null}
      </label>
      {description ? (
        <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      <div className="mt-2">
        {typeof children === 'function' ? children(controlProps) : children}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
