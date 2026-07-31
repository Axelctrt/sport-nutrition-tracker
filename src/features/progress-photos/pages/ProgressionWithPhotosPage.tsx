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
        <Card className="border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900 dark:bg-brand-950/20 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
              <Camera aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Suivi visuel privé
              </p>
              <h2 id="progress-photos-entry-title" className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Photos de progression
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Conserve des repères locaux, classe-les par angle et compare deux dates sans publication ni analyse IA.
              </p>
              <Link
                to={routePaths.progressPhotos}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-300"
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
