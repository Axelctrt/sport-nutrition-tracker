import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/app/providers/theme';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme doit être utilisé dans ThemeProvider.');
  }

  return context;
}
