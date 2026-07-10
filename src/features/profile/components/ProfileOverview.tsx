import { Activity, Footprints, Scale, Target } from 'lucide-react';
import type { CurrentWeightResolution } from '@/application/weight/currentWeightService';
import type { UserProfile } from '@/domain/models/profile';
import { Card } from '@/shared/ui/Card';

const goalLabels: Record<UserProfile['goal'], string> = {
  loss: 'Perte de poids',
  maintenance: 'Maintien',
  gain: 'Prise de poids',
};

interface ProfileOverviewProps {
  profile: UserProfile;
  currentWeight: CurrentWeightResolution;
}

export function ProfileOverview({ profile, currentWeight }: ProfileOverviewProps) {
  const metrics = [
    {
      label: 'Objectif',
      value: goalLabels[profile.goal],
      detail: undefined,
      icon: Target,
    },
    {
      label: 'Poids actuel',
      value: `${currentWeight.weightKg.toLocaleString('fr-FR')} kg`,
      detail: currentWeight.source === 'entry'
        ? `Pesée du ${currentWeight.measuredAt.split('-').reverse().join('/')}`
        : 'Poids initial du profil',
      icon: Scale,
    },
    {
      label: 'Pas quotidiens',
      value: profile.dailyStepGoal.toLocaleString('fr-FR'),
      detail: undefined,
      icon: Footprints,
    },
    {
      label: 'Macros',
      value: `${profile.proteinGramsPerKg.toLocaleString('fr-FR')} g/kg prot. · ${profile.fatGramsPerKg.toLocaleString('fr-FR')} g/kg lip.`,
      detail: undefined,
      icon: Activity,
    },
  ] as const;

  return (
    <Card className="mt-6 p-4 sm:p-5" aria-label="Résumé du profil">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <p className="truncate text-xs font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
            {detail ? (
              <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
