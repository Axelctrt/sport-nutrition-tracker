import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number | null;
  dedupeKey?: string;
}

export interface ToastItem extends Required<Pick<ToastInput, 'title' | 'tone'>> {
  id: string;
  description?: string;
  durationMs: number | null;
  dedupeKey: string;
}

export interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
