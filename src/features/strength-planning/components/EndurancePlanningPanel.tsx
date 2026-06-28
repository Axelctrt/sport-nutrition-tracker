import {
  Activity,
  Bike,
  CalendarPlus,
  CheckCircle2,
  Footprints,
  HeartPulse,
  RotateCcw,
  SkipForward,
  Trash2,
  Waves,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
  buildEndurancePlanningWeek,
  deletePlannedEnduranceSession,
  reschedulePlannedEnduranceSession,
  savePlannedEnduranceSession,
  setPlannedEnduranceStatus,
  type EndurancePlanningWeek,
} from '@/application/planning/endurancePlanningService';
import { routePaths } from '@/app/routePaths';
import type {
  ActivityIntensity,
  Activity as ActivityModel,
} from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  readEndurancePlanningState,
  type PlannedEnduranceActivityType,
  type PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import { appDatabase } from '@/infrastructure/database/database';
import { readBackupData } from '@/infrastructure/backup/backupService';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { useToast } from '@/shared/toast/useToast';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';

interface EndurancePlanningPanelProps {
  weekStart: LocalDate;
}

const typeLabels: Record<
  PlannedEnduranceActivityType,
  string
> = {
  running: 'Course',
  swimming: 'Natation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Cardio',
};

const typeIcons = {
  running: Activity,
  swimming: Waves,
  cycling: Bike,
  walking: Footprints,
  otherCardio: HeartPulse,
} satisfies Record<
  PlannedEnduranceActivityType,
  typeof Activity
>;

const statusLabels = {
  planned: 'Prévue',
  completed: 'Réalisée',
  skipped: 'Non réalisée',
} as const;

function activityPath(
  type: PlannedEnduranceActivityType,
  date: LocalDate,
): string {
  const base =
    type === 'running'
      ? routePaths.addRunningActivity
      : type === 'swimming'
        ? routePaths.addSwimmingActivity
        : routePaths.addOtherActivity;

  return `${base}?date=${encodeURIComponent(
    date,
  )}&type=${encodeURIComponent(type)}`;
}

function formatDate(date: LocalDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`));
}

function targetLabel(
  session: PlannedEnduranceSession,
): string | undefined {
  const parts: string[] = [];

  if (session.targetDurationMinutes) {
    parts.push(
      `${session.targetDurationMinutes} min`,
    );
  }

  if (session.targetDistanceKm) {
    parts.push(
      `${session.targetDistanceKm} km`,
    );
  }

  if (session.targetDistanceMeters) {
    parts.push(
      `${session.targetDistanceMeters} m`,
    );
  }

  return parts.length > 0
    ? parts.join(' · ')
    : undefined;
}

function actualLabel(
  activity: ActivityModel,
): string {
  const parts = [
    `${activity.durationMinutes} min`,
  ];

  if (activity.type === 'running') {
    parts.push(`${activity.distanceKm} km`);
  } else if (
    activity.type === 'swimming'
  ) {
    parts.push(
      `${activity.distanceMeters} m`,
    );
  } else if (
    activity.type === 'cycling' &&
    activity.distanceKm
  ) {
    parts.push(`${activity.distanceKm} km`);
  }

  return parts.join(' · ');
}

export function EndurancePlanningPanel({
  weekStart,
}: EndurancePlanningPanelProps) {
  const toast = useToast();
  const [week, setWeek] =
    useState<EndurancePlanningWeek>();
  const [error, setError] = useState<string>();
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] =
    useState<PlannedEnduranceActivityType>(
      'running',
    );
  const [date, setDate] =
    useState<LocalDate>(toLocalDate());
  const [intensity, setIntensity] =
    useState<ActivityIntensity>('moderate');
  const [duration, setDuration] = useState('45');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [rescheduleDates, setRescheduleDates] =
    useState<Record<string, string>>({});
  const [deleteCandidate, setDeleteCandidate] =
    useState<PlannedEnduranceSession>();

  const load = useCallback(async () => {
    setError(undefined);

    try {
      const data = await readBackupData(appDatabase);
      setWeek(
        buildEndurancePlanningWeek(
          readEndurancePlanningState(),
          data.activities,
          weekStart,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le planning d’endurance n’a pas pu être chargé.',
      );
    }
  }, [weekStart]);

  useEffect(() => {
    void load();

    const handleChange = () => {
      void load();
    };

    window.addEventListener(
      ENDURANCE_PLANNING_CHANGED_EVENT,
      handleChange,
    );

    return () => {
      window.removeEventListener(
        ENDURANCE_PLANNING_CHANGED_EVENT,
        handleChange,
      );
    };
  }, [load]);

  const showDistance = useMemo(
    () =>
      activityType === 'running' ||
      activityType === 'swimming' ||
      activityType === 'cycling',
    [activityType],
  );

  const submit = () => {
    setError(undefined);

    try {
      const parsedDuration =
        duration.trim() === ''
          ? undefined
          : Number(duration);
      const parsedDistance =
        distance.trim() === ''
          ? undefined
          : Number(distance);

      const plannedSession =
        savePlannedEnduranceSession({
        title,
        activityType,
        date,
        intensity,
        ...(parsedDuration !== undefined
          ? {
              targetDurationMinutes:
                parsedDuration,
            }
          : {}),
        ...(parsedDistance !== undefined &&
        activityType === 'swimming'
          ? {
              targetDistanceMeters:
                parsedDistance,
            }
          : {}),
        ...(parsedDistance !== undefined &&
        activityType !== 'swimming'
          ? {
              targetDistanceKm:
                parsedDistance,
            }
          : {}),
        ...(notes.trim()
          ? { notes: notes.trim() }
          : {}),
      });

      toast.success(
        'Activité planifiée',
        `${plannedSession.title} a été ajoutée au planning du ${formatDate(
          plannedSession.date,
        )}.`,
      );

      setTitle('');
      setNotes('');
      setDistance('');
      void load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'La séance n’a pas pu être planifiée.',
      );
    }
  };

  return (
    <div className="mt-6">
      <CollapsibleSection
        sectionId="endurance-planning"
        storageKey="sportpilot:planning:endurance"
        title="Course, natation, vélo et cardio"
        description="Planifie les activités d’endurance et rapproche-les automatiquement de ce qui est réellement saisi."
        icon={CalendarPlus}
        defaultOpen
      >
        {error ? (
          <InlineNotice
            className="mb-4"
            tone="error"
            title="Planning indisponible"
          >
            {error}
          </InlineNotice>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Réalisées
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {week?.completedCount ?? 0}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Encore prévues
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {week?.plannedCount ?? 0}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Adhérence
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {week?.adherencePercent ?? 0} %
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Durée réelle
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {week?.actualDurationMinutes ?? 0} min
            </p>
          </Card>
        </div>

        <Card
          className="mt-4 p-4"
          aria-label="Planifier une activité d’endurance"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Sport
              <select
                value={activityType}
                onChange={(event) =>
                  setActivityType(
                    event.target
                      .value as PlannedEnduranceActivityType,
                  )
                }
                className={`${inputClassName} mt-1`}
              >
                {Object.entries(typeLabels).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Date prévue
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Durée cible (min)
              <input
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(event) =>
                  setDuration(event.target.value)
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            {showDistance ? (
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Distance cible (
                {activityType === 'swimming'
                  ? 'm'
                  : 'km'}
                )
                <input
                  type="number"
                  min="0.1"
                  step={
                    activityType === 'swimming'
                      ? '50'
                      : '0.1'
                  }
                  value={distance}
                  onChange={(event) =>
                    setDistance(
                      event.target.value,
                    )
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
            ) : null}

            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Intensité
              <select
                value={intensity}
                onChange={(event) =>
                  setIntensity(
                    event.target
                      .value as ActivityIntensity,
                  )
                }
                className={`${inputClassName} mt-1`}
              >
                <option value="low">Faible</option>
                <option value="moderate">
                  Modérée
                </option>
                <option value="high">Élevée</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100 md:col-span-2">
              Nom facultatif
              <input
                value={title}
                maxLength={120}
                placeholder={
                  typeLabels[activityType]
                }
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100 md:col-span-2">
              Notes facultatives
              <input
                value={notes}
                maxLength={240}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                className={`${inputClassName} mt-1`}
              />
            </label>
          </div>

          <Button
            className="mt-4"
            onClick={submit}
          >
            <CalendarPlus
              aria-hidden="true"
              className="size-4"
            />
            Planifier l’activité
          </Button>
        </Card>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(week?.days ?? []).map((day) => (
            <section
              key={day.date}
              aria-labelledby={`endurance-day-${day.date}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <h3
                id={`endurance-day-${day.date}`}
                className="font-bold capitalize text-slate-950 dark:text-white"
              >
                {formatDate(day.date)}
              </h3>

              {day.sessions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Aucune activité d’endurance prévue.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {day.sessions.map((view) => {
                    const Icon =
                      typeIcons[
                        view.session.activityType
                      ];
                    const target = targetLabel(
                      view.session,
                    );

                    return (
                      <Card
                        key={view.session.id}
                        className="p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                            <Icon
                              aria-hidden="true"
                              className="size-4"
                            />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-950 dark:text-white">
                                {view.session.title}
                              </h4>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {
                                  statusLabels[
                                    view
                                      .displayStatus
                                  ]
                                }
                              </span>
                              {view.isOverdue ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200">
                                  En retard
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {
                                typeLabels[
                                  view.session
                                    .activityType
                                ]
                              }
                              {target
                                ? ` · ${target}`
                                : ''}
                            </p>

                            {view.matchedActivity ? (
                              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2
                                  aria-hidden="true"
                                  className="mr-1 inline size-4"
                                />
                                {
                                  actualLabel(
                                    view.matchedActivity,
                                  )
                                }
                              </p>
                            ) : null}

                            {view.session.notes ? (
                              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {view.session.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {view.displayStatus ===
                          'planned' ? (
                            <Link
                              to={activityPath(
                                view.session
                                  .activityType,
                                view.session.date,
                              )}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
                            >
                              Saisir l’activité
                            </Link>
                          ) : null}

                          {view.displayStatus ===
                          'planned' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setPlannedEnduranceStatus(
                                  view.session.id,
                                  'skipped',
                                )
                              }
                            >
                              <SkipForward
                                aria-hidden="true"
                                className="size-4"
                              />
                              Non réalisée
                            </Button>
                          ) : null}

                          {view.displayStatus ===
                          'skipped' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setPlannedEnduranceStatus(
                                  view.session.id,
                                  'planned',
                                )
                              }
                            >
                              <RotateCcw
                                aria-hidden="true"
                                className="size-4"
                              />
                              Réactiver
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="dangerGhost"
                            onClick={() =>
                              setDeleteCandidate(
                                view.session,
                              )
                            }
                          >
                            <Trash2
                              aria-hidden="true"
                              className="size-4"
                            />
                            Supprimer
                          </Button>
                        </div>

                        {view.displayStatus !==
                        'completed' ? (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              Reporter au
                              <input
                                type="date"
                                value={
                                  rescheduleDates[
                                    view.session.id
                                  ] ??
                                  view.session.date
                                }
                                onChange={(event) =>
                                  setRescheduleDates(
                                    (current) => ({
                                      ...current,
                                      [view.session.id]:
                                        event.target
                                          .value,
                                    }),
                                  )
                                }
                                className={`${inputClassName} mt-1`}
                              />
                            </label>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                reschedulePlannedEnduranceSession(
                                  view.session.id,
                                  rescheduleDates[
                                    view.session.id
                                  ] ??
                                    view.session
                                      .date,
                                )
                              }
                            >
                              Reporter
                            </Button>
                          </div>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </CollapsibleSection>

      <ConfirmationDialog
        open={deleteCandidate !== undefined}
        title="Supprimer cette activité prévue ?"
        description={
          deleteCandidate
            ? `« ${deleteCandidate.title} » sera retirée du planning. Les activités réellement enregistrées resteront intactes.`
            : ''
        }
        confirmLabel="Supprimer du planning"
        tone="danger"
        onConfirm={() => {
          if (deleteCandidate) {
            deletePlannedEnduranceSession(
              deleteCandidate.id,
            );
            setDeleteCandidate(undefined);
          }
        }}
        onCancel={() =>
          setDeleteCandidate(undefined)
        }
      />
    </div>
  );
}
