import {
  CircleAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import {
  isDashboardWidgetVisible,
  type DashboardWidgetId,
} from '@/domain/dashboard/dashboardPreferences';
import { DashboardActiveWorkout } from '@/features/dashboard/components/DashboardActiveWorkout';
import { DashboardActivities } from '@/features/dashboard/components/DashboardActivities';
import { DashboardCalculationDetails } from '@/features/dashboard/components/DashboardCalculationDetails';
import { DashboardQuickActions } from '@/features/dashboard/components/DashboardQuickActions';
import { DashboardRewardsOverview } from '@/features/dashboard/components/DashboardRewardsOverview';
import { DashboardTodaySummary } from '@/features/dashboard/components/DashboardTodaySummary';
import { DashboardTrainingAgenda } from '@/features/dashboard/components/DashboardTrainingAgenda';
import { DashboardWeeklyMissions } from '@/features/dashboard/components/DashboardWeeklyMissions';
import { DashboardWidgetStack } from '@/features/dashboard/components/DashboardWidgetStack';
import { useDailyDashboard } from '@/features/dashboard/hooks/useDailyDashboard';
import { useDashboardPreferences } from '@/features/dashboard-customization/hooks/useDashboardPreferences';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate } from '@/shared/utils/dates';

export function DashboardPage() {
  const { profile } = useProfile();
  const {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
  } = useDailyDashboard();
  const {
    preferences,
    isLoading: preferencesLoading,
    errorMessage: preferencesError,
  } = useDashboardPreferences();

  if (!profile) return null;

  const firstName = profile.firstName?.trim();

  const renderWidget = (widgetId: DashboardWidgetId) => {
    if (!isDashboardWidgetVisible(preferences, widgetId)) {
      return null;
    }

    if (widgetId === 'rewardsOverview') {
      return (
        <DashboardRewardsOverview
          key={widgetId}
          className="mt-6"
        />
      );
    }

    if (widgetId === 'trainingAgenda') {
    return (
      <DashboardTrainingAgenda
        key={widgetId}
        className="mt-6"
      />
    );
  }

  if (widgetId === 'weeklyMissions') {
      return (
        <DashboardWeeklyMissions
          key={widgetId}
          className="mt-6"
        />
      );
    }

    if (!snapshot || !nutrition) return null;

    switch (widgetId) {
      case 'activeWorkout':
        return activeWorkout ? (
          <DashboardActiveWorkout
            key={widgetId}
            workout={activeWorkout}
          />
        ) : null;

      case 'todaySummary':
        return (
          <DashboardTodaySummary
            key={widgetId}
            snapshot={snapshot}
            nutrition={nutrition}
            dailyStepGoal={profile.dailyStepGoal}
            isRefreshing={status === 'loading'}
          />
        );

      case 'quickActions':
        return (
          <DashboardQuickActions
            key={widgetId}
            date={date}
            totalSteps={snapshot.calculation.steps.totalSteps}
            {...(snapshot.stepsEntry
              ? { stepsEntry: snapshot.stepsEntry }
              : {})}
            weightKg={snapshot.weight.weightKg}
            {...(snapshot.weight.source === 'weightEntry' &&
            snapshot.weight.weightEntry.date === date
              ? { weightEntry: snapshot.weight.weightEntry }
              : {})}
            {...(activeWorkout ? { activeWorkout } : {})}
            onSaveWeight={saveWeight}
            onSaveSteps={saveSteps}
          />
        );

      case 'activities':
        return (
          <DashboardActivities
            key={widgetId}
            activities={snapshot.activities}
            date={date}
          />
        );

      case 'calculationDetails':
        return (
          <DashboardCalculationDetails
            key={widgetId}
            snapshot={snapshot}
          />
        );
    }
  };

  return (
    <section aria-labelledby="dashboard-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {formatLocalDate(date, 'EEEE d MMMM')}
          </p>
          <h1
            id="dashboard-title"
            className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
          >
            {firstName
              ? `Bonjour ${firstName}`
              : 'Tableau de bord'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            L’essentiel de ta journée, dans l’ordre qui te convient.
          </p>
        </div>

        <Link
          to={routePaths.dashboardCustomization}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <SlidersHorizontal
            aria-hidden="true"
            className="size-4"
          />
          <span className="hidden sm:inline">Personnaliser</span>
          <span className="sm:hidden">Blocs</span>
        </Link>
      </div>

      {status === 'loading' && !snapshot ? (
        <PageSkeleton variant="dashboard" className="mt-6" />
      ) : null}

      {status === 'error' && !snapshot ? (
        <InlineNotice
          className="mt-6"
          tone="error"
          title="Tableau de bord indisponible"
          role="alert"
        >
          <p>{errorMessage}</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void refresh()}
          >
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'error' && snapshot ? (
        <InlineNotice
          className="mt-5"
          tone="error"
          title="Mise à jour impossible"
          role="alert"
        >
          <p>
            {errorMessage} Les dernières données disponibles restent
            affichées.
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void refresh()}
          >
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {preferencesError ? (
        <InlineNotice
          className="mt-4"
          tone="error"
          title="Affichage personnalisé indisponible"
        >
          {preferencesError} L’ordre équilibré est utilisé
          temporairement.
        </InlineNotice>
      ) : null}

      {snapshot && nutrition ? (
        <>
          <DashboardWidgetStack
            preferences={preferences}
            isLoading={preferencesLoading}
            renderWidget={renderWidget}
          />

          <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Les calories et macronutriments sont des estimations de
            pilotage, pas des mesures médicales.
          </p>
        </>
      ) : status !== 'loading' && status !== 'error' ? (
        <InlineNotice
          className="mt-6"
          tone="error"
          title="Données quotidiennes absentes"
        >
          <div className="flex items-center gap-2">
            <CircleAlert
              aria-hidden="true"
              className="size-4"
            />
            Recharge la page pour relancer le calcul.
          </div>
        </InlineNotice>
      ) : null}
    </section>
  );
}
