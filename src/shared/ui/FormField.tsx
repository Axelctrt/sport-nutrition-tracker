import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean;
}

export function FormField({
  id,
  label,
  children,
  description,
  error,
  required = false,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
        {required ? <span className="ml-1 text-red-700 dark:text-red-300">*</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
