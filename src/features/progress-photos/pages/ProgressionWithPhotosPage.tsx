import { ArrowRight, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import { ProgressionHubPage } from '@/features/progression/pages/ProgressionHubPage';
import { Card } from '@/shared/ui/Card';

export function ProgressionWithPhotosPage() {
  return (
    <div className="space-y-6">
      <ProgressionHubPage />
      <section aria-labelledby="progress-photos-entry-title">
        <Card className="border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-accent-primary)] text-white">
              <Camera aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
                Suivi visuel privé
              </p>
              <h2 id="progress-photos-entry-title" className="mt-1 text-lg font-semibold text-[var(--sp-text-primary)]">
                Photos de progression
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                Conserve des repères locaux, classe-les par angle et compare deux dates sans publication ni analyse IA.
              </p>
              <Link
                to={routePaths.progressPhotos}
                className="sp-button sp-button--secondary mt-3 inline-flex min-h-[var(--sp-control-height-md)] items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
              >
                Ouvrir les photos
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
