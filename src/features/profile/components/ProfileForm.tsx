import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { SUGGESTED_WEEKLY_CHANGE_PERCENT } from '@/domain/defaults/userProfile';
import type { WeightGoal } from '@/domain/models/profile';
import {
  profileFormSchema,
  type ProfileFormValues,
} from '@/features/profile/schemas/profileSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  formId?: string;
}

const integerRegistrationOptions = {
  valueAsNumber: true,
} as const;

const decimalRegistrationOptions = {
  setValueAs: (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
    return Number(value.replace(',', '.'));
  },
} as const;

export function ProfileForm({
  initialValues,
  submitLabel,
  onSubmit,
  formId = 'profile-form',
}: ProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  const ageMode = watch('ageMode');
  const goal = watch('goal');
  const goalRegistration = register('goal');

  const handleGoalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void goalRegistration.onChange(event);
    const nextGoal = event.target.value as WeightGoal;
    setValue(
      'targetWeeklyWeightChangePercent',
      SUGGESTED_WEEKLY_CHANGE_PERCENT[nextGoal],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <form
      ref={formRef}
      id={formId}
      noValidate
      onSubmit={handleSubmit(
        async (values) => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          await onSubmit(values);
        },
        () => {
          window.requestAnimationFrame(() => {
            if (formRef.current) focusFirstInvalidField(formRef.current);
          });
        },
      )}
      className="min-w-0 space-y-4 pb-2"
    >
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Certains champs doivent être corrigés">
          Consulte les messages affichés sous les champs concernés avant d’enregistrer.
        </InlineNotice>
      ) : null}

      <CollapsibleSection
        sectionId="profile-personal"
        storageKey="sportpilot:profile:personal"
        title="Informations personnelles"
        description="Identité, âge, taille et poids de référence."
        summary="Essentiel"
        defaultOpen
      >
        <fieldset className="min-w-0 space-y-5">
          <legend className="sr-only">Informations personnelles</legend>

        <FormField
          id="firstName"
          label="Prénom"
          description="Facultatif. Il est uniquement utilisé dans l’interface."
          error={errors.firstName?.message}
        >
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            className={inputClassName}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'firstName-error' : 'firstName-description'}
            {...register('firstName')}
          />
        </FormField>

        <FormField
          id="sexForEnergyEquation"
          label="Sexe utilisé pour l’équation énergétique"
          description="Cette information sert uniquement à l’équation de Mifflin–St Jeor."
          error={errors.sexForEnergyEquation?.message}
          required
        >
          <select
            id="sexForEnergyEquation"
            className={inputClassName}
            aria-invalid={Boolean(errors.sexForEnergyEquation)}
            aria-describedby="sexForEnergyEquation-description"
            {...register('sexForEnergyEquation')}
          >
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </FormField>

        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Méthode de saisie de l’âge <span className="text-red-700 dark:text-red-300">*</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700">
              <input type="radio" value="birthDate" {...register('ageMode')} />
              <span>Date de naissance</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700">
              <input type="radio" value="age" {...register('ageMode')} />
              <span>Âge actuel</span>
            </label>
          </div>
        </div>

        {ageMode === 'birthDate' ? (
          <FormField
            id="birthDate"
            label="Date de naissance"
            error={errors.birthDate?.message}
            required
          >
            <input
              id="birthDate"
              type="date"
              className={inputClassName}
              aria-invalid={Boolean(errors.birthDate)}
              aria-describedby={errors.birthDate ? 'birthDate-error' : undefined}
              {...register('birthDate')}
            />
          </FormField>
        ) : (
          <FormField
            id="ageYears"
            label="Âge"
            error={errors.ageYears?.message}
            required
          >
            <input
              id="ageYears"
              type="number"
              inputMode="numeric"
              min="13"
              max="120"
              step="1"
              className={inputClassName}
              aria-invalid={Boolean(errors.ageYears)}
              aria-describedby={errors.ageYears ? 'ageYears-error' : undefined}
              enterKeyHint="next"
              {...register('ageYears', integerRegistrationOptions)}
            />
          </FormField>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="heightCm"
            label="Taille en centimètres"
            error={errors.heightCm?.message}
            required
          >
            <input
              id="heightCm"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              pattern="[0-9]*[.,]?[0-9]*"
              min="100"
              max="250"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.heightCm)}
              aria-describedby={errors.heightCm ? 'heightCm-error' : undefined}
              {...register('heightCm', decimalRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="initialWeightKg"
            label="Poids actuel en kilogrammes"
            description="Le poids initial sert de valeur de secours tant qu’aucune pesée quotidienne antérieure n’existe."
            error={errors.initialWeightKg?.message}
            required
          >
            <input
              id="initialWeightKg"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              pattern="[0-9]*[.,]?[0-9]*"
              min="30"
              max="350"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.initialWeightKg)}
              aria-describedby={errors.initialWeightKg ? 'initialWeightKg-error' : 'initialWeightKg-description'}
              {...register('initialWeightKg', decimalRegistrationOptions)}
            />
          </FormField>
        </div>
        </fieldset>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="profile-goal"
        storageKey="sportpilot:profile:goal"
        title="Objectif et activité quotidienne"
        description="Objectif de poids, activité professionnelle et pas quotidiens."
        summary="Suivi"
        defaultOpen
      >
        <fieldset className="min-w-0 space-y-5">
          <legend className="sr-only">Objectif et activité quotidienne</legend>

        <FormField id="goal" label="Objectif" error={errors.goal?.message} required>
          <select
            id="goal"
            className={inputClassName}
            aria-invalid={Boolean(errors.goal)}
            {...goalRegistration}
            onChange={handleGoalChange}
          >
            <option value="loss">Perte de poids</option>
            <option value="maintenance">Maintien</option>
            <option value="gain">Prise de poids</option>
          </select>
        </FormField>

        <FormField
          id="targetWeeklyWeightChangePercent"
          label="Variation hebdomadaire souhaitée"
          description="Pourcentage du poids par semaine. Valeur négative pour une perte et positive pour une prise."
          error={errors.targetWeeklyWeightChangePercent?.message}
          required
        >
          <div className="relative">
            <input
              id="targetWeeklyWeightChangePercent"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              pattern="-?[0-9]*[.,]?[0-9]*"
              min="-2"
              max="2"
              step="0.05"
              readOnly={goal === 'maintenance'}
              className={`${inputClassName} pr-10`}
              aria-invalid={Boolean(errors.targetWeeklyWeightChangePercent)}
              aria-describedby={
                errors.targetWeeklyWeightChangePercent
                  ? 'targetWeeklyWeightChangePercent-error'
                  : 'targetWeeklyWeightChangePercent-description'
              }
              {...register('targetWeeklyWeightChangePercent', decimalRegistrationOptions)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">%</span>
          </div>
        </FormField>

        <FormField
          id="occupationalActivity"
          label="Activité professionnelle"
          description="Ce niveau représente le socle quotidien hors activités sportives ajoutées."
          error={errors.occupationalActivity?.message}
          required
        >
          <select
            id="occupationalActivity"
            className={inputClassName}
            aria-invalid={Boolean(errors.occupationalActivity)}
            aria-describedby="occupationalActivity-description"
            {...register('occupationalActivity')}
          >
            <option value="sedentary">Assis</option>
            <option value="lightlyActive">Légèrement actif</option>
            <option value="active">Actif</option>
            <option value="veryActive">Très actif</option>
          </select>
        </FormField>

        <FormField
          id="dailyStepGoal"
          label="Objectif quotidien de pas"
          error={errors.dailyStepGoal?.message}
          required
        >
          <input
            id="dailyStepGoal"
            type="number"
            inputMode="numeric"
            min="0"
            max="100000"
            step="100"
            className={inputClassName}
            aria-invalid={Boolean(errors.dailyStepGoal)}
            aria-describedby={errors.dailyStepGoal ? 'dailyStepGoal-error' : undefined}
            enterKeyHint="next"
            {...register('dailyStepGoal', integerRegistrationOptions)}
          />
        </FormField>
        </fieldset>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="profile-macros"
        storageKey="sportpilot:profile:macros"
        title="Cibles de macronutriments"
        description="Coefficients de protéines et de lipides utilisés dans les calculs."
        summary="Avancé"
      >
        <fieldset className="min-w-0 space-y-5">
          <legend className="sr-only">Cibles de macronutriments</legend>

        <InlineNotice title="Des coefficients ajustables">
          Les valeurs par défaut sont de 1,8 g/kg de protéines et 0,9 g/kg de lipides. Les glucides sont calculés avec les calories restantes.
        </InlineNotice>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="proteinGramsPerKg"
            label="Protéines en g/kg"
            error={errors.proteinGramsPerKg?.message}
            required
          >
            <input
              id="proteinGramsPerKg"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              pattern="[0-9]*[.,]?[0-9]*"
              min="0.5"
              max="4"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.proteinGramsPerKg)}
              aria-describedby={errors.proteinGramsPerKg ? 'proteinGramsPerKg-error' : undefined}
              {...register('proteinGramsPerKg', decimalRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="fatGramsPerKg"
            label="Lipides en g/kg"
            error={errors.fatGramsPerKg?.message}
            required
          >
            <input
              id="fatGramsPerKg"
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              pattern="[0-9]*[.,]?[0-9]*"
              min="0.3"
              max="2"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.fatGramsPerKg)}
              aria-describedby={errors.fatGramsPerKg ? 'fatGramsPerKg-error' : undefined}
              {...register('fatGramsPerKg', decimalRegistrationOptions)}
            />
          </FormField>
        </div>
        </fieldset>
      </CollapsibleSection>

      <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
          <Save aria-hidden="true" className="size-5" />
          {isSubmitting ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
