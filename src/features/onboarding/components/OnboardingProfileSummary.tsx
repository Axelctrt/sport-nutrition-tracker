import {
  Activity,
  CalendarDays,
  Cloud,
  CloudOff,
  Footprints,
  Goal,
  Pencil,
  Ruler,
  Scale,
  UserRound,
} from 'lucide-react';
import type { DataSpaceKind } from '@/domain/data-spaces/dataSpace';
import type { OccupationalActivity, WeightGoal } from '@/domain/models/profile';
import {
  PROFILE_ONBOARDING_STEP_IDS,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

interface OnboardingProfileSummaryProps {
  values: ProfileFormValues;
  dataSpaceKind: DataSpaceKind;
  socialHandle?: string | undefined;
  onEdit: (stepId: ProfileOnboardingStepId) => void;
}

interface SummaryItemProps {
  icon: typeof UserRound;
  label: string;
  value: string;
  editLabel: string;
  onEdit: () => void;
}

const goalLabels: Record<WeightGoal, string> = {
  loss: 'Perdre du poids',
  maintenance: 'Maintenir le poids',
  gain: 'Prendre du poids ou de la masse',
};

const activityLabels: Record<OccupationalActivity, string> = {
  sedentary: 'Principalement assis',
  lightlyActive: 'Modérément actif',
  active: 'Physiquement actif',
  veryActive: 'Très physique',
};

function calculateAgeFromBirthDate(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return undefined;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month
    || (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age -= 1;
  }

  return age;
}

function formatAge(values: ProfileFormValues): string {
  if (values.ageMode === 'age') {
    return `${Math.round(values.ageYears)} ans`;
  }

  const age = calculateAgeFromBirthDate(values.birthDate);
  const formattedDate = formatLocalDate(values.birthDate);
  return typeof age === 'number' ? `${formattedDate} · ${age} ans` : formattedDate;
}

function formatWeeklyChange(values: ProfileFormValues): string {
  if (values.goal === 'maintenance') return '0 % par semaine';
  const formatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    signDisplay: 'always',
  });
  return `${formatter.format(values.targetWeeklyWeightChangePercent)} % par semaine`;
}

function SummaryItem({ icon: Icon, label, value, editLabel, onEdit }: SummaryItemProps) {
  return (
    <li className="flex items-start gap-3 border-b border-slate-200 py-4 last:border-b-0 dark:border-slate-800">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={editLabel}
        onClick={onEdit}
        className="shrink-0"
      >
        <Pencil aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Modifier</span>
      </Button>
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
    ? socialHandle
      ? `Compte connecté · ${socialHandle}`
      : 'Compte connecté · identité sociale confirmée'
    : 'Mode local sur cet appareil';

  return (
    <div className="space-y-5">
      <InlineNotice
        tone={dataSpaceKind === 'account' ? 'success' : 'info'}
        title={dataSpaceKind === 'account' ? 'Compte prêt' : 'Mode local prêt'}
      >
        <div className="flex items-start gap-2">
          {dataSpaceKind === 'account' ? (
            <Cloud aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CloudOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{modeLabel}</p>
        </div>
      </InlineNotice>

      <Card className="px-5 sm:px-6">
        <ul aria-label="Récapitulatif du profil">
          <SummaryItem
            icon={UserRound}
            label="Nom dans SportPilot"
            value={values.firstName.trim() || 'Aucun nom renseigné'}
            editLabel="Modifier le nom"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.name)}
          />
          <SummaryItem
            icon={UserRound}
            label="Sexe utilisé pour les calculs"
            value={values.sexForEnergyEquation === 'male' ? 'Masculin' : 'Féminin'}
            editLabel="Modifier le sexe"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.sex)}
          />
          <SummaryItem
            icon={CalendarDays}
            label="Âge"
            value={formatAge(values)}
            editLabel="Modifier la date de naissance ou l’âge"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.birthDate)}
          />
          <SummaryItem
            icon={Ruler}
            label="Taille"
            value={`${values.heightCm.toLocaleString('fr-FR')} cm`}
            editLabel="Modifier la taille"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.height)}
          />
          <SummaryItem
            icon={Scale}
            label="Poids actuel"
            value={`${values.initialWeightKg.toLocaleString('fr-FR')} kg`}
            editLabel="Modifier le poids"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.weight)}
          />
          <SummaryItem
            icon={Goal}
            label="Objectif"
            value={`${goalLabels[values.goal]} · ${formatWeeklyChange(values)}`}
            editLabel="Modifier l’objectif"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.goal)}
          />
          <SummaryItem
            icon={Activity}
            label="Activité professionnelle"
            value={activityLabels[values.occupationalActivity]}
            editLabel="Modifier l’activité professionnelle"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.activity)}
          />
          <SummaryItem
            icon={Footprints}
            label="Objectif quotidien"
            value={`${values.dailyStepGoal.toLocaleString('fr-FR')} pas`}
            editLabel="Modifier l’objectif de pas"
            onEdit={() => onEdit(PROFILE_ONBOARDING_STEP_IDS.steps)}
          />
        </ul>
      </Card>

      <InlineNotice tone="info" title="Première pesée">
        Si cet espace ne contient encore aucune pesée, SportPilot enregistrera automatiquement ce poids à la date du jour. Un historique restauré ou déjà présent ne sera jamais écrasé.
      </InlineNotice>
    </div>
  );
}
