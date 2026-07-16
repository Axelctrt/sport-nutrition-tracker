import {
  Armchair,
  BriefcaseBusiness,
  Info,
  Dumbbell,
  Mars,
  Minus,
  PersonStanding,
  TrendingDown,
  TrendingUp,
  Venus,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { SUGGESTED_WEEKLY_CHANGE_PERCENT } from '@/domain/defaults/userProfile';
import type { OccupationalActivity, WeightGoal } from '@/domain/models/profile';
import {
  PROFILE_ONBOARDING_STEP_IDS,
  type ProfileOnboardingErrors,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Card } from '@/shared/ui/Card';
import { ChoiceCard } from '@/shared/ui/ChoiceCard';
import { FormField } from '@/shared/ui/FormField';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { WheelPicker, type WheelPickerOption } from '@/shared/ui/WheelPicker';

interface OnboardingProfileStepProps {
  stepId: ProfileOnboardingStepId;
  values: ProfileFormValues;
  errors: ProfileOnboardingErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}

function formatOptionValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits });
}

function createSteppedOptions(
  min: number,
  max: number,
  step: number,
  suffix = '',
  maximumFractionDigits = 2,
): WheelPickerOption[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, index) => {
    const number = Number((min + index * step).toFixed(2));
    const value = formatOptionValue(number);
    return {
      value,
      label: `${formatNumber(number, maximumFractionDigits)}${suffix ? ` ${suffix}` : ''}`,
    };
  });
}

function optionsWithCurrent(
  options: readonly WheelPickerOption[],
  current: number,
  suffix: string,
  maximumFractionDigits = 2,
): WheelPickerOption[] {
  const currentValue = formatOptionValue(current);
  if (!Number.isFinite(current) || options.some((option) => option.value === currentValue)) {
    return [...options];
  }

  return [
    ...options,
    {
      value: currentValue,
      label: `${formatNumber(current, maximumFractionDigits)}${suffix ? ` ${suffix}` : ''}`,
    },
  ].sort((left, right) => Number(left.value) - Number(right.value));
}

const ageOptions = createSteppedOptions(13, 120, 1, 'ans', 0);
const heightOptions = createSteppedOptions(100, 250, 1, 'cm', 0);
const weightOptions = createSteppedOptions(30, 350, 0.5, 'kg', 1);
const stepGoalOptions = createSteppedOptions(0, 100_000, 500, 'pas', 0);

const monthLabels = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: String(index + 1).padStart(2, '0') };
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseLocalDate(value: string): { year: number; month: number; day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
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

  return { year, month, day };
}

function calculateAge(value: string): number | undefined {
  const parsed = parseLocalDate(value);
  if (!parsed) return undefined;

  const today = new Date();
  let age = today.getFullYear() - parsed.year;
  const beforeBirthday = today.getMonth() + 1 < parsed.month
    || (today.getMonth() + 1 === parsed.month && today.getDate() < parsed.day);
  if (beforeBirthday) age -= 1;
  return age;
}

function defaultBirthDate(ageYears: number): string {
  const today = new Date();
  const age = Number.isFinite(ageYears) ? Math.min(120, Math.max(13, Math.round(ageYears))) : 30;
  const year = today.getFullYear() - age;
  const month = today.getMonth() + 1;
  const maximumDay = new Date(year, month, 0).getDate();
  return toLocalDate(year, month, Math.min(today.getDate(), maximumDay));
}

function InfoNote({ children }: { children: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-xs leading-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300" />
      <p>{children}</p>
    </div>
  );
}

function StepCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={`mx-auto w-full max-w-xl p-4 sm:p-5 ${className}`}>{children}</Card>;
}

function NameStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard>
      <FormField
        id="onboarding-first-name"
        label="Nom affiché"
        description="Ce nom sera utilisé dans l’application."
        error={errors.firstName}
        optionalLabel="facultatif"
      >
        <input
          id="onboarding-first-name"
          type="text"
          autoComplete="given-name"
          maxLength={50}
          value={values.firstName}
          onChange={(event) => onChange({ firstName: event.target.value })}
          className={inputClassName}
          aria-invalid={Boolean(errors.firstName) || undefined}
          aria-describedby={errors.firstName ? 'onboarding-first-name-error' : 'onboarding-first-name-description'}
        />
      </FormField>
      <InfoNote>Vous pourrez modifier ce nom plus tard depuis votre profil.</InfoNote>
    </StepCard>
  );
}

function SexStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard className="min-h-[17rem]">
      <fieldset>
        <legend className="sr-only">Sexe utilisé pour l’équation énergétique</legend>
        {errors.sexForEnergyEquation ? (
          <p className="mb-2 text-sm text-rose-700" role="alert">{errors.sexForEnergyEquation}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <ChoiceCard
            name="sexForEnergyEquation"
            value="male"
            title="Masculin"
            icon={Mars}
            selected={values.sexForEnergyEquation === 'male'}
            onSelect={() => onChange({ sexForEnergyEquation: 'male' })}
          />
          <ChoiceCard
            name="sexForEnergyEquation"
            value="female"
            title="Féminin"
            icon={Venus}
            selected={values.sexForEnergyEquation === 'female'}
            onSelect={() => onChange({ sexForEnergyEquation: 'female' })}
          />
        </div>
      </fieldset>
      <InfoNote>Certaines formules utilisent cette donnée pour estimer le métabolisme de base.</InfoNote>
    </StepCard>
  );
}

function BirthDateStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  const currentDate = parseLocalDate(values.birthDate)
    ? values.birthDate
    : defaultBirthDate(values.ageYears);
  const parsed = parseLocalDate(currentDate)!;
  const today = new Date();
  const minimumYear = today.getFullYear() - 120;
  const maximumYear = today.getFullYear() - 13;
  const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();

  const dayOptions = useMemo(
    () => createSteppedOptions(1, daysInMonth, 1, '', 0).map((option) => ({
      ...option,
      label: option.value.padStart(2, '0'),
    })),
    [daysInMonth],
  );
  const yearOptions = useMemo(
    () => createSteppedOptions(minimumYear, maximumYear, 1, '', 0).reverse(),
    [maximumYear, minimumYear],
  );

  const setDatePart = (patch: Partial<typeof parsed>) => {
    const nextYear = patch.year ?? parsed.year;
    const nextMonth = patch.month ?? parsed.month;
    const maximumDay = new Date(nextYear, nextMonth, 0).getDate();
    const nextDay = Math.min(patch.day ?? parsed.day, maximumDay);
    onChange({ birthDate: toLocalDate(nextYear, nextMonth, nextDay) });
  };

  const switchAgeMode = (mode: string) => {
    if (mode === 'birthDate') {
      onChange({ ageMode: 'birthDate', birthDate: currentDate });
      return;
    }

    onChange({
      ageMode: 'age',
      ageYears: calculateAge(currentDate) ?? values.ageYears,
    });
  };

  return (
    <StepCard>
      <SegmentedControl
        label="Méthode"
        value={values.ageMode}
        onChange={switchAgeMode}
        items={[
          { value: 'birthDate', label: 'Date de naissance' },
          { value: 'age', label: 'Âge' },
        ]}
      />

      {values.ageMode === 'birthDate' ? (
        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Date de naissance">
          <WheelPicker
            label="JJ"
            value={String(parsed.day)}
            options={dayOptions}
            onChange={(value) => setDatePart({ day: Number(value) })}
            error={errors.birthDate}
            visibleItems={3}
          />
          <WheelPicker
            label="MM"
            value={String(parsed.month)}
            options={monthLabels}
            onChange={(value) => setDatePart({ month: Number(value) })}
            visibleItems={3}
          />
          <WheelPicker
            label="AAAA"
            value={String(parsed.year)}
            options={yearOptions}
            onChange={(value) => setDatePart({ year: Number(value) })}
            visibleItems={3}
          />
        </div>
      ) : (
        <WheelPicker
          className="mx-auto mt-4 max-w-sm"
          label="Âge"
          value={formatOptionValue(values.ageYears)}
          options={optionsWithCurrent(ageOptions, values.ageYears, 'ans', 0)}
          onChange={(value) => onChange({ ageYears: Number(value) })}
          error={errors.ageYears}
          visibleItems={3}
        />
      )}

      <InfoNote>L’âge intervient dans l’estimation de vos besoins énergétiques.</InfoNote>
    </StepCard>
  );
}

function HeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard className="min-h-[16rem]">
      <WheelPicker
        className="mx-auto max-w-sm"
        label="Taille"
        value={formatOptionValue(values.heightCm)}
        options={optionsWithCurrent(heightOptions, values.heightCm, 'cm', 1)}
        onChange={(value) => onChange({ heightCm: Number(value) })}
        error={errors.heightCm}
        visibleItems={3}
      />
      <InfoNote>La taille est utilisée avec le poids et l’âge pour estimer vos besoins.</InfoNote>
    </StepCard>
  );
}

function WeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard className="min-h-[16rem]">
      <WheelPicker
        className="mx-auto max-w-sm"
        label="Poids"
        value={formatOptionValue(values.initialWeightKg)}
        options={optionsWithCurrent(weightOptions, values.initialWeightKg, 'kg', 1)}
        onChange={(value) => onChange({ initialWeightKg: Number(value) })}
        error={errors.initialWeightKg}
        visibleItems={3}
      />
      <InfoNote>Cette valeur sert de référence pour vos objectifs et votre progression.</InfoNote>
    </StepCard>
  );
}

const goalCards: Array<{
  value: WeightGoal;
  title: string;
  icon: typeof TrendingDown;
}> = [
  { value: 'loss', title: 'Perdre', icon: TrendingDown },
  { value: 'maintenance', title: 'Maintenir', icon: Minus },
  { value: 'gain', title: 'Prendre', icon: TrendingUp },
];

function weeklyChangeOptions(goal: WeightGoal, current: number): WheelPickerOption[] {
  const base = goal === 'loss'
    ? createSteppedOptions(-2, -0.05, 0.05, '%', 2)
    : goal === 'gain'
      ? createSteppedOptions(0.05, 2, 0.05, '%', 2)
      : [{ value: '0', label: '0 %' }];
  return optionsWithCurrent(base, current, '%', 2);
}

function GoalStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  const chooseGoal = (goal: WeightGoal) => {
    onChange({
      goal,
      targetWeeklyWeightChangePercent: SUGGESTED_WEEKLY_CHANGE_PERCENT[goal],
    });
  };

  return (
    <StepCard className="min-h-[20rem]">
      <fieldset>
        <legend className="sr-only">Objectif de poids</legend>
        <div className="grid grid-cols-1 gap-2.5">
          {goalCards.map((card) => (
            <ChoiceCard
              compact
              key={card.value}
              name="goal"
              value={card.value}
              title={card.title}
              icon={card.icon}
              selected={values.goal === card.value}
              onSelect={() => chooseGoal(card.value)}
            />
          ))}
        </div>
      </fieldset>
      <WheelPicker
        className="mx-auto mt-4 max-w-sm"
        label="Variation par semaine"
        value={formatOptionValue(values.targetWeeklyWeightChangePercent)}
        options={weeklyChangeOptions(values.goal, values.targetWeeklyWeightChangePercent)}
        onChange={(value) => onChange({ targetWeeklyWeightChangePercent: Number(value) })}
        error={errors.targetWeeklyWeightChangePercent}
        disabled={values.goal === 'maintenance'}
      />
      <InfoNote>Un rythme progressif est généralement plus facile à maintenir.</InfoNote>
    </StepCard>
  );
}

const activityCards: Array<{
  value: OccupationalActivity;
  title: string;
  description: string;
  icon: typeof Armchair;
}> = [
  { value: 'sedentary', title: 'Faible', description: 'Peu d’activité au quotidien', icon: Armchair },
  { value: 'lightlyActive', title: 'Légère', description: 'Activité occasionnelle', icon: BriefcaseBusiness },
  { value: 'active', title: 'Modérée', description: 'Activité régulière', icon: PersonStanding },
  { value: 'veryActive', title: 'Élevée', description: 'Activité fréquente', icon: Dumbbell },
];

function ActivityStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard className="min-h-[20rem]">
      <fieldset>
        <legend className="sr-only">Niveau d’activité professionnelle</legend>
        {errors.occupationalActivity ? (
          <p className="mb-2 text-sm text-rose-700" role="alert">{errors.occupationalActivity}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-2.5">
          {activityCards.map((card) => (
            <ChoiceCard
              compact
              key={card.value}
              name="occupationalActivity"
              value={card.value}
              title={card.title}
              description={card.description}
              icon={card.icon}
              selected={values.occupationalActivity === card.value}
              onSelect={() => onChange({ occupationalActivity: card.value })}
            />
          ))}
        </div>
      </fieldset>
      <InfoNote>Ce niveau ajuste l’estimation de votre dépense quotidienne hors sport.</InfoNote>
    </StepCard>
  );
}

function StepsStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <StepCard className="min-h-[16rem]">
      <WheelPicker
        className="mx-auto max-w-sm"
        label="Pas par jour"
        value={formatOptionValue(values.dailyStepGoal)}
        options={optionsWithCurrent(stepGoalOptions, values.dailyStepGoal, 'pas', 0)}
        onChange={(value) => onChange({ dailyStepGoal: Number(value) })}
        error={errors.dailyStepGoal}
        visibleItems={3}
      />
      <InfoNote>Cet objectif suit votre activité quotidienne en dehors des séances.</InfoNote>
    </StepCard>
  );
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  switch (props.stepId) {
    case PROFILE_ONBOARDING_STEP_IDS.name:
      return <NameStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.sex:
      return <SexStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.birthDate:
      return <BirthDateStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.height:
      return <HeightStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.weight:
      return <WeightStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.goal:
      return <GoalStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.activity:
      return <ActivityStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.steps:
      return <StepsStep {...props} />;
    case PROFILE_ONBOARDING_STEP_IDS.summary:
      return null;
  }
}
