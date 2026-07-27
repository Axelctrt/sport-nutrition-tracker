import {
  Activity,
  ArrowLeft,
  Bike,
  Dumbbell,
  Footprints,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  PlanDailyStrengthInput,
  UpdateDailyStrengthInput,
} from '@/application/planning/dailyActivityPlanningService';
import type { PlannedEnduranceInput } from '@/application/planning/endurancePlanningService';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import type { ActivityIntensity } from '@/domain/models/activity';
import type { StrengthSessionStyle, WorkoutSession } from '@/domain/models/strength';
import type {
  PlannedEnduranceActivityType,
  PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import { inputClassName } from '@/shared/forms/formStyles';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { ChoiceCard, ChoiceCardGroup } from '@/shared/ui/ChoiceCard';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

type PlannerActivityType = 'strengthTraining' | PlannedEnduranceActivityType;
type PlannerStep = 'type' | 'format' | 'details' | 'confirmation';

interface EditStrengthPlan {
  kind: 'strength';
  session: WorkoutSession;
}

interface EditEndurancePlan {
  kind: 'endurance';
  session: PlannedEnduranceSession;
}

export type DailyActivityPlannerEdit = EditStrengthPlan | EditEndurancePlan;

interface DailyActivityPlannerSheetProps {
  open: boolean;
  date: string;
  templates: readonly WorkoutTemplateSummary[];
  edit?: DailyActivityPlannerEdit;
  onClose: () => void;
  onPlanStrength: (input: PlanDailyStrengthInput) => Promise<unknown>;
  onUpdateStrength: (input: UpdateDailyStrengthInput) => Promise<unknown>;
  onSaveEndurance: (
    input: PlannedEnduranceInput,
    sessionId?: string,
  ) => Promise<unknown>;
}

const typeOptions = [
  { value: 'strengthTraining', title: 'Musculation', icon: Dumbbell },
  { value: 'running', title: 'Course', icon: Activity },
  { value: 'swimming', title: 'Natation', icon: Waves },
  { value: 'cycling', title: 'Vélo', icon: Bike },
  { value: 'walking', title: 'Marche', icon: Footprints },
  { value: 'otherCardio', title: 'Autre cardio', icon: Activity },
] as const;

const typeLabels: Record<PlannerActivityType, string> = {
  strengthTraining: 'Musculation',
  running: 'Course',
  swimming: 'Natation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Autre cardio',
};

const enduranceFormats: Record<
  PlannedEnduranceActivityType,
  Array<{ title: string; duration: number; intensity: ActivityIntensity }>
> = {
  running: [
    { title: 'Footing facile', duration: 40, intensity: 'low' },
    { title: 'Fractionné', duration: 45, intensity: 'high' },
    { title: 'Sortie longue', duration: 75, intensity: 'moderate' },
    { title: 'Séance libre', duration: 45, intensity: 'moderate' },
  ],
  swimming: [
    { title: 'Endurance', duration: 45, intensity: 'moderate' },
    { title: 'Technique', duration: 40, intensity: 'low' },
    { title: 'Intervalles', duration: 45, intensity: 'high' },
    { title: 'Séance libre', duration: 45, intensity: 'moderate' },
  ],
  cycling: [
    { title: 'Sortie endurance', duration: 60, intensity: 'moderate' },
    { title: 'Récupération', duration: 40, intensity: 'low' },
    { title: 'Intervalles vélo', duration: 50, intensity: 'high' },
    { title: 'Sortie libre', duration: 60, intensity: 'moderate' },
  ],
  walking: [
    { title: 'Marche active', duration: 45, intensity: 'moderate' },
    { title: 'Marche douce', duration: 30, intensity: 'low' },
    { title: 'Marche longue', duration: 90, intensity: 'moderate' },
    { title: 'Marche libre', duration: 45, intensity: 'low' },
  ],
  otherCardio: [
    { title: 'Cardio modéré', duration: 45, intensity: 'moderate' },
    { title: 'Cardio léger', duration: 30, intensity: 'low' },
    { title: 'Cardio intense', duration: 35, intensity: 'high' },
    { title: 'Séance libre', duration: 45, intensity: 'moderate' },
  ],
};

function previousStep(
  step: PlannerStep,
  editing: boolean,
): PlannerStep | undefined {
  if (editing) return undefined;
  if (step === 'format') return 'type';
  if (step === 'details') return 'format';
  if (step === 'confirmation') return 'details';
  return undefined;
}

export function DailyActivityPlannerSheet({
  open,
  date,
  templates,
  edit,
  onClose,
  onPlanStrength,
  onUpdateStrength,
  onSaveEndurance,
}: DailyActivityPlannerSheetProps) {
  const [step, setStep] = useState<PlannerStep>('type');
  const [activityType, setActivityType] = useState<PlannerActivityType>();
  const [templateId, setTemplateId] = useState<string | null>();
  const [plannedDate, setPlannedDate] = useState(date);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('45');
  const [distance, setDistance] = useState('');
  const [intensity, setIntensity] = useState<ActivityIntensity>('moderate');
  const [strengthStyle, setStrengthStyle] = useState<StrengthSessionStyle>('classic');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setErrorMessage(undefined);
    setIsSubmitting(false);
    setPlannedDate(
      edit?.kind === 'strength'
        ? edit.session.plannedDate ?? edit.session.date
        : edit?.kind === 'endurance'
          ? edit.session.date
          : date,
    );

    if (edit?.kind === 'strength') {
      setStep('details');
      setActivityType('strengthTraining');
      setTemplateId(edit.session.sourceTemplateId ?? null);
      setTitle(edit.session.sourceTemplateNameSnapshot ?? 'Séance libre');
      setDuration(String(edit.session.plannedDurationMinutes ?? 60));
      setStrengthStyle(edit.session.strengthSessionStyle ?? 'classic');
      setDistance('');
      setIntensity('moderate');
      setNotes(edit.session.notes ?? '');
      return;
    }
    if (edit?.kind === 'endurance') {
      setStep('details');
      setActivityType(edit.session.activityType);
      setTemplateId(undefined);
      setTitle(edit.session.title);
      setDuration(String(edit.session.targetDurationMinutes ?? 45));
      setDistance(String(
        edit.session.activityType === 'swimming'
          ? edit.session.targetDistanceMeters ?? ''
          : edit.session.targetDistanceKm ?? '',
      ));
      setIntensity(edit.session.intensity);
      setNotes(edit.session.notes ?? '');
      return;
    }

    setStep('type');
    setActivityType(undefined);
    setTemplateId(undefined);
    setTitle('');
    setDuration('45');
    setDistance('');
    setIntensity('moderate');
    setStrengthStyle('classic');
    setNotes('');
  }, [date, edit, open]);

  const selectedTemplate = useMemo(
    () => templates.find(({ template }) => template.id === templateId),
    [templateId, templates],
  );
  const backStep = previousStep(step, Boolean(edit));
  const parsedDuration = Number(duration);
  const parsedDistance = distance.trim() ? Number(distance) : undefined;

  const continueFromDetails = () => {
    if (!Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > 1_440) {
      setErrorMessage('Indique une durée prévue comprise entre 1 minute et 24 heures.');
      return;
    }
    if (
      parsedDistance !== undefined
      && (!Number.isFinite(parsedDistance) || parsedDistance <= 0)
    ) {
      setErrorMessage('La distance prévue doit être strictement positive.');
      return;
    }
    if (!activityType) return;
    if (activityType !== 'strengthTraining' && title.trim().length < 2) {
      setErrorMessage('Indique un nom ou un format pour cette activité.');
      return;
    }
    setErrorMessage(undefined);
    setStep('confirmation');
  };

  const submit = async () => {
    if (!activityType) return;
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      if (activityType === 'strengthTraining') {
        if (edit?.kind === 'strength') {
          await onUpdateStrength({
            sessionId: edit.session.id,
            date: plannedDate,
            plannedDurationMinutes: parsedDuration,
            strengthSessionStyle: strengthStyle,
          });
        } else {
          await onPlanStrength({
            date: plannedDate,
            ...(typeof templateId === 'string' ? { templateId } : {}),
            plannedDurationMinutes: parsedDuration,
            strengthSessionStyle: strengthStyle,
          });
        }
      } else {
        await onSaveEndurance({
          title,
          activityType,
          date: plannedDate,
          intensity,
          targetDurationMinutes: parsedDuration,
          ...(parsedDistance === undefined
            ? {}
            : activityType === 'swimming'
              ? { targetDistanceMeters: parsedDistance }
              : { targetDistanceKm: parsedDistance }),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }, edit?.kind === 'endurance' ? edit.session.id : undefined);
      }
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Cette activité n’a pas pu être planifiée.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetTitle = (
    <span className="flex items-center gap-2">
      {backStep ? (
        <button
          type="button"
          aria-label="Étape précédente"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => setStep(backStep)}
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
      ) : null}
      <span>{edit ? 'Modifier l’activité prévue' : 'Prévoir une activité'}</span>
    </span>
  );

  return (
    <BottomSheet
      open={open}
      title={sheetTitle}
      description={
        step === 'type'
          ? 'Choisis ce que tu souhaites organiser aujourd’hui.'
          : step === 'confirmation'
            ? 'Vérifie les informations avant de l’ajouter à ta journée.'
            : 'La séance restera prévue tant que tu ne la démarres pas.'
      }
      onClose={onClose}
      footer={step === 'details' ? (
        <Button fullWidth onClick={continueFromDetails}>Continuer</Button>
      ) : step === 'confirmation' ? (
        <Button
          fullWidth
          loading={isSubmitting}
          loadingLabel="Planification…"
          onClick={() => void submit()}
        >
          {edit ? 'Enregistrer les modifications' : 'Planifier pour aujourd’hui'}
        </Button>
      ) : undefined}
    >
      {errorMessage ? (
        <InlineNotice className="mb-4" tone="error" title="Planification impossible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {step === 'type' ? (
        <ChoiceCardGroup label="Que souhaites-tu prévoir ?" columns={1}>
          {typeOptions.map((option) => (
            <ChoiceCard
              key={option.value}
              name="daily-activity-type"
              value={option.value}
              title={option.title}
              icon={option.icon}
              selected={activityType === option.value}
              onSelect={() => {
                setActivityType(option.value);
                setStep('format');
              }}
              comfortable
            />
          ))}
        </ChoiceCardGroup>
      ) : null}

      {step === 'format' && activityType === 'strengthTraining' ? (
        <ChoiceCardGroup label="Choisis une séance" columns={1}>
          {templates.map(({ template, exerciseCount }) => (
            <ChoiceCard
              key={template.id}
              name="daily-strength-format"
              value={template.id}
              title={template.name}
              description={`${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`}
              icon={Dumbbell}
              selected={templateId === template.id}
              onSelect={() => {
                setTemplateId(template.id);
                setTitle(template.name);
                setDuration('60');
                setStep('details');
              }}
              comfortable
            />
          ))}
          <ChoiceCard
            name="daily-strength-format"
            value="free"
            title="Séance libre"
            description="Ajoute les exercices au moment de démarrer."
            icon={Dumbbell}
            selected={templateId === null}
            onSelect={() => {
              setTemplateId(null);
              setTitle('Séance libre');
              setDuration('60');
              setStep('details');
            }}
            comfortable
          />
        </ChoiceCardGroup>
      ) : null}

      {step === 'format' && activityType && activityType !== 'strengthTraining' ? (
        <ChoiceCardGroup label="Choisis un format" columns={1}>
          {enduranceFormats[activityType].map((format) => (
            <ChoiceCard
              key={format.title}
              name="daily-endurance-format"
              value={format.title}
              title={format.title}
              description={`${format.duration} min · ${format.intensity === 'low' ? 'facile' : format.intensity === 'high' ? 'intense' : 'modérée'}`}
              icon={typeOptions.find(({ value }) => value === activityType)?.icon ?? Activity}
              selected={title === format.title}
              onSelect={() => {
                setTitle(format.title);
                setDuration(String(format.duration));
                setIntensity(format.intensity);
                setStep('details');
              }}
              comfortable
            />
          ))}
        </ChoiceCardGroup>
      ) : null}

      {step === 'details' && activityType ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField id="daily-activity-date" label="Date prévue">
              <input
                id="daily-activity-date"
                type="date"
                value={plannedDate}
                onChange={(event) => setPlannedDate(event.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField id="daily-activity-duration" label="Durée prévue">
              <div className="relative">
                <input
                  id="daily-activity-duration"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1440"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className={`${inputClassName} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">min</span>
              </div>
            </FormField>
          </div>

          {activityType === 'strengthTraining' ? (
            <FormField id="daily-strength-style" label="Style de séance">
              <select
                id="daily-strength-style"
                value={strengthStyle}
                onChange={(event) => setStrengthStyle(event.target.value as StrengthSessionStyle)}
                className={inputClassName}
              >
                <option value="classic">Classique</option>
                <option value="strength">Force</option>
                <option value="circuit">Circuit</option>
                <option value="veryIntense">Très intense</option>
              </select>
            </FormField>
          ) : (
            <>
              <FormField id="daily-endurance-title" label="Nom ou format">
                <input
                  id="daily-endurance-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="daily-endurance-distance"
                  label="Distance prévue"
                  optionalLabel="facultatif"
                >
                  <div className="relative">
                    <input
                      id="daily-endurance-distance"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={activityType === 'swimming' ? '25' : '0.1'}
                      value={distance}
                      onChange={(event) => setDistance(event.target.value)}
                      className={`${inputClassName} pr-10`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      {activityType === 'swimming' ? 'm' : 'km'}
                    </span>
                  </div>
                </FormField>
                <FormField id="daily-endurance-intensity" label="Intensité">
                  <select
                    id="daily-endurance-intensity"
                    value={intensity}
                    onChange={(event) => setIntensity(event.target.value as ActivityIntensity)}
                    className={inputClassName}
                  >
                    <option value="low">Facile</option>
                    <option value="moderate">Modérée</option>
                    <option value="high">Intense</option>
                  </select>
                </FormField>
              </div>
              <FormField id="daily-endurance-notes" label="Notes" optionalLabel="facultatif">
                <textarea
                  id="daily-endurance-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClassName}
                />
              </FormField>
            </>
          )}
        </div>
      ) : null}

      {step === 'confirmation' && activityType ? (
        <div className="space-y-3 text-sm">
          <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500">Activité</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {activityType === 'strengthTraining'
                ? selectedTemplate?.template.name ?? (title || 'Séance libre')
                : title}
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {typeLabels[activityType]} · environ {parsedDuration} min
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Prévue le <strong className="text-slate-900 dark:text-white">{plannedDate}</strong>
            {parsedDistance === undefined
              ? ''
              : ` · ${parsedDistance} ${activityType === 'swimming' ? 'm' : 'km'}`}
          </p>
          {activityType === 'strengthTraining' && selectedTemplate ? (
            <p className="text-slate-600 dark:text-slate-300">
              {selectedTemplate.exerciseCount} exercice{selectedTemplate.exerciseCount > 1 ? 's' : ''}.
            </p>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}
