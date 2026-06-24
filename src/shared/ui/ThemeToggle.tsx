import { MonitorCog, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/app/providers/theme';
import { useTheme } from '@/app/providers/useTheme';
import { Button } from '@/shared/ui/Button';

const nextTheme: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const labels: Record<ThemePreference, string> = {
  system: 'Thème système',
  light: 'Thème clair',
  dark: 'Thème sombre',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === 'system' ? MonitorCog : theme === 'dark' ? Moon : Sun;
  const target = nextTheme[theme];

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-10 px-0"
      onClick={() => setTheme(target)}
      aria-label={`${labels[theme]}. Passer à : ${labels[target]}.`}
      title={labels[theme]}
    >
      <Icon aria-hidden="true" className="size-5" />
    </Button>
  );
}
