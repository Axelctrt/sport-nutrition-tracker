import { Pencil } from 'lucide-react';
import type { DataSpaceKind } from '@/domain/data-spaces/dataSpace';
import type { OccupationalActivity, WeightGoal } from '@/domain/models/profile';
import {
  PROFILE_ONBOARDING_STEP_IDS,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface OnboardingProfileSummaryProps {
  values: ProfileFormValues;
  dataSpaceKind: DataSpaceKind;
  socialHandle?: string | undefined;
  onEdit: (stepId: ProfileOnboardingStepId) => void;
}

interface SummaryItemProps {
  label: string;
  value: string;
  editLabel: string;
  onEdit: () => void;
}

const goalLabels: Record<WeightGoal, string> = {
  loss: 'Perte',
  maintenance: 'Maintien',
  gain: 'Prise',
};

const activityLabels: Record<OccupationalActivity, string> = {
  sedentary: 'Assis',
  lightlyActive: 'Modéré',
  active: 'Actif',
  veryActive: 'Très actif',
};

function calculateAgeFromBirthDate(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function formatAge(values: ProfileFormValues): string {
  if (values.ageMode === 'age') return `${Math.round(values.ageYears)} ans`;
  const age = calculateAgeFromBirthDate(values.birthDate);
  const formattedDate = formatLocalDate(values.birthDate);
  return typeof age === 'number' ? `${formattedDate} · ${age} ans` : formattedDate;
}

function formatWeeklyChange(values: ProfileFormValues): string {
  if (values.goal === 'maintenance') return '0 %/sem.';
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, signDisplay: 'always' });
  return `${formatter.format(values.targetWeeklyWeightChangePercent)} %/sem.`;
}

function SummaryItem({ label, value, editLabel, onEdit }: SummaryItemProps) {
  return (
    <li>
      <button
        aria-label={editLabel}
        className="flex min-h-14 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-800 dark:bg-slate-900"
        onClick={onEdit}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">{label}</span>
          <span className="block truncate text-sm font-semibold leading-5 text-slate-950 dark:text-white">{value}</span>
        </span>
        <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
      </button>
    </li>
  );
}

export function OnboardingProfileSummary({
  values,
  dataSpaceKind,
  socialHandle,
  onEdit,
}: OnboardingProfileSummaryProps) {
  const modeLabel = dataSpaceKind === 'account'
    ? socialHandle ? `Compte · ${socialHandle}` : 'Compte connecté'
    : 'Mode local';

  return (
    <div className="space-y-2">
      <p className="rounded-xl bg-brand-50 px-3 py-2 text-center text-xs font-semibold text-brand-900 dark:bg-brand-950/35 dark:text-brand-100">
        {modeLabel}
      </p>
      <Card className="p-2">
        <ul aria-label="Récapitulatif du profil" className="grid grid-cols-2 gap-2">
          <SummaryItem
            label="Nom"
            value={values.firstName.trim() || 'Non renseigné'}
            editLabel="Modifier le nom"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.name)}
          />
          <SummaryItem
            label="Calcul"
            value={values.sexForEnergyEquation === 'male' ? 'Masculin' : 'Féminin'}
            editLabel="Modifier le sexe"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.sex)}
          />
          <SummaryItem
            label="Âge"
            value={formatAge(values)}
            editLabel="Modifier la date de naissance ou l’âge"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.birthDate)}
          />
          <SummaryItem
            label="Taille"
            value={`${values.heightCm.toLocaleString('fr-FR')} cm`}
            editLabel="Modifier la taille"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.height)}
          />
          <SummaryItem
            label="Poids"
            value={`${values.initialWeightKg.toLocaleString('fr-FR')} kg`}
            editLabel="Modifier le poids"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.weight)}
          />
          <SummaryItem
            label="Objectif"
            value={`${goalLabels[values.goal]} · ${formatWeeklyChange(values)}`}
            editLabel="Modifier l’objectif"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.goal)}
          />
          <SummaryItem
            label="Activité"
            value={activityLabels[values.occupationalActivity]}
            editLabel="Modifier l’activité professionnelle"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.activity)}
          />
          <SummaryItem
            label="Pas"
            value={`${values.dailyStepGoal.toLocaleString('fr-FR')} pas`}
            editLabel="Modifier l’objectif de pas"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.steps)}
          />
        </ul>
      </Card>
    </div>
  );
}
