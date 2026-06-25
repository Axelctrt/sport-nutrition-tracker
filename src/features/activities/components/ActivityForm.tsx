import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { estimateActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateRunningPaceSecondsPerKm, calculateRunningSteps, formatPace } from '@/domain/calculations/running';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import type { ActivityType } from '@/domain/models/activity';
import type { AppSettings } from '@/domain/models/settings';
import {
  activityFormSchema,
  type ActivityFormValues,
} from '@/features/activities/schemas/activityFormSchema';
import {
  activityTypeLabels,
  intensityLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
} from '@/features/activities/utils/activityLabels';
import { toActivityDraft } from '@/features/activities/utils/activityForm';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface ActivityFormProps {
  initialValues: ActivityFormValues;
  allowedTypes: readonly ActivityType[];
  settings: AppSettings;
  calculationWeightKg: number;
  calculationWeightSource: string;
  submitLabel: string;
  onDateChange: (date: string) => void;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
}

const numberRegistration = { valueAsNumber: true } as const;
const optionalNumberRegistration = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
} as const;

function formatSwimmingPace(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min/100 m`;
}

export function ActivityForm({
  initialValues,
  allowedTypes,
  settings,
  calculationWeightKg,
  calculationWeightSource,
  submitLabel,
  onDateChange,
  onSubmit,
}: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const values = watch();
  const activityType = values.activityType;

  useEffect(() => {
    onDateChange(values.date);
  }, [onDateChange, values.date]);

  const preview = useMemo(() => {
    const parsed = activityFormSchema.safeParse(values);
    if (!parsed.success) {
      return undefined;
    }

    const draft = toActivityDraft(parsed.data);
    const calculation = estimateActivityCalories(draft, calculationWeightKg, settings);
    return {
      calculation,
      effectiveCalories: parsed.data.manualCaloriesKcal
        ?? calculation.estimatedCaloriesKcal,
      runningPace: parsed.data.activityType === 'running' && parsed.data.distanceKm
        ? formatPace(
            calculateRunningPaceSecondsPerKm(
              parsed.data.durationMinutes,
              parsed.data.distanceKm,
            ),
          ) + ' min/km'
        : undefined,
      runningSteps: parsed.data.activityType === 'running' && parsed.data.averageCadenceSpm
        ? calculateRunningSteps(
            parsed.data.durationMinutes,
            parsed.data.averageCadenceSpm,
          )
        : undefined,
      swimmingPace: parsed.data.activityType === 'swimming' && parsed.data.distanceMeters
        ? formatSwimmingPace(
            calculateSwimmingPaceSecondsPer100Meters(
              parsed.data.durationMinutes,
              parsed.data.distanceMeters,
            ),
          )
        : undefined,
    };
  }, [calculationWeightKg, settings, values]);

  const changeActivityType = (nextType: ActivityType) => {
    setValue('activityType', nextType, { shouldDirty: true, shouldValidate: true });
    if (nextType === 'strengthTraining') {
      setValue('met', settings.strengthTrainingMet, { shouldDirty: true });
    } else if (nextType === 'cycling') {
      setValue('met', settings.defaultCyclingMet, { shouldDirty: true });
    } else if (nextType === 'walking') {
      setValue('met', settings.defaultWalkingMet, { shouldDirty: true });
      setValue('includedInDailySteps', true, { shouldDirty: true });
    } else if (nextType === 'otherCardio') {
      setValue('met', settings.defaultOtherCardioMet, { shouldDirty: true });
      setValue('includedInDailySteps', false, { shouldDirty: true });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Saisie à corriger">
          Vérifie les champs signalés avant d’enregistrer l’activité.
        </InlineNotice>
      ) : null}

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Informations générales</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {allowedTypes.length > 1 ? (
            <FormField id="activityType" label="Type d’activité" error={errors.activityType?.message} required>
              <select
                id="activityType"
                className={inputClassName}
                value={activityType}
                onChange={(event) => changeActivityType(event.target.value as ActivityType)}
              >
                {allowedTypes.map((type) => (
                  <option key={type} value={type}>{activityTypeLabels[type]}</option>
                ))}
              </select>
            </FormField>
          ) : (
            <input type="hidden" {...register('activityType')} />
          )}

          <FormField id="activity-date" label="Date" error={errors.date?.message} required>
            <input
              id="activity-date"
              type="date"
              className={inputClassName}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'activity-date-error' : undefined}
              {...register('date')}
            />
          </FormField>

          <FormField id="activity-time" label="Heure" description="Facultative." error={errors.time?.message}>
            <input
              id="activity-time"
              type="time"
              className={inputClassName}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={errors.time ? 'activity-time-error' : 'activity-time-description'}
              {...register('time')}
            />
          </FormField>

          <FormField id="activity-duration" label="Durée en minutes" error={errors.durationMinutes?.message} required>
            <input
              id="activity-duration"
              type="number"
              min="1"
              max="1440"
              step="1"
              inputMode="numeric"
              className={inputClassName}
              aria-invalid={Boolean(errors.durationMinutes)}
              aria-describedby={errors.durationMinutes ? 'activity-duration-error' : undefined}
              {...register('durationMinutes', numberRegistration)}
            />
          </FormField>

          <FormField id="activity-intensity" label="Intensité" error={errors.intensity?.message} required>
            <select id="activity-intensity" className={inputClassName} {...register('intensity')}>
              {Object.entries(intensityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      {activityType === 'running' ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Données de course</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <FormField id="running-session-type" label="Type de séance" error={errors.runningSessionType?.message} required>
              <select id="running-session-type" className={inputClassName} {...register('runningSessionType')}>
                {Object.entries(runningSessionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField id="running-distance" label="Distance en kilomètres" error={errors.distanceKm?.message} required>
              <input
                id="running-distance"
                type="number"
                min="0.1"
                max="1000"
                step="0.01"
                inputMode="decimal"
                className={inputClassName}
                aria-invalid={Boolean(errors.distanceKm)}
                aria-describedby={errors.distanceKm ? 'running-distance-error' : undefined}
                {...register('distanceKm', optionalNumberRegistration)}
              />
            </FormField>
            <FormField
              id="running-cadence"
              label="Cadence moyenne en pas/min"
              description="Elle sert à retirer les pas de course du total quotidien."
              error={errors.averageCadenceSpm?.message}
              required
            >
              <input
                id="running-cadence"
                type="number"
                min="50"
                max="300"
                step="1"
                inputMode="numeric"
                className={inputClassName}
                aria-invalid={Boolean(errors.averageCadenceSpm)}
                aria-describedby={errors.averageCadenceSpm ? 'running-cadence-error' : 'running-cadence-description'}
                {...register('averageCadenceSpm', optionalNumberRegistration)}
              />
            </FormField>
          </div>
        </Card>
      ) : null}

      {activityType === 'swimming' ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Données de natation</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <FormField id="swimming-session-type" label="Type de séance" error={errors.swimmingSessionType?.message} required>
              <select id="swimming-session-type" className={inputClassName} {...register('swimmingSessionType')}>
                {Object.entries(swimmingSessionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField id="main-stroke" label="Nage principale" error={errors.mainStroke?.message} required>
              <select id="main-stroke" className={inputClassName} {...register('mainStroke')}>
                {Object.entries(strokeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField id="swimming-distance" label="Distance en mètres" error={errors.distanceMeters?.message} required>
              <input
                id="swimming-distance"
                type="number"
                min="25"
                max="100000"
                step="25"
                inputMode="numeric"
                className={inputClassName}
                aria-invalid={Boolean(errors.distanceMeters)}
                aria-describedby={errors.distanceMeters ? 'swimming-distance-error' : undefined}
                {...register('distanceMeters', optionalNumberRegistration)}
              />
            </FormField>
          </div>
        </Card>
      ) : null}

      {['strengthTraining', 'cycling', 'walking', 'otherCardio'].includes(activityType) ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Estimation MET</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <FormField
              id="activity-met"
              label="Valeur MET"
              description="Modifiable pour adapter l’estimation à l’intensité réelle."
              error={errors.met?.message}
              required
            >
              <input
                id="activity-met"
                type="number"
                min="1"
                max="25"
                step="0.1"
                inputMode="decimal"
                className={inputClassName}
                aria-invalid={Boolean(errors.met)}
                aria-describedby={errors.met ? 'activity-met-error' : 'activity-met-description'}
                {...register('met', optionalNumberRegistration)}
              />
            </FormField>
            {activityType === 'walking' ? (
              <div className="md:self-end">
                <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <input type="checkbox" className={checkboxClassName} {...register('includedInDailySteps')} />
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-white">Déjà comprise dans les pas quotidiens</span>
                    <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">Coché par défaut pour éviter de compter deux fois la marche.</span>
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Ressenti et correction</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FormField
            id="manual-calories"
            label="Calories corrigées manuellement"
            description="Facultatif. Cette valeur remplacera l’estimation automatique."
            error={errors.manualCaloriesKcal?.message}
          >
            <input
              id="manual-calories"
              type="number"
              min="0"
              max="10000"
              step="1"
              inputMode="numeric"
              className={inputClassName}
              aria-invalid={Boolean(errors.manualCaloriesKcal)}
              aria-describedby={errors.manualCaloriesKcal ? 'manual-calories-error' : 'manual-calories-description'}
              {...register('manualCaloriesKcal', optionalNumberRegistration)}
            />
          </FormField>
          <FormField id="activity-notes" label="Notes et ressentis" error={errors.notes?.message}>
            <textarea
              id="activity-notes"
              rows={4}
              className={inputClassName}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'activity-notes-error' : undefined}
              {...register('notes')}
            />
          </FormField>
        </div>
      </Card>

      <Card className="border-brand-200 bg-brand-50/70 p-5 dark:border-brand-900 dark:bg-brand-950/30 sm:p-6" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Calculator aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Aperçu du calcul</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Poids utilisé : {calculationWeightKg.toLocaleString('fr-FR')} kg ({calculationWeightSource}).
            </p>
          </div>
        </div>
        {preview ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
              <dt className="text-slate-500 dark:text-slate-400">Estimation</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(preview.calculation.estimatedCaloriesKcal)} kcal</dd>
            </div>
            <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
              <dt className="text-slate-500 dark:text-slate-400">Calories retenues</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(preview.effectiveCalories)} kcal</dd>
            </div>
            {preview.runningPace ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-slate-500 dark:text-slate-400">Allure</dt>
                <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{preview.runningPace}</dd>
              </div>
            ) : null}
            {preview.runningSteps !== undefined ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-slate-500 dark:text-slate-400">Pas de course</dt>
                <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{preview.runningSteps.toLocaleString('fr-FR')}</dd>
              </div>
            ) : null}
            {preview.swimmingPace ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-slate-500 dark:text-slate-400">Allure</dt>
                <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{preview.swimmingPace}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Complète les champs obligatoires pour afficher l’estimation.</p>
        )}
      </Card>

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-5" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
