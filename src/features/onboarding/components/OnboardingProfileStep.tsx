import {
  Armchair,
  BriefcaseBusiness,
  Dumbbell,
  Footprints,
  Mars,
  Minus,
  PersonStanding,
  TrendingDown,
  TrendingUp,
  Venus,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { SUGGESTED_WEEKLY_CHANGE_PERCENT } from '@/domain/defaults/userProfile';
import type { OccupationalActivity, WeightGoal } from '@/domain/models/profile';
import {
  PROFILE_ONBOARDING_STEP_IDS,
  type ProfileOnboardingErrors,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ChoiceCard, ChoiceCardGroup } from '@/shared/ui/ChoiceCard';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { FormField } from '@/shared/ui/FormField';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { WheelPicker, type WheelPickerOption } from '@/shared/ui/WheelPicker';

interface OnboardingProfileStepProps {
  stepId: ProfileOnboardingStepId;
  values: ProfileFormValues;
  errors: ProfileOnboardingErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}

interface NumericTextInputProps {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
  inputMode?: 'decimal' | 'numeric';
  pattern?: string | undefined;
  min: number;
  max: number;
  step: number;
  enterKeyHint?: 'next' | 'done';
  className?: string | undefined;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  readOnly?: boolean | undefined;
}

function formatNumericValue(value: number): string {
  return Number.isFinite(value) ? String(value).replace('.', ',') : '';
}

function NumericTextInput({
  id,
  value,
  onValueChange,
  inputMode = 'decimal',
  pattern,
  min,
  max,
  step,
  enterKeyHint = 'next',
  className,
  invalid,
  describedBy,
  readOnly = false,
}: NumericTextInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => formatNumericValue(value));

  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setDraft(formatNumericValue(value));
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraft = event.target.value;
    setDraft(nextDraft);

    if (nextDraft.trim() === '') {
      onValueChange(Number.NaN);
      return;
    }

    const parsed = Number(nextDraft.replace(',', '.'));
    onValueChange(Number.isFinite(parsed) ? parsed : Number.NaN);
  };

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode={inputMode}
      enterKeyHint={enterKeyHint}
      pattern={pattern}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={handleChange}
      readOnly={readOnly}
      onBlur={() => setDraft(formatNumericValue(value))}
      className={className}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    />
  );
}

function createNumberOptions(min: number, max: number, suffix: string): WheelPickerOption[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    return { value, label: suffix ? `${value} ${suffix}` : value };
  });
}

const heightOptions = createNumberOptions(100, 250, 'cm');
const weightOptions = createNumberOptions(30, 350, 'kg');
const monthLabels = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

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

function nearestInteger(value: number, min: number, max: number, fallback: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : fallback;
  return String(Math.min(max, Math.max(min, safe)));
}

function NameStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-5 sm:p-6">
      <FormField
        id="onboarding-first-name"
        label="Nom utilisé dans SportPilot"
        description="Facultatif. Il sert uniquement à personnaliser l’interface et reste distinct du pseudonyme social."
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
    <Card className="p-5 sm:p-6">
      <ChoiceCardGroup
        label="Sexe utilisé pour l’équation énergétique"
        description={errors.sexForEnergyEquation}
        columns={2}
      >
        <ChoiceCard
          name="sexForEnergyEquation"
          value="male"
          title="Masculin"
          description="Utilise les constantes masculines de l’équation énergétique actuelle."
          icon={Mars}
          selected={values.sexForEnergyEquation === 'male'}
          onSelect={() => onChange({ sexForEnergyEquation: 'male' })}
        />
        <ChoiceCard
          name="sexForEnergyEquation"
          value="female"
          title="Féminin"
          description="Utilise les constantes féminines de l’équation énergétique actuelle."
          icon={Venus}
          selected={values.sexForEnergyEquation === 'female'}
          onSelect={() => onChange({ sexForEnergyEquation: 'female' })}
        />
      </ChoiceCardGroup>

      <ContextHelp className="mt-5" tone="brand">
        Cette information est utilisée uniquement dans le calcul énergétique. Elle n’est jamais affichée dans le profil social ni partagée avec les amis.
      </ContextHelp>
    </Card>
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
    () => createNumberOptions(1, daysInMonth, ''),
    [daysInMonth],
  );
  const monthOptions = useMemo<WheelPickerOption[]>(
    () => monthLabels.map((label, index) => ({ value: String(index + 1), label })),
    [],
  );
  const yearOptions = useMemo(
    () => Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => {
      const value = String(minimumYear + index);
      return { value, label: value };
    }),
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
    <Card className="p-5 sm:p-6">
      <SegmentedControl
        label="Méthode de saisie de l’âge"
        value={values.ageMode}
        onChange={switchAgeMode}
        items={[
          { value: 'birthDate', label: 'Date de naissance' },
          { value: 'age', label: 'Âge actuel' },
        ]}
      />

      {values.ageMode === 'birthDate' ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <WheelPicker
              label="Jour"
              value={String(parsed.day)}
              options={dayOptions}
              onChange={(value) => setDatePart({ day: Number(value) })}
            />
            <WheelPicker
              label="Mois"
              value={String(parsed.month)}
              options={monthOptions}
              onChange={(value) => setDatePart({ month: Number(value) })}
            />
            <WheelPicker
              label="Année"
              value={String(parsed.year)}
              options={yearOptions}
              onChange={(value) => setDatePart({ year: Number(value) })}
            />
          </div>

          <FormField
            id="onboarding-birth-date"
            label="Saisie manuelle"
            description="Alternative accessible aux sélecteurs."
            error={errors.birthDate}
            className="mt-6"
            required
          >
            <input
              id="onboarding-birth-date"
              type="date"
              min={`${minimumYear}-01-01`}
              max={`${maximumYear}-12-31`}
              value={currentDate}
              onChange={(event) => onChange({ birthDate: event.target.value })}
              className={inputClassName}
              aria-invalid={Boolean(errors.birthDate) || undefined}
              aria-describedby={errors.birthDate ? 'onboarding-birth-date-error' : 'onboarding-birth-date-description'}
            />
          </FormField>
        </>
      ) : (
        <FormField
          id="onboarding-age-years"
          label="Âge actuel"
          error={errors.ageYears}
          className="mt-6"
          required
        >
          <NumericTextInput
            id="onboarding-age-years"
            value={values.ageYears}
            onValueChange={(ageYears) => onChange({ ageYears })}
            inputMode="numeric"
            pattern="[0-9]*"
            min={13}
            max={120}
            step={1}
            className={inputClassName}
            invalid={Boolean(errors.ageYears)}
            describedBy={errors.ageYears ? 'onboarding-age-years-error' : undefined}
          />
        </FormField>
      )}

      {typeof age === 'number' && Number.isFinite(age) ? (
        <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Âge calculé : {Math.round(age)} ans
        </p>
      ) : null}

      <ContextHelp className="mt-5">
        L’âge intervient dans l’équation énergétique. La date complète reste dans le profil privé et n’est pas publiée dans le module social.
      </ContextHelp>
    </Card>
  );
}

function HeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-5 sm:p-6">
      <WheelPicker
        label="Taille"
        value={nearestInteger(values.heightCm, 100, 250, 175)}
        options={heightOptions}
        onChange={(value) => onChange({ heightCm: Number(value) })}
      />

      <FormField
        id="onboarding-height"
        label="Saisie précise en centimètres"
        error={errors.heightCm}
        className="mt-6"
        required
      >
        <NumericTextInput
          id="onboarding-height"
          value={values.heightCm}
          onValueChange={(heightCm) => onChange({ heightCm })}
          min={100}
          max={250}
          step={0.1}
          pattern="[0-9]*[.,]?[0-9]*"
          className={inputClassName}
          invalid={Boolean(errors.heightCm)}
          describedBy={errors.heightCm ? 'onboarding-height-error' : undefined}
        />
      </FormField>

      <ContextHelp className="mt-5">
        La taille est utilisée avec le poids, l’âge et le sexe pour estimer le métabolisme de base.
      </ContextHelp>
    </Card>
  );
}

function WeightStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-5 sm:p-6">
      <WheelPicker
        label="Poids"
        value={nearestInteger(values.initialWeightKg, 30, 350, 70)}
        options={weightOptions}
        onChange={(value) => onChange({ initialWeightKg: Number(value) })}
      />

      <FormField
        id="onboarding-weight"
        label="Saisie précise en kilogrammes"
        error={errors.initialWeightKg}
        className="mt-6"
        required
      >
        <NumericTextInput
          id="onboarding-weight"
          value={values.initialWeightKg}
          onValueChange={(initialWeightKg) => onChange({ initialWeightKg })}
          min={30}
          max={350}
          step={0.1}
          pattern="[0-9]*[.,]?[0-9]*"
          className={inputClassName}
          invalid={Boolean(errors.initialWeightKg)}
          describedBy={errors.initialWeightKg ? 'onboarding-weight-error' : undefined}
        />
      </FormField>

      <ContextHelp className="mt-5" tone="brand">
        Ce poids devient la valeur initiale du profil. S’il n’existe encore aucun historique, une première pesée sera créée à la validation finale.
      </ContextHelp>
    </Card>
  );
}

const goalCards: Array<{
  value: WeightGoal;
  title: string;
  description: string;
  icon: typeof TrendingDown;
}> = [
  {
    value: 'loss',
    title: 'Perdre du poids',
    description: 'Utilise une variation hebdomadaire négative.',
    icon: TrendingDown,
  },
  {
    value: 'maintenance',
    title: 'Maintenir',
    description: 'Conserve une variation hebdomadaire de 0 %.',
    icon: Minus,
  },
  {
    value: 'gain',
    title: 'Prendre du poids ou de la masse',
    description: 'Utilise une variation hebdomadaire positive.',
    icon: TrendingUp,
  },
];

function GoalStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  const chooseGoal = (goal: WeightGoal) => {
    onChange({
      goal,
      targetWeeklyWeightChangePercent: SUGGESTED_WEEKLY_CHANGE_PERCENT[goal],
    });
  };

  return (
    <Card className="p-5 sm:p-6">
      <ChoiceCardGroup label="Objectif de poids" columns={1}>
        {goalCards.map((card) => (
          <ChoiceCard
            key={card.value}
            name="goal"
            value={card.value}
            title={card.title}
            description={card.description}
            icon={card.icon}
            selected={values.goal === card.value}
            onSelect={() => chooseGoal(card.value)}
          />
        ))}
      </ChoiceCardGroup>

      <FormField
        id="onboarding-weekly-change"
        label="Variation hebdomadaire souhaitée"
        description="Pourcentage du poids par semaine."
        error={errors.targetWeeklyWeightChangePercent}
        className="mt-6"
        required
      >
        <div className="relative">
          <NumericTextInput
            id="onboarding-weekly-change"
            value={values.targetWeeklyWeightChangePercent}
            onValueChange={(targetWeeklyWeightChangePercent) =>
              onChange({ targetWeeklyWeightChangePercent })}
            min={-2}
            max={2}
            step={0.05}
            pattern="-?[0-9]*[.,]?[0-9]*"
            className={`${inputClassName} pr-10`}
            invalid={Boolean(errors.targetWeeklyWeightChangePercent)}
            describedBy={errors.targetWeeklyWeightChangePercent
              ? 'onboarding-weekly-change-error'
              : 'onboarding-weekly-change-description'}
            readOnly={values.goal === 'maintenance'}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">%</span>
        </div>
      </FormField>

      <ContextHelp className="mt-5">
        Le maintien force 0 %. Les valeurs proposées pour la perte et la prise reprennent strictement les réglages métier existants ; aucune formule n’est modifiée dans U5.
      </ContextHelp>
    </Card>
  );
}

const activityCards: Array<{
  value: OccupationalActivity;
  title: string;
  description: string;
  icon: typeof Armchair;
}> = [
  {
    value: 'sedentary',
    title: 'Principalement assis',
    description: 'Bureau, études ou conduite avec peu de déplacements.',
    icon: Armchair,
  },
  {
    value: 'lightlyActive',
    title: 'Modérément actif',
    description: 'Déplacements réguliers, station debout ou marche légère.',
    icon: BriefcaseBusiness,
  },
  {
    value: 'active',
    title: 'Physiquement actif',
    description: 'Marche fréquente, manutention légère ou travail mobile.',
    icon: PersonStanding,
  },
  {
    value: 'veryActive',
    title: 'Très physique',
    description: 'Efforts soutenus, manutention lourde ou activité manuelle intense.',
    icon: Dumbbell,
  },
];

function ActivityStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-5 sm:p-6">
      <ChoiceCardGroup
        label="Niveau d’activité professionnelle"
        description={errors.occupationalActivity}
        columns={2}
      >
        {activityCards.map((card) => (
          <ChoiceCard
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
      </ChoiceCardGroup>

      <ContextHelp className="mt-5" tone="brand">
        Ce niveau représente le socle quotidien hors séances sportives ajoutées. Les coefficients actuels sont réutilisés sans modification.
      </ContextHelp>
    </Card>
  );
}

const quickStepGoals = [5_000, 7_500, 10_000, 12_000] as const;

function StepsStep({ values, errors, onChange }: Omit<OnboardingProfileStepProps, 'stepId'>) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="rounded-[var(--sp-radius-card)] bg-brand-50 px-4 py-6 text-center dark:bg-brand-950/30">
        <Footprints aria-hidden="true" className="mx-auto size-7 text-brand-700 dark:text-brand-300" />
        <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
          {Number.isFinite(values.dailyStepGoal)
            ? Math.round(values.dailyStepGoal).toLocaleString('fr-FR')
            : '—'}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">pas par jour</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Valeurs rapides">
        {quickStepGoals.map((goal) => (
          <Button
            key={goal}
            type="button"
            variant={values.dailyStepGoal === goal ? 'primary' : 'secondary'}
            onClick={() => onChange({ dailyStepGoal: goal })}
          >
            {goal.toLocaleString('fr-FR')}
          </Button>
        ))}
      </div>

      <FormField
        id="onboarding-daily-step-goal"
        label="Objectif précis"
        error={errors.dailyStepGoal}
        className="mt-6"
        required
      >
        <NumericTextInput
          id="onboarding-daily-step-goal"
          value={values.dailyStepGoal}
          onValueChange={(dailyStepGoal) => onChange({ dailyStepGoal })}
          inputMode="numeric"
          pattern="[0-9]*"
          min={0}
          max={100_000}
          step={100}
          enterKeyHint="done"
          className={inputClassName}
          invalid={Boolean(errors.dailyStepGoal)}
          describedBy={errors.dailyStepGoal ? 'onboarding-daily-step-goal-error' : undefined}
        />
      </FormField>

      <ContextHelp className="mt-5">
        Cet objectif sert au suivi quotidien. Les pas réellement enregistrés restent distincts de cette cible.
      </ContextHelp>
    </Card>
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
