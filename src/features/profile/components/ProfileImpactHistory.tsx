import { History } from 'lucide-react';
import { profileImpactFieldLabel } from '@/application/profile/profileImpactService';
import type { ProfileImpactHistoryEntry } from '@/domain/models/profile';
import { Card } from '@/shared/ui/Card';

interface ProfileImpactHistoryProps {
  entries: readonly ProfileImpactHistoryEntry[];
}

export function ProfileImpactHistory({ entries }: ProfileImpactHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <Card className="mt-4 p-4 sm:p-5" aria-labelledby="profile-impact-history-title">
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
        <h2 id="profile-impact-history-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Changements récents du profil
        </h2>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Les douze derniers changements importants sont conservés avec le profil.
      </p>
      <ol className="mt-4 space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-slate-950 dark:text-white">
                {new Date(entry.changedAt).toLocaleDateString('fr-FR')}
              </strong>
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                {entry.beforeTargetCaloriesKcal.toLocaleString('fr-FR')} → {entry.afterTargetCaloriesKcal.toLocaleString('fr-FR')} kcal
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.summary}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Modifié : {entry.changedFields.map(profileImpactFieldLabel).join(', ')}.
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
