import {
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  Save,
  Scale,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { notifyRoutineReminderChanged } from '@/application/reminders/routineReminderService';
import {
  normalizeRoutineReminderPreferences,
  type RoutineReminderMaximumPerDay,
  type RoutineReminderPreferences,
  type RoutineReminderRule,
  type RoutineReminderSnoozeMinutes,
  type RoutineReminderType,
  type RoutineReminderWeekday,
} from '@/domain/reminders/routineReminder';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useActionToast } from '@/shared/toast/useActionToast';

const WEEKDAYS: Array<{ value: RoutineReminderWeekday; label: string; longLabel: string }> = [
  { value: 1, label: 'L', longLabel: 'lun.' },
  { value: 2, label: 'M', longLabel: 'mar.' },
  { value: 3, label: 'M', longLabel: 'mer.' },
  { value: 4, label: 'J', longLabel: 'jeu.' },
  { value: 5, label: 'V', longLabel: 'ven.' },
  { value: 6, label: 'S', longLabel: 'sam.' },
  { value: 0, label: 'D', longLabel: 'dim.' },
];

const REMINDER_DEFINITIONS: Array<{
  type: RoutineReminderType;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    type: 'training',
    title: 'Activité sportive',
    description: 'Signale une séance prévue aujourd’hui qui reste à réaliser ou à mettre à jour.',
    icon: Dumbbell,
  },
  {
    type: 'weeklyPlanning',
    title: 'Préparation de la semaine',
    description: 'Propose de préparer les sept prochains jours lorsqu’aucune séance n’est planifiée.',
    icon: CalendarDays,
  },
  {
    type: 'nutrition',
    title: 'Suivi nutritionnel',
    description: 'S’affiche lorsqu’aucun aliment n’est enregistré pour la journée.',
    icon: Utensils,
  },
  {
    type: 'weighIn',
    title: 'Pesée',
    description: 'S’affiche lorsqu’aucune pesée n’est enregistrée le jour prévu.',
    icon: Scale,
  },
];

function formatDays(days: readonly RoutineReminderWeekday[]): string {
  if (days.length === 7) return 'Tous les jours';
  const selected = new Set(days);
  return WEEKDAYS
    .filter(({ value }) => selected.has(value))
    .map(({ longLabel }) => longLabel)
    .join(' · ');
}

function ReminderRuleCard({
  definition,
  rule,
  onChange,
}: {
  definition: (typeof REMINDER_DEFINITIONS)[number];
  rule: RoutineReminderRule;
  onChange: (rule: RoutineReminderRule) => void;
}) {
  const Icon = definition.icon;
  const [expanded, setExpanded] = useState(false);

  const toggleDay = (day: RoutineReminderWeekday) => {
    const days = rule.days.includes(day)
      ? rule.days.filter((value) => value !== day)
      : [...rule.days, day].sort((left, right) => left - right);
    if (days.length > 0) onChange({ ...rule, days });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-h-20 items-center gap-3 p-3 sm:p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <button
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-950 dark:text-white">{definition.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${
              rule.enabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {rule.enabled ? 'Actif' : 'Inactif'}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
            {rule.time} · {formatDays(rule.days)}
          </span>
        </button>
        <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            checked={rule.enabled}
            className="size-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            onChange={(event) => onChange({ ...rule, enabled: event.target.checked })}
            type="checkbox"
          />
          <span className="sr-only">Activer {definition.title}</span>
        </label>
        <button
          aria-label={`${expanded ? 'Replier' : 'Modifier'} ${definition.title}`}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <ChevronDown aria-hidden="true" className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-800">
          <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{definition.description}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            L’heure et les jours restent modifiables même lorsque ce rappel est désactivé.
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-[10rem_1fr]">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Heure
              <input
                className="mt-1 h-11 min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-0 text-left leading-[2.75rem] text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-[2.75rem]"
                onChange={(event) => onChange({ ...rule, time: event.target.value })}
                type="time"
                value={rule.time}
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Jours</legend>
              <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label={`Jours pour ${definition.title}`}>
                {WEEKDAYS.map((day) => {
                  const selected = rule.days.includes(day.value);
                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-11 rounded-xl border text-sm font-semibold transition active:scale-[0.97] ${
                        selected
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200'
                      }`}
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      type="button"
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function RoutineRemindersPage() {
  const actionToast = useActionToast();
  const [preferences, setPreferences] = useState<RoutineReminderPreferences | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    void repositories.settings
      .get()
      .then((settings) => {
        if (!active) return;
        setPreferences(normalizeRoutineReminderPreferences(settings.routineReminderPreferences));
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const updateRule = (type: RoutineReminderType, rule: RoutineReminderRule) => {
    setPreferences((current) => current
      ? {
          ...current,
          rules: { ...current.rules, [type]: rule },
        }
      : current);
    setStatus('ready');
  };

  const save = async () => {
    if (!preferences) return;
    setStatus('saving');
    try {
      const normalized = normalizeRoutineReminderPreferences(preferences);
      await repositories.settings.update({ routineReminderPreferences: normalized });
      setPreferences(normalized);
      setStatus('saved');
      notifyRoutineReminderChanged();
    } catch (error) {
      setStatus('error');
      actionToast.error({
        key: 'routine-reminders-save',
        error,
        fallback: 'Les rappels n’ont pas pu être enregistrés.',
      });
    }
  };

  if (status === 'error' && !preferences) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Impossible de charger les préférences de rappels. Actualise la page pour réessayer.
      </p>
    );
  }

  if (status === 'loading' || !preferences) {
    return <p className="p-4 text-sm text-slate-600 dark:text-slate-300">Chargement des rappels…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-28">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <BellRing aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">Rappels et routines</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Consulte l’état de chaque rappel puis ouvre uniquement celui que tu souhaites modifier.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Rappels configurés" className="space-y-2">
        {REMINDER_DEFINITIONS.map((definition) => (
          <ReminderRuleCard
            definition={definition}
            key={definition.type}
            onChange={(rule) => updateRule(definition.type, rule)}
            rule={preferences.rules[definition.type]}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="size-5 text-slate-500" />
          <h2 className="font-semibold text-slate-950 dark:text-white">Comportement général</h2>
        </div>

        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            checked={preferences.quietHours.enabled}
            className="size-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            onChange={(event) => {
              setPreferences({
                ...preferences,
                quietHours: { ...preferences.quietHours, enabled: event.target.checked },
              });
              setStatus('ready');
            }}
            type="checkbox"
          />
          Activer les heures calmes
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Début
            <input
              className="mt-1 h-11 min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-0 text-left leading-[2.75rem] text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-[2.75rem]"
              disabled={!preferences.quietHours.enabled}
              onChange={(event) => {
                setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, start: event.target.value },
                });
                setStatus('ready');
              }}
              type="time"
              value={preferences.quietHours.start}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Fin
            <input
              className="mt-1 h-11 min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-0 text-left leading-[2.75rem] text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-[2.75rem]"
              disabled={!preferences.quietHours.enabled}
              onChange={(event) => {
                setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, end: event.target.value },
                });
                setStatus('ready');
              }}
              type="time"
              value={preferences.quietHours.end}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Report « Plus tard »
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              onChange={(event) => {
                setPreferences({
                  ...preferences,
                  snoozeMinutes: Number(event.target.value) as RoutineReminderSnoozeMinutes,
                });
                setStatus('ready');
              }}
              value={preferences.snoozeMinutes}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 heure</option>
              <option value={120}>2 heures</option>
              <option value={240}>4 heures</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Rappels différents par jour
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              onChange={(event) => {
                setPreferences({
                  ...preferences,
                  maxPerDay: Number(event.target.value) as RoutineReminderMaximumPerDay,
                });
                setStatus('ready');
              }}
              value={preferences.maxPerDay}
            >
              <option value={1}>1 maximum</option>
              <option value={2}>2 maximum</option>
              <option value={3}>3 maximum</option>
            </select>
          </label>
        </div>
      </section>

      {status === 'error' ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Impossible d’enregistrer les rappels. Réessaie après avoir actualisé la page.
        </p>
      ) : null}
      {status === 'saved' ? (
        <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
          Préférences enregistrées.
        </p>
      ) : null}

      <button
        className={`fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex min-h-12 max-w-md items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60 md:static md:w-full ${
          status === 'saved' ? 'bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700'
        }`}
        disabled={status === 'saving'}
        onClick={() => void save()}
        type="button"
      >
        {status === 'saved' ? <Check aria-hidden="true" className="size-5" /> : <Save aria-hidden="true" className="size-5" />}
        {status === 'saving'
          ? 'Enregistrement…'
          : status === 'saved'
            ? 'Enregistré'
            : 'Enregistrer les rappels'}
      </button>
    </div>
  );
}
