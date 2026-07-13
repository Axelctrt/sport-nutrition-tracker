import {
  Armchair,
  BriefcaseBusiness,
  Dumbbell,
  Mars,
  Minus,
  PersonStanding,
  TrendingDown,
  TrendingUp,
  Venus,
} from 'lucide-react';
import { useMemo } from 'react';
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

function NameStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-4">
      <FormField
        id="onboarding-first-name"
        label="Nom affiché"
        description="Facultatif et modifiable plus tard."
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
    </Card>
  );
}

function SexStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <fieldset>
      <legend className="sr-only">Sexe utilisé pour l’équation énergétique</legend>
      {errors.sexForEnergyEquation ? (
        <p className="mb-2 text-sm text-rose-700" role="alert">{errors.sexForEnergyEquation}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <ChoiceCard
          compact
          name="sexForEnergyEquation"
          value="male"
          title="Masculin"
          icon={Mars}
          selected={values.sexForEnergyEquation === 'male'}
          onSelect={() => onChange({ sexForEnergyEquation: 'male' })}
        />
        <ChoiceCard
          compact
          name="sexForEnergyEquation"
          value="female"
          title="Féminin"
          icon={Venus}
          selected={values.sexForEnergyEquation === 'female'}
          onSelect={() => onChange({ sexForEnergyEquation: 'female' })}
        />
      </div>
      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Utilisé uniquement pour l’estimation énergétique.
      </p>
    </fieldset>
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

  const age = values.ageMode === 'birthDate'
    ? calculateAge(currentDate)
    : values.ageYears;

  return (
    <div className="space-y-3">
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
        <div className="grid grid-cols-3 gap-2" aria-label="Date de naissance">
          <WheelPicker
            label="JJ"
            value={String(parsed.day)}
            options={dayOptions}
            onChange={(value) => setDatePart({ day: Number(value) })}
            error={errors.birthDate}
          />
          <WheelPicker
            label="MM"
            value={String(parsed.month)}
            options={monthLabels}
            onChange={(value) => setDatePart({ month: Number(value) })}
          />
          <WheelPicker
            label="AAAA"
            value={String(parsed.year)}
            options={yearOptions}
            onChange={(value) => setDatePart({ year: Number(value) })}
          />
        </div>
      ) : (
        <WheelPicker
          className="mx-auto max-w-xs"
          label="Âge"
          value={formatOptionValue(values.ageYears)}
          options={optionsWithCurrent(ageOptions, values.ageYears, 'ans', 0)}
          onChange={(value) => onChange({ ageYears: Number(value) })}
          error={errors.ageYears}
        />
      )}

      {typeof age === 'number' && Number.isFinite(age) ? (
        <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {Math.round(age)} ans
        </p>
      ) : null}
    </div>
  );
}

function HeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <WheelPicker
      className="mx-auto max-w-xs"
      label="Taille"
      value={formatOptionValue(values.heightCm)}
      options={optionsWithCurrent(heightOptions, values.heightCm, 'cm', 1)}
      onChange={(value) => onChange({ heightCm: Number(value) })}
      error={errors.heightCm}
      visibleItems={5}
    />
  );
}

function WeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <WheelPicker
      className="mx-auto max-w-xs"
      label="Poids"
      value={formatOptionValue(values.initialWeightKg)}
      options={optionsWithCurrent(weightOptions, values.initialWeightKg, 'kg', 1)}
      onChange={(value) => onChange({ initialWeightKg: Number(value) })}
      error={errors.initialWeightKg}
      visibleItems={5}
    />
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
    <div className="space-y-3">
      <fieldset>
        <legend className="sr-only">Objectif de poids</legend>
        <div className="grid grid-cols-3 gap-2">
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
        className="mx-auto max-w-xs"
        label="Variation par semaine"
        value={formatOptionValue(values.targetWeeklyWeightChangePercent)}
        options={weeklyChangeOptions(values.goal, values.targetWeeklyWeightChangePercent)}
        onChange={(value) => onChange({ targetWeeklyWeightChangePercent: Number(value) })}
        error={errors.targetWeeklyWeightChangePercent}
        disabled={values.goal === 'maintenance'}
      />
    </div>
  );
}

const activityCards: Array<{
  value: OccupationalActivity;
  title: string;
  icon: typeof Armchair;
}> = [
  { value: 'sedentary', title: 'Assis', icon: Armchair },
  { value: 'lightlyActive', title: 'Modéré', icon: BriefcaseBusiness },
  { value: 'active', title: 'Actif', icon: PersonStanding },
  { value: 'veryActive', title: 'Très actif', icon: Dumbbell },
];

function ActivityStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <fieldset>
      <legend className="sr-only">Niveau d’activité professionnelle</legend>
      {errors.occupationalActivity ? (
        <p className="mb-2 text-sm text-rose-700" role="alert">{errors.occupationalActivity}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {activityCards.map((card) => (
          <ChoiceCard
            compact
            key={card.value}
            name="occupationalActivity"
            value={card.value}
            title={card.title}
            icon={card.icon}
            selected={values.occupationalActivity === card.value}
            onSelect={() => onChange({ occupationalActivity: card.value })}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Activité habituelle hors séances sportives.
      </p>
    </fieldset>
  );
}

function StepsStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <WheelPicker
      className="mx-auto max-w-xs"
      label="Pas par jour"
      value={formatOptionValue(values.dailyStepGoal)}
      options={optionsWithCurrent(stepGoalOptions, values.dailyStepGoal, 'pas', 0)}
      onChange={(value) => onChange({ dailyStepGoal: Number(value) })}
      error={errors.dailyStepGoal}
      visibleItems={5}
    />
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
