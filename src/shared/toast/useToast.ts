import { useContext } from 'react';
import { ToastContext } from '@/shared/toast/ToastContext';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans ToastProvider.');
  }
  return context;
}
