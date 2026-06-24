import { Construction } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface PlaceholderPageProps {
  title: string;
  description: string;
  plannedStep: number;
}

export function PlaceholderPage({ title, description, plannedStep }: PlaceholderPageProps) {
  return (
    <section aria-labelledby="page-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Structure prête
        </p>
        <h1 id="page-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{description}</p>
      </div>

      <Card className="mt-8 p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Construction aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Fonctionnalité planifiée
            </h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Le routage, le layout responsive et la navigation sont opérationnels. Le module métier sera réalisé à l’étape {plannedStep}.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
