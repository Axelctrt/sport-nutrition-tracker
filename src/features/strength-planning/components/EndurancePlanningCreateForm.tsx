import { CalendarPlus } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { recalculatePlannedActivityTargetsForCurrentProfile } from '@/application/planning/plannedActivityTargetService';
import { savePlannedEnduranceSession } from '@/application/planning/endurancePlanningService';
import type { ActivityIntensity } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type {
  PlannedEnduranceActivityType,
  PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';

interface EndurancePlanningCreateFormProps {
  initialDate?: LocalDate;
  onSaved?: (session: PlannedEnduranceSession) => void;
}

const typeLabels: Record<PlannedEnduranceActivityType, string> = {
  running: 'Course',
  swimming: 'Natation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Cardio',
};

function formatDate(date: LocalDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`));
}

export function EndurancePlanningCreateForm({
  initialDate,
  onSaved,
}: EndurancePlanningCreateFormProps) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] =
    useState<PlannedEnduranceActivityType>('running');
  const [date, setDate] = useState<LocalDate>(initialDate ?? toLocalDate());
  const [intensity, setIntensity] = useState<ActivityIntensity>('moderate');
  const [duration, setDuration] = useState('45');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const showDistance = useMemo(
    () => (
      activityType === 'running'
      || activityType === 'swimming'
      || activityType === 'cycling'
    ),
    [activityType],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setBusy(true);

    try {
      const parsedDuration = duration.trim() === ''
        ? undefined
        : Number(duration);
      const parsedDistance = distance.trim() === ''
        ? undefined
        : Number(distance);
      const plannedSession = savePlannedEnduranceSession({
        title,
        activityType,
        date,
        intensity,
        ...(parsedDuration !== undefined
          ? { targetDurationMinutes: parsedDuration }
          : {}),
        ...(parsedDistance !== undefined && activityType === 'swimming'
          ? { targetDistanceMeters: parsedDistance }
          : {}),
        ...(parsedDistance !== undefined && activityType !== 'swimming'
          ? { targetDistanceKm: parsedDistance }
          : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });

      await recalculatePlannedActivityTargetsForCurrentProfile([
        plannedSession.date,
      ]);

      toast.success(
        'Activité planifiée',
        `${plannedSession.title} a été ajoutée au planning du ${formatDate(plannedSession.date)}.`,
      );
      setTitle('');
      setNotes('');
      setDistance('');
      onSaved?.(plannedSession);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'La séance n’a pas pu être planifiée.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {error ? (
        <InlineNotice tone="error" title="Planification impossible">
          {error}
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Sport
          <select
            value={activityType}
            onChange={(event) => {
              setActivityType(event.target.value as PlannedEnduranceActivityType);
              setDistance('');
            }}
            className={`${inputClassName} mt-1`}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Date prévue
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${inputClassName} mt-1`}
          />
        </label>

        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Durée cible (min)
          <input
            type="number"
            min="1"
            step="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={`${inputClassName} mt-1`}
          />
        </label>

        {showDistance ? (
          <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Distance cible ({activityType === 'swimming' ? 'm' : 'km'})
            <input
              type="number"
              min="0.1"
              step={activityType === 'swimming' ? '50' : '0.1'}
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              className={`${inputClassName} mt-1`}
            />
          </label>
        ) : null}

        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Intensité
          <select
            value={intensity}
            onChange={(event) => setIntensity(event.target.value as ActivityIntensity)}
            className={`${inputClassName} mt-1`}
          >
            <option value="low">Faible</option>
            <option value="moderate">Modérée</option>
            <option value="high">Élevée</option>
          </select>
        </label>

        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100 sm:col-span-2">
          Nom facultatif
          <input
            value={title}
            maxLength={120}
            placeholder={typeLabels[activityType]}
            onChange={(event) => setTitle(event.target.value)}
            className={`${inputClassName} mt-1`}
          />
        </label>

        <label data-form-field className="text-sm font-semibold text-slate-800 dark:text-slate-100 sm:col-span-2">
          Notes facultatives
          <input
            value={notes}
            maxLength={240}
            onChange={(event) => setNotes(event.target.value)}
            className={`${inputClassName} mt-1`}
          />
        </label>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy || !date}>
        <CalendarPlus aria-hidden="true" className="size-5" />
        {busy ? 'Planification…' : 'Planifier l’activité'}
      </Button>
    </form>
  );
}
