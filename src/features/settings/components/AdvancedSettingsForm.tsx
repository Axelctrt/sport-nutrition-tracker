import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  settingsFormSchema,
  type SettingsFormValues,
} from '@/features/settings/schemas/settingsSchema';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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
    setIsResetting(true);
    try {
      const defaultValues = await onResetToDefaults();
      reset(defaultValues);
      setResetDialogOpen(false);
    } catch {
      // Le parent affiche déjà le message d’erreur approprié.
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit(onSubmit, () => {
          window.requestAnimationFrame(() => {
            if (formRef.current) focusFirstInvalidField(formRef.current);
          });
        })}
        className="space-y-4"
      >
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Certains paramètres sont invalides">
          Corrige les champs signalés avant d’enregistrer.
        </InlineNotice>
      ) : null}

      <CollapsibleSection
        title="Affichage et stockage"
        description="Thème de l’application et protection du stockage local."
        summary="Essentiel"
        defaultOpen
      >
        <fieldset className="space-y-5">
          <legend className="sr-only">Affichage et stockage</legend>

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
      </CollapsibleSection>

      <CollapsibleSection
        title="Dépense quotidienne et activités"
        description="Seuils de pas, coefficients et valeurs MET par défaut."
        summary="Calculs"
      >
        <fieldset className="space-y-5">
          <legend className="sr-only">Dépense quotidienne et activités</legend>

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
              inputMode="numeric"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
              inputMode="decimal"
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Valeurs MET de natation"
        description="Intensités utilisées selon le type de séance."
        summary="6 valeurs"
      >
        <fieldset className="space-y-5">
          <legend className="sr-only">Valeurs MET de natation</legend>

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
                inputMode="decimal"
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Calibration hebdomadaire"
        description="Limites appliquées aux propositions du bilan hebdomadaire."
        summary="Sécurité"
      >
        <fieldset className="space-y-5">
          <legend className="sr-only">Calibration hebdomadaire</legend>

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
              inputMode="numeric"
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
              inputMode="numeric"
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
      </CollapsibleSection>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting || isResetting}
          onClick={() => setResetDialogOpen(true)}
        >
          <RotateCcw aria-hidden="true" className="size-5" />
          Rétablir les valeurs par défaut
        </Button>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting || isResetting}>
          <Save aria-hidden="true" className="size-5" />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </Button>
      </div>
      </form>

      <ConfirmationDialog
        open={resetDialogOpen}
        title="Rétablir les paramètres par défaut ?"
        description="Les coefficients personnalisés seront remplacés par les valeurs recommandées de SportPilot. Les données de suivi ne seront pas supprimées."
        confirmLabel="Rétablir"
        isPending={isResetting}
        onConfirm={() => void handleReset()}
        onCancel={() => setResetDialogOpen(false)}
      />
    </>
  );
}
