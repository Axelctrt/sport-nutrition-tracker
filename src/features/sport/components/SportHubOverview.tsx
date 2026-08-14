import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  History,
  Layers3,
  LibraryBig,
  ListChecks,
  Play,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { SportHubSnapshot } from '@/application/sport/sportHubService';
import { routePaths } from '@/app/routePaths';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { SportNavigationCard } from '@/features/sport/components/SportNavigationCard';
import { sportAgendaEntryPath } from '@/features/sport/sportHubNavigation';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FirstUseHint } from '@/shared/ui/FirstUseHint';
import { formatLocalDate } from '@/shared/utils/dates';

interface SportHubOverviewProps {
  snapshot: SportHubSnapshot;
  navigationState: ActivityJournalNavigationState;
  onRecord: () => void;
}

function todayStatusLabel(status: string): string {
  if (status === 'inProgress') return 'En cours';
  if (status === 'overdue') return 'À replanifier';
  return 'Prévue';
}

export function SportHubOverview({
  snapshot,
  navigationState,
  onRecord,
}: SportHubOverviewProps) {
  const [programsOpen, setProgramsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const todayPlannedEntries = snapshot.plannedEntries.filter(
    (entry) => entry.date === snapshot.today || entry.status === 'overdue',
  );
  const todayActivities = snapshot.recentActivities.filter(
    (activity) => activity.date === snapshot.today,
  );

  return (
    <div className="mt-5 space-y-6">
      <section aria-labelledby="sport-today-title">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="sport-today-title"
            className="text-xl font-bold text-[var(--sp-text-primary)]"
          >
            Aujourd’hui
          </h2>
          <Link
            to={`${routePaths.weeklyPlanning}?date=${encodeURIComponent(snapshot.today)}&action=plan`}
            className="sp-button inline-flex min-h-[var(--sp-control-height-md)] shrink-0 items-center gap-2 rounded-[var(--sp-radius-control)] px-3 text-sm font-semibold"
          >
            <Plus aria-hidden="true" className="size-4" />
            Prévoir
          </Link>
        </div>

        {!snapshot.currentSession && todayPlannedEntries.length === 0 && todayActivities.length === 0 ? (
          <FirstUseHint
            hintKey="sport-plan-activity"
            title="Planifier une activité"
            className="mt-3"
          >
            Prévois une activité ici. Tu pourras ensuite la démarrer depuis Accueil ou Sport.
          </FirstUseHint>
        ) : null}

        <Card className="mt-3 overflow-hidden">
          {snapshot.currentSession ? (
            <div className="flex items-center gap-3 border-b p-4 [border-color:var(--sp-border-subtle)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-progress)]">
                <Dumbbell aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--sp-text-primary)]">
                  {snapshot.currentSession.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--sp-text-muted)]">En cours</p>
              </div>
              <Link
                to={sportAgendaEntryPath(snapshot.currentSession)}
                className="sp-button inline-flex min-h-[var(--sp-control-height-md)] shrink-0 items-center gap-2 rounded-[var(--sp-radius-control)] px-3 text-sm font-semibold"
              >
                <Play aria-hidden="true" className="size-4" />
                Reprendre
              </Link>
            </div>
          ) : null}

          {todayPlannedEntries.map((entry) => (
            <div
              key={`${entry.source}-${entry.id}`}
              className="flex items-center gap-3 border-b p-4 last:border-b-0 [border-color:var(--sp-border-subtle)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
                {entry.source === 'strength'
                  ? <Dumbbell aria-hidden="true" className="size-5" />
                  : <Activity aria-hidden="true" className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--sp-text-primary)]">{entry.title}</p>
                <p className="mt-0.5 text-sm text-[var(--sp-text-muted)]">
                  {todayStatusLabel(entry.status)}
                  {'targetDurationMinutes' in entry && entry.targetDurationMinutes
                    ? ` · ${entry.targetDurationMinutes} min`
                    : ''}
                </p>
              </div>
              <Link
                to={sportAgendaEntryPath(entry)}
                state={navigationState}
                className="sp-button sp-button--secondary inline-flex min-h-[var(--sp-control-height-md)] shrink-0 items-center gap-2 rounded-[var(--sp-radius-control)] px-3 text-sm font-semibold"
              >
                <Play aria-hidden="true" className="size-4" />
                Démarrer
              </Link>
            </div>
          ))}

          {todayActivities.map((activity) => {
            const presentation = presentActivity(activity);
            return (
              <Link
                key={activity.id}
                to={`${routePaths.activities}?view=history&date=${encodeURIComponent(activity.date)}`}
                className="flex min-h-16 items-center gap-3 border-b p-4 last:border-b-0 [border-color:var(--sp-border-subtle)] hover:bg-[var(--sp-surface-muted)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-success)]">
                  <ListChecks aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[var(--sp-text-primary)]">
                    {presentation.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--sp-success)]">
                    Terminée · {activity.durationMinutes} min
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--sp-text-muted)]" />
              </Link>
            );
          })}

          {!snapshot.currentSession && todayPlannedEntries.length === 0 && todayActivities.length === 0 ? (
            <div className="p-5 text-center">
              <p className="font-semibold text-[var(--sp-text-primary)]">Aucune activité aujourd’hui</p>
            </div>
          ) : null}

          <div className="border-t px-4 py-3 [border-color:var(--sp-border-subtle)]">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              aria-label="Ajouter une activité déjà réalisée"
              onClick={onRecord}
            >
              Ajouter une activité passée
            </Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="sport-organize-title">
        <h2
          id="sport-organize-title"
          className="text-xl font-bold text-[var(--sp-text-primary)]"
        >
          Organiser
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SportNavigationCard
            title="Mes programmes"
            icon={Layers3}
            onClick={() => setProgramsOpen(true)}
          />
          <SportNavigationCard
            to={routePaths.weeklyPlanning}
            title="Planning sportif"
            icon={CalendarDays}
            tone="secondary"
          />
          <SportNavigationCard
            title="Bibliothèque"
            icon={LibraryBig}
            tone="intense"
            onClick={() => setLibraryOpen(true)}
          />
        </div>
      </section>

      <section aria-labelledby="sport-recent-title">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="sport-recent-title"
            className="text-xl font-bold text-[var(--sp-text-primary)]"
          >
            Dernières activités
          </h2>
          <Link
            to={`${routePaths.activities}?view=history&date=${encodeURIComponent(snapshot.today)}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--sp-accent-primary)] hover:underline"
          >
            Tout voir
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <Card className="mt-3 overflow-hidden">
          {snapshot.recentActivities.length > 0 ? (
            snapshot.recentActivities.map((activity) => {
              const presentation = presentActivity(activity);
              return (
                <Link
                  key={activity.id}
                  to={`${routePaths.activities}?view=history&date=${encodeURIComponent(activity.date)}`}
                  className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-b-0 [border-color:var(--sp-border-subtle)] hover:bg-[var(--sp-surface-muted)]"
                >
                  <Activity aria-hidden="true" className="size-5 shrink-0 text-[var(--sp-text-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[var(--sp-text-primary)]">
                      {presentation.title}
                    </span>
                    <span className="block text-sm text-[var(--sp-text-muted)]">
                      {formatLocalDate(activity.date)} · {activity.durationMinutes} min
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--sp-text-muted)]" />
                </Link>
              );
            })
          ) : (
            <p className="p-5 text-center text-sm text-[var(--sp-text-muted)]">
              Aucune activité enregistrée.
            </p>
          )}
        </Card>
      </section>

      <BottomSheet
        open={programsOpen}
        title="Mes programmes"
        description="Choisis le type de modèles à organiser."
        onClose={() => setProgramsOpen(false)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SportNavigationCard
            to={routePaths.workoutTemplates}
            title="Musculation"
            description="Modèles de séances"
            icon={Dumbbell}
            tone="progress"
            onClick={() => setProgramsOpen(false)}
          />
          <SportNavigationCard
            to={routePaths.enduranceTemplates}
            title="Endurance"
            description="Course, vélo, natation et cardio"
            icon={Activity}
            tone="success"
            onClick={() => setProgramsOpen(false)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={libraryOpen}
        title="Bibliothèque sportive"
        description="Retrouve les exercices et les historiques détaillés."
        onClose={() => setLibraryOpen(false)}
      >
        <nav className="space-y-2" aria-label="Bibliothèque sportive">
          {[
            { path: routePaths.strengthExercises, label: 'Exercices', icon: BookOpen },
            { path: routePaths.workoutSessions, label: 'Historique de musculation', icon: Dumbbell },
            {
              path: `${routePaths.activities}?view=history&date=${encodeURIComponent(snapshot.today)}`,
              label: 'Historique complet des activités',
              icon: History,
            },
          ].map((destination) => (
            <SportNavigationCard
              key={destination.path}
              to={destination.path}
              title={destination.label}
              icon={destination.icon}
              compact
              onClick={() => setLibraryOpen(false)}
            />
          ))}
        </nav>
      </BottomSheet>
    </div>
  );
}
