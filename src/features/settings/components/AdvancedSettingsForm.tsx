import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  settingsFormSchema,
  type SettingsFormValues,
} from '@/features/settings/schemas/settingsSchema';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface AdvancedSettingsFormProps {
  initialValues: SettingsFormValues;
  onSubmit: (values: SettingsFormValues) => Promise<void>;
  onResetToDefaults: () => Promise<SettingsFormValues>;
}

const numericRegistrationOptions = {
  valueAsNumber: true,
} as const;

export function AdvancedSettingsForm({
  initialValues,
  onSubmit,
  onResetToDefaults,
}: AdvancedSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handleReset = async () => {
    try {
      const defaultValues = await onResetToDefaults();
      reset(defaultValues);
    } catch {
      // Le parent affiche déjà le message d’erreur approprié.
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Certains paramètres sont invalides">
          Corrige les champs signalés avant d’enregistrer.
        </InlineNotice>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-slate-950 dark:text-white">
          Affichage et stockage
        </legend>

        <FormField id="theme" label="Thème de l’application" error={errors.theme?.message} required>
          <select id="theme" className={inputClassName} {...register('theme')}>
            <option value="system">Suivre le système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </FormField>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <input
            type="checkbox"
            className={`${checkboxClassName} mt-0.5`}
            {...register('requestPersistentStorage')}
          />
          <span>
            <span className="block font-semibold text-slate-950 dark:text-white">
              Demander un stockage persistant
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le navigateur reste libre d’accepter ou de refuser. L’export JSON restera la sauvegarde de référence.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
        <legend className="text-lg font-semibold text-slate-950 dark:text-white">
          Dépense quotidienne et activités
        </legend>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="includedBaseSteps"
            label="Pas inclus dans le socle"
            description="Seuls les pas hors course au-dessus de ce seuil génèrent une dépense supplémentaire."
            error={errors.includedBaseSteps?.message}
            required
          >
            <input
              id="includedBaseSteps"
              type="number"
              min="0"
              max="30000"
              step="100"
              className={inputClassName}
              aria-invalid={Boolean(errors.includedBaseSteps)}
              aria-describedby={errors.includedBaseSteps ? 'includedBaseSteps-error' : 'includedBaseSteps-description'}
              {...register('includedBaseSteps', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="calorieFloorBmrMultiplier"
            label="Plancher calorique × BMR"
            description="Valeur minimale appliquée à la future cible calorique."
            error={errors.calorieFloorBmrMultiplier?.message}
            required
          >
            <input
              id="calorieFloorBmrMultiplier"
              type="number"
              min="1"
              max="2"
              step="0.05"
              className={inputClassName}
              aria-invalid={Boolean(errors.calorieFloorBmrMultiplier)}
              aria-describedby={errors.calorieFloorBmrMultiplier ? 'calorieFloorBmrMultiplier-error' : 'calorieFloorBmrMultiplier-description'}
              {...register('calorieFloorBmrMultiplier', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="walkingKcalPerKgPerKm"
            label="Coefficient de marche"
            description="kcal par kilogramme et par kilomètre."
            error={errors.walkingKcalPerKgPerKm?.message}
            required
          >
            <input
              id="walkingKcalPerKgPerKm"
              type="number"
              min="0.1"
              max="2"
              step="0.05"
              className={inputClassName}
              aria-invalid={Boolean(errors.walkingKcalPerKgPerKm)}
              aria-describedby={errors.walkingKcalPerKgPerKm ? 'walkingKcalPerKgPerKm-error' : 'walkingKcalPerKgPerKm-description'}
              {...register('walkingKcalPerKgPerKm', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="runningKcalPerKgPerKm"
            label="Coefficient de course"
            description="kcal par kilogramme et par kilomètre."
            error={errors.runningKcalPerKgPerKm?.message}
            required
          >
            <input
              id="runningKcalPerKgPerKm"
              type="number"
              min="0.5"
              max="2"
              step="0.05"
              className={inputClassName}
              aria-invalid={Boolean(errors.runningKcalPerKgPerKm)}
              aria-describedby={errors.runningKcalPerKgPerKm ? 'runningKcalPerKgPerKm-error' : 'runningKcalPerKgPerKm-description'}
              {...register('runningKcalPerKgPerKm', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="strengthTrainingMet"
            label="MET musculation"
            error={errors.strengthTrainingMet?.message}
            required
          >
            <input
              id="strengthTrainingMet"
              type="number"
              min="1"
              max="20"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.strengthTrainingMet)}
              aria-describedby={errors.strengthTrainingMet ? 'strengthTrainingMet-error' : undefined}
              {...register('strengthTrainingMet', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="defaultCyclingMet"
            label="MET vélo par défaut"
            error={errors.defaultCyclingMet?.message}
            required
          >
            <input
              id="defaultCyclingMet"
              type="number"
              min="1"
              max="20"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.defaultCyclingMet)}
              aria-describedby={errors.defaultCyclingMet ? 'defaultCyclingMet-error' : undefined}
              {...register('defaultCyclingMet', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="defaultWalkingMet"
            label="MET marche par défaut"
            error={errors.defaultWalkingMet?.message}
            required
          >
            <input
              id="defaultWalkingMet"
              type="number"
              min="1"
              max="20"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.defaultWalkingMet)}
              aria-describedby={errors.defaultWalkingMet ? 'defaultWalkingMet-error' : undefined}
              {...register('defaultWalkingMet', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="defaultOtherCardioMet"
            label="MET autre cardio par défaut"
            error={errors.defaultOtherCardioMet?.message}
            required
          >
            <input
              id="defaultOtherCardioMet"
              type="number"
              min="1"
              max="20"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.defaultOtherCardioMet)}
              aria-describedby={errors.defaultOtherCardioMet ? 'defaultOtherCardioMet-error' : undefined}
              {...register('defaultOtherCardioMet', numericRegistrationOptions)}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
        <legend className="text-lg font-semibold text-slate-950 dark:text-white">
          Valeurs MET de natation
        </legend>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ['recovery', 'Récupération'],
            ['technique', 'Technique'],
            ['endurance', 'Endurance'],
            ['tempo', 'Tempo'],
            ['intervals', 'Intervalles'],
            ['competition', 'Compétition'],
          ] as const).map(([key, label]) => (
            <FormField
              key={key}
              id={`swimmingMetValues.${key}`}
              label={label}
              error={errors.swimmingMetValues?.[key]?.message}
              required
            >
              <input
                id={`swimmingMetValues.${key}`}
                type="number"
                min="1"
                max="20"
                step="0.1"
                className={inputClassName}
                aria-invalid={Boolean(errors.swimmingMetValues?.[key])}
                aria-describedby={errors.swimmingMetValues?.[key] ? `swimmingMetValues.${key}-error` : undefined}
                {...register(`swimmingMetValues.${key}`, numericRegistrationOptions)}
              />
            </FormField>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
        <legend className="text-lg font-semibold text-slate-950 dark:text-white">
          Calibration hebdomadaire
        </legend>

        <InlineNotice title="Aucun ajustement automatique">
          Ces limites encadrent uniquement les propositions du bilan hebdomadaire. Une modification doit toujours être acceptée explicitement.
        </InlineNotice>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="maximumWeeklyAdjustmentKcal"
            label="Correction maximale par semaine"
            description="Valeur absolue en kcal par jour."
            error={errors.maximumWeeklyAdjustmentKcal?.message}
            required
          >
            <input
              id="maximumWeeklyAdjustmentKcal"
              type="number"
              min="10"
              max="500"
              step="10"
              className={inputClassName}
              aria-invalid={Boolean(errors.maximumWeeklyAdjustmentKcal)}
              aria-describedby={errors.maximumWeeklyAdjustmentKcal ? 'maximumWeeklyAdjustmentKcal-error' : 'maximumWeeklyAdjustmentKcal-description'}
              {...register('maximumWeeklyAdjustmentKcal', numericRegistrationOptions)}
            />
          </FormField>

          <FormField
            id="maximumCumulativeAdjustmentKcal"
            label="Correction cumulée maximale"
            description="Valeur absolue en kcal par jour."
            error={errors.maximumCumulativeAdjustmentKcal?.message}
            required
          >
            <input
              id="maximumCumulativeAdjustmentKcal"
              type="number"
              min="100"
              max="2000"
              step="50"
              className={inputClassName}
              aria-invalid={Boolean(errors.maximumCumulativeAdjustmentKcal)}
              aria-describedby={errors.maximumCumulativeAdjustmentKcal ? 'maximumCumulativeAdjustmentKcal-error' : 'maximumCumulativeAdjustmentKcal-description'}
              {...register('maximumCumulativeAdjustmentKcal', numericRegistrationOptions)}
            />
          </FormField>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={isSubmitting}
          onClick={() => void handleReset()}
        >
          <RotateCcw aria-hidden="true" className="size-5" />
          Rétablir les valeurs par défaut
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          <Save aria-hidden="true" className="size-5" />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </Button>
      </div>
    </form>
  );
}
