import type { ReactNode } from 'react';

import { Card } from '@/shared/ui/Card';

interface SettingsPageIntroProps {
  titleId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

export function SettingsPageIntro({
  titleId,
  eyebrow,
  title,
  description,
}: SettingsPageIntroProps) {
  return (
    <Card variant="elevated" padding="lg">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sp-accent-primary)]">
        {eyebrow}
      </p>
      <h1
        id={titleId}
        className="mt-1 text-3xl font-bold tracking-tight text-[var(--sp-text-primary)]"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-[var(--sp-text-secondary)]">
        {description}
      </p>
    </Card>
  );
}
