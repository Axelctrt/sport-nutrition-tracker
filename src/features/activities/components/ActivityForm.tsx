import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, ChevronDown, Save } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { estimateActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateRunningPaceSecondsPerKm, calculateRunningSteps, formatPace } from '@/domain/calculations/running';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import { calculateAverageSpeedKmh, calculatePoolLengths } from '@/domain/calculations/endurance';
import type { ActivityType } from '@/domain/models/activity';
import type { AppSettings } from '@/domain/models/settings';
import {
  activityFormSchema,
  type ActivityFormValues,
} from '@/features/activities/schemas/activityFormSchema';
import {
  activityTypeLabels,
  bikeTypeLabels,
  cyclingEnvironmentLabels,
  intensityLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
  terrainLabels,
} from '@/features/activities/utils/activityLabels';
import { toActivityDraft } from '@/features/activities/utils/activityForm';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';
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
  const formRef = useRef<HTMLFormElement>(null);
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
  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    onDateChange(values.date);
  }, [onDateChange, values.date]);

  useEffect(() => {
    if (submitCount === 0 || errorCount === 0 || !formRef.current) return;
    window.requestAnimationFrame(() => {
      if (formRef.current) focusFirstInvalidField(formRef.current);
    });
  }, [errorCount, submitCount]);

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
        ? `${formatPace(calculateRunningPaceSecondsPerKm(parsed.data.durationMinutes, parsed.data.distanceKm))} min/km`
        : undefined,
      runningSteps: parsed.data.activityType === 'running' && parsed.data.averageCadenceSpm
        ? calculateRunningSteps(parsed.data.durationMinutes, parsed.data.averageCadenceSpm)
        : undefined,
      swimmingPace: parsed.data.activityType === 'swimming' && parsed.data.distanceMeters
        ? formatSwimmingPace(
            calculateSwimmingPaceSecondsPer100Meters(
              parsed.data.durationMinutes,
              parsed.data.distanceMeters,
            ),
          )
        : undefined,
      swimmingLengths: parsed.data.activityType === 'swimming' && parsed.data.distanceMeters
        ? calculatePoolLengths(parsed.data.distanceMeters, parsed.data.poolLengthMeters)
        : undefined,
      cyclingSpeed: parsed.data.activityType === 'cycling' && parsed.data.distanceKm
        ? calculateAverageSpeedKmh(parsed.data.durationMinutes, parsed.data.distanceKm)
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

  const optionalSectionHasErrors = Boolean(errors.manualCaloriesKcal || errors.notes);

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitCount > 0 && errorCount > 0 ? (
        <InlineNotice tone="error" title="Saisie à corriger">
          Vérifie les champs signalés avant d’enregistrer l’activité.
        </InlineNotice>
      ) : null}

      <Card className="overflow-hidden">
        <section className="p-4 sm:p-5" aria-labelledby="activity-general-title">
          <h2 id="activity-general-title" className="font-semibold text-slate-950 dark:text-white">
            Informations principales
          </h2>

          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
            {allowedTypes.length > 1 ? (
              <div className="col-span-2">
                <FormField id="activityType" label="Type d’activité" error={errors.activityType?.message} required>
                  <select
                    id="activityType"
                    className={inputClassName}
                    value={activityType}
                    aria-invalid={Boolean(errors.activityType)}
                    onChange={(event) => changeActivityType(event.target.value as ActivityType)}
                  >
                    {allowedTypes.map((type) => (
                      <option key={type} value={type}>{activityTypeLabels[type]}</option>
                    ))}
                  </select>
                </FormField>
              </div>
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

            <FormField id="activity-time" label="Heure" description="Facultative" error={errors.time?.message}>
              <input
                id="activity-time"
                type="time"
                className={inputClassName}
                aria-invalid={Boolean(errors.time)}
                aria-describedby={errors.time ? 'activity-time-error' : 'activity-time-description'}
                {...register('time')}
              />
            </FormField>

            <FormField id="activity-duration" label="Durée (min)" error={errors.durationMinutes?.message} required>
              <input
                id="activity-duration"
                type="number"
                min="1"
                max="1440"
                step="1"
                inputMode="numeric"
                enterKeyHint="next"
                className={inputClassName}
                aria-invalid={Boolean(errors.durationMinutes)}
                aria-describedby={errors.durationMinutes ? 'activity-duration-error' : undefined}
                {...register('durationMinutes', numberRegistration)}
              />
            </FormField>

            <FormField id="activity-intensity" label="Intensité" error={errors.intensity?.message} required>
              <select
                id="activity-intensity"
                className={inputClassName}
                aria-invalid={Boolean(errors.intensity)}
                {...register('intensity')}
              >
                {Object.entries(intensityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
          </div>
        </section>

        {activityType === 'running' ? (
          <section className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="running-data-title">
            <h2 id="running-data-title" className="font-semibold text-slate-950 dark:text-white">Course</h2>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="sm:col-span-2">
                <FormField id="running-session-type" label="Type de séance" error={errors.runningSessionType?.message} required>
                  <select
                    id="running-session-type"
                    className={inputClassName}
                    aria-invalid={Boolean(errors.runningSessionType)}
                    {...register('runningSessionType')}
                  >
                    {Object.entries(runningSessionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField id="running-distance" label="Distance (km)" error={errors.distanceKm?.message} required>
                <input
                  id="running-distance"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.01"
                  inputMode="decimal"
                  enterKeyHint="next"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.distanceKm)}
                  aria-describedby={errors.distanceKm ? 'running-distance-error' : undefined}
                  {...register('distanceKm', optionalNumberRegistration)}
                />
              </FormField>
              <FormField
                id="running-cadence"
                label="Cadence (pas/min)"
                description="Retire les pas de course du podomètre."
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
                  enterKeyHint="done"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.averageCadenceSpm)}
                  aria-describedby={errors.averageCadenceSpm ? 'running-cadence-error' : 'running-cadence-description'}
                  {...register('averageCadenceSpm', optionalNumberRegistration)}
                />
              </FormField>
              <FormField id="running-terrain" label="Terrain" error={errors.terrainType?.message}>
                <select id="running-terrain" className={inputClassName} {...register('terrainType')}>
                  {Object.entries(terrainLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="running-elevation" label="Dénivelé positif (m)" description="Facultatif" error={errors.elevationGainMeters?.message}>
                <input
                  id="running-elevation"
                  type="number"
                  min="0"
                  max="50000"
                  step="1"
                  inputMode="numeric"
                  className={inputClassName}
                  {...register('elevationGainMeters', optionalNumberRegistration)}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="running-intervals" label="Segments ou intervalles" description="Facultatif, par exemple 10 × 400 m en 1:35, récupération 1 min." error={errors.intervalDetails?.message}>
                  <textarea id="running-intervals" rows={3} className={inputClassName} {...register('intervalDetails')} />
                </FormField>
              </div>
            </div>
          </section>
        ) : null}

        {activityType === 'swimming' ? (
          <section className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="swimming-data-title">
            <h2 id="swimming-data-title" className="font-semibold text-slate-950 dark:text-white">Natation</h2>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField id="swimming-session-type" label="Type de séance" error={errors.swimmingSessionType?.message} required>
                <select
                  id="swimming-session-type"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.swimmingSessionType)}
                  {...register('swimmingSessionType')}
                >
                  {Object.entries(swimmingSessionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="main-stroke" label="Nage principale" error={errors.mainStroke?.message} required>
                <select
                  id="main-stroke"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.mainStroke)}
                  {...register('mainStroke')}
                >
                  {Object.entries(strokeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="swimming-distance" label="Distance (m)" error={errors.distanceMeters?.message} required>
                <input
                  id="swimming-distance"
                  type="number"
                  min="25"
                  max="100000"
                  step="25"
                  inputMode="numeric"
                  enterKeyHint="next"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.distanceMeters)}
                  aria-describedby={errors.distanceMeters ? 'swimming-distance-error' : undefined}
                  {...register('distanceMeters', optionalNumberRegistration)}
                />
              </FormField>
              <FormField id="pool-length" label="Longueur du bassin" description="Facultative" error={errors.poolLengthMeters?.message}>
                <select id="pool-length" className={inputClassName} {...register('poolLengthMeters', optionalNumberRegistration)}>
                  <option value="">Non renseignée</option>
                  <option value="25">25 m</option>
                  <option value="50">50 m</option>
                </select>
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="swimming-intervals" label="Séries ou intervalles" description="Facultatif, par exemple 6 × 200 m crawl, récupération 30 s." error={errors.intervalDetails?.message}>
                  <textarea id="swimming-intervals" rows={3} className={inputClassName} {...register('intervalDetails')} />
                </FormField>
              </div>
            </div>
          </section>
        ) : null}

        {activityType === 'cycling' ? (
          <section className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="cycling-data-title">
            <h2 id="cycling-data-title" className="font-semibold text-slate-950 dark:text-white">Vélo</h2>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField id="cycling-distance" label="Distance (km)" error={errors.distanceKm?.message} required>
                <input id="cycling-distance" type="number" min="0.1" max="1000" step="0.1" inputMode="decimal" className={inputClassName} {...register('distanceKm', optionalNumberRegistration)} />
              </FormField>
              <FormField id="cycling-elevation" label="Dénivelé positif (m)" description="Facultatif" error={errors.elevationGainMeters?.message}>
                <input id="cycling-elevation" type="number" min="0" max="50000" step="1" inputMode="numeric" className={inputClassName} {...register('elevationGainMeters', optionalNumberRegistration)} />
              </FormField>
              <FormField id="bike-type" label="Type de vélo" error={errors.bikeType?.message}>
                <select id="bike-type" className={inputClassName} {...register('bikeType')}>
                  {Object.entries(bikeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField id="cycling-environment" label="Environnement" error={errors.cyclingEnvironment?.message}>
                <select id="cycling-environment" className={inputClassName} {...register('cyclingEnvironment')}>
                  {Object.entries(cyclingEnvironmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField id="cycling-met" label="Valeur MET" description="Ajustable selon l’intensité réelle." error={errors.met?.message} required>
                <input id="cycling-met" type="number" min="1" max="25" step="0.1" inputMode="decimal" className={inputClassName} {...register('met', optionalNumberRegistration)} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="cycling-intervals" label="Intervalles ou blocs" description="Facultatif" error={errors.intervalDetails?.message}>
                  <textarea id="cycling-intervals" rows={3} className={inputClassName} {...register('intervalDetails')} />
                </FormField>
              </div>
            </div>
          </section>
        ) : null}

        {['strengthTraining', 'walking', 'otherCardio'].includes(activityType) ? (
          <section className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="met-data-title">
            <h2 id="met-data-title" className="font-semibold text-slate-950 dark:text-white">Estimation de l’effort</h2>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField
                id="activity-met"
                label="Valeur MET"
                description="Ajustable selon l’intensité réelle."
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
                  enterKeyHint="done"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.met)}
                  aria-describedby={errors.met ? 'activity-met-error' : 'activity-met-description'}
                  {...register('met', optionalNumberRegistration)}
                />
              </FormField>
              {activityType === 'walking' ? (
                <div className="sm:self-end">
                  <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <input type="checkbox" className={checkboxClassName} {...register('includedInDailySteps')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">Comprise dans les pas du jour</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Évite de compter deux fois la marche.</span>
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <details
          className="group border-t border-slate-200 dark:border-slate-800"
          open={optionalSectionHasErrors || undefined}
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-semibold text-slate-950 dark:text-white">Notes et correction</span>
              <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">Champs facultatifs</span>
            </span>
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="grid gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:grid-cols-2 sm:px-5">
            <FormField
              id="manual-calories"
              label="Calories corrigées"
              description="Remplace l’estimation automatique."
              error={errors.manualCaloriesKcal?.message}
            >
              <input
                id="manual-calories"
                type="number"
                min="0"
                max="10000"
                step="1"
                inputMode="numeric"
                enterKeyHint="next"
                className={inputClassName}
                aria-invalid={Boolean(errors.manualCaloriesKcal)}
                aria-describedby={errors.manualCaloriesKcal ? 'manual-calories-error' : 'manual-calories-description'}
                {...register('manualCaloriesKcal', optionalNumberRegistration)}
              />
            </FormField>
            <FormField id="activity-notes" label="Notes et ressentis" error={errors.notes?.message}>
              <textarea
                id="activity-notes"
                rows={3}
                className={inputClassName}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? 'activity-notes-error' : undefined}
                {...register('notes')}
              />
            </FormField>
          </div>
        </details>
      </Card>

      <Card className="border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/30 sm:p-5" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Calculator aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950 dark:text-white">Aperçu</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {calculationWeightKg.toLocaleString('fr-FR')} kg · {calculationWeightSource}
            </p>
          </div>
        </div>

        {preview ? (
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Estimation</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
                {Math.round(preview.calculation.estimatedCaloriesKcal)} kcal
              </dd>
            </div>
            <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Retenues</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
                {Math.round(preview.effectiveCalories)} kcal
              </dd>
            </div>
            {preview.runningPace ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Allure</dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-slate-950 dark:text-white">{preview.runningPace}</dd>
              </div>
            ) : null}
            {preview.runningSteps !== undefined ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Pas de course</dt>
                <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
                  {preview.runningSteps.toLocaleString('fr-FR')}
                </dd>
              </div>
            ) : null}
            {preview.swimmingPace ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70 sm:col-span-2">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Allure</dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-slate-950 dark:text-white">{preview.swimmingPace}</dd>
              </div>
            ) : null}
            {preview.swimmingLengths !== undefined ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Longueurs</dt>
                <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{preview.swimmingLengths.toLocaleString('fr-FR')}</dd>
              </div>
            ) : null}
            {preview.cyclingSpeed !== undefined ? (
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70 sm:col-span-2">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Vitesse moyenne</dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-slate-950 dark:text-white">{preview.cyclingSpeed.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Complète les champs obligatoires pour afficher l’estimation.
          </p>
        )}
      </Card>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex justify-end border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:pt-2 dark:border-slate-800 dark:bg-slate-900/95 sm:dark:bg-transparent">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          <Save aria-hidden="true" className="size-5" />
          {isSubmitting ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
