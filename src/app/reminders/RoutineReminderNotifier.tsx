import { BellRing, Check, Clock3, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  completeRoutineReminder,
  disableRoutineReminder,
  evaluateRoutineReminder,
  ROUTINE_REMINDER_CHANGED_EVENT,
  snoozeRoutineReminder,
  type RoutineReminderCandidate,
} from '@/application/reminders/routineReminderService';
import { normalizeRoutineReminderPreferences } from '@/domain/reminders/routineReminder';
import { repositories } from '@/infrastructure/repositories/repositories';

function navigateTo(path: string): void {
  window.location.hash = path.startsWith('/') ? `#${path}` : path;
}

export function RoutineReminderNotifier() {
  const [candidate, setCandidate] = useState<RoutineReminderCandidate | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(60);

  const refresh = useCallback(async () => {
    try {
      const settings = await repositories.settings.get();
      const preferences = normalizeRoutineReminderPreferences(
        settings.routineReminderPreferences,
      );
      setSnoozeMinutes(preferences.snoozeMinutes);
      setCandidate(await evaluateRoutineReminder());
    } catch {
      setCandidate(null);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onChange = () => void refresh();
    const intervalId = window.setInterval(() => void refresh(), 60_000);

    window.addEventListener('focus', onChange);
    window.addEventListener(ROUTINE_REMINDER_CHANGED_EVENT, onChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onChange);
      window.removeEventListener(ROUTINE_REMINDER_CHANGED_EVENT, onChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  if (!candidate) return null;

  const closeAndRefresh = () => {
    setCandidate(null);
    window.setTimeout(() => void refresh(), 0);
  };

  return (
    <aside
      aria-label="Rappel de routine"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:bottom-6"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          <BellRing aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950 dark:text-white">{candidate.title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {candidate.message}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          className="col-span-2 min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onClick={() => {
            completeRoutineReminder(candidate.type);
            navigateTo(candidate.actionPath);
            closeAndRefresh();
          }}
          type="button"
        >
          {candidate.actionLabel}
        </button>
        <button
          className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => {
            snoozeRoutineReminder(candidate.type, snoozeMinutes);
            closeAndRefresh();
          }}
          type="button"
        >
          <Clock3 aria-hidden="true" className="mr-1 inline h-4 w-4" />
          Plus tard
        </button>
        <button
          className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => {
            completeRoutineReminder(candidate.type);
            closeAndRefresh();
          }}
          type="button"
        >
          <Check aria-hidden="true" className="mr-1 inline h-4 w-4" />
          Fait
        </button>
        <button
          className="col-span-2 min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => {
            void disableRoutineReminder(candidate.type).then(closeAndRefresh);
          }}
          type="button"
        >
          <Settings2 aria-hidden="true" className="mr-1 inline h-4 w-4" />
          Désactiver ce rappel
        </button>
      </div>
    </aside>
  );
}
