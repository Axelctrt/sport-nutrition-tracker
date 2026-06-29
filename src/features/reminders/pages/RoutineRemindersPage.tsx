import {
  BellRing,
  CalendarDays,
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

const WEEKDAYS: Array<{ value: RoutineReminderWeekday; label: string }> = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'M' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
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

  const toggleDay = (day: RoutineReminderWeekday) => {
    const days = rule.days.includes(day)
      ? rule.days.filter((value) => value !== day)
      : [...rule.days, day].sort((left, right) => left - right);
    if (days.length > 0) onChange({ ...rule, days });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950 dark:text-white">{definition.title}</h2>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                checked={rule.enabled}
                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                onChange={(event) => onChange({ ...rule, enabled: event.target.checked })}
                type="checkbox"
              />
              Actif
            </label>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {definition.description}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Les jours et l’heure restent modifiables même lorsque ce rappel est désactivé.
      </p>

      <div className="mt-2 grid gap-4 sm:grid-cols-[10rem_1fr]">
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
                  className={`min-h-11 rounded-xl border text-sm font-semibold transition ${
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
    </section>
  );
}

export function RoutineRemindersPage() {
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
    } catch {
      setStatus('error');
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
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-28">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <BellRing aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">Rappels et routines</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Ces rappels sont internes à SportPilot. Ils sont évalués au démarrage et lorsque l’application revient au premier plan.
            </p>
          </div>
        </div>
      </header>

      {REMINDER_DEFINITIONS.map((definition) => (
        <ReminderRuleCard
          definition={definition}
          key={definition.type}
          onChange={(rule) => updateRule(definition.type, rule)}
          rule={preferences.rules[definition.type]}
        />
      ))}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-950 dark:text-white">Comportement général</h2>
        </div>

        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            checked={preferences.quietHours.enabled}
            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
        className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex min-h-12 max-w-md items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-xl hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 md:static md:w-full"
        disabled={status === 'saving'}
        onClick={() => void save()}
        type="button"
      >
        <Save aria-hidden="true" className="h-5 w-5" />
        {status === 'saving' ? 'Enregistrement…' : 'Enregistrer les rappels'}
      </button>
    </div>
  );
}
