import type { Activity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import type { WeeklyReview } from '@/domain/models/weeklyReview';

export type WeeklyReviewAction =
  | 'planning'
  | 'food'
  | 'weight'
  | 'goals'
  | 'activities';

export interface WeeklyReviewRecommendation {
  id: string;
  title: string;
  detail: string;
  action: WeeklyReviewAction;
  actionLabel: string;
}

export interface WeeklyTrainingInsights {
  hasPlanning: boolean;
  plannedSessions: number;
  completedPlannedSessions: number;
  skippedPlannedSessions: number;
  abandonedPlannedSessions: number;
  pendingPlannedSessions: number;
  adherencePercent?: number;
  actualSessions: number;
  activityMinutes: number;
  strengthSessions: number;
  enduranceSessions: number;
  runningDistanceKm: number;
  cyclingDistanceKm: number;
  swimmingDistanceMeters: number;
}

export interface WeeklyReviewInsights {
  training: WeeklyTrainingInsights;
  successes: string[];
  attentionPoints: string[];
  recommendations: WeeklyReviewRecommendation[];
}

export interface WeeklyEndurancePlanningInput {
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
}

export interface BuildWeeklyReviewInsightsInput {
  review: WeeklyReview;
  activities: Activity[];
  workoutSessions: WorkoutSession[];
  endurancePlanning: WeeklyEndurancePlanningInput;
}

function isWithinWeek(date: string, review: WeeklyReview): boolean {
  return date >= review.weekStart && date <= review.weekEnd;
}

function isPlannedStrengthSession(session: WorkoutSession): boolean {
  return Boolean(
    session.plannedDate
    || session.originalPlannedDate
    || session.plannedAt,
  );
}

function formatCount(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildRecommendations(
  review: WeeklyReview,
  training: WeeklyTrainingInsights,
): WeeklyReviewRecommendation[] {
  const recommendations: WeeklyReviewRecommendation[] = [];

  if (!training.hasPlanning) {
    recommendations.push({
      id: 'prepare-planning',
      title: 'Préparer la prochaine semaine',
      detail: 'Planifie les séances prioritaires pour comparer ensuite le prévu et le réalisé.',
      action: 'planning',
      actionLabel: 'Ouvrir le planning',
    });
  } else if (training.completedPlannedSessions < training.plannedSessions) {
    recommendations.push({
      id: 'adjust-planning',
      title: 'Ajuster le prochain planning',
      detail: `${training.completedPlannedSessions} séance(s) réalisée(s) sur ${training.plannedSessions} prévue(s) : conserve un volume réaliste.`,
      action: 'planning',
      actionLabel: 'Voir le planning',
    });
  }

  if (review.completedFoodDays < 4) {
    recommendations.push({
      id: 'complete-food-tracking',
      title: 'Renforcer le suivi alimentaire',
      detail: 'Termine davantage de journées pour obtenir une comparaison nutritionnelle plus fiable.',
      action: 'food',
      actionLabel: 'Ouvrir le journal',
    });
  }

  if (review.weighInCount < 3) {
    recommendations.push({
      id: 'record-weight',
      title: 'Ajouter des pesées régulières',
      detail: 'Trois pesées réparties dans la semaine permettent d’observer une tendance plus représentative.',
      action: 'weight',
      actionLabel: 'Enregistrer une pesée',
    });
  }

  if (training.actualSessions === 0) {
    recommendations.push({
      id: 'record-activity',
      title: 'Enregistrer la prochaine activité',
      detail: 'Ajoute la séance réalisée pour conserver un historique exploitable.',
      action: 'activities',
      actionLabel: 'Voir les activités',
    });
  }

  if (review.recordedStepDays < 4) {
    recommendations.push({
      id: 'review-goals',
      title: 'Vérifier les objectifs de régularité',
      detail: 'Consulte les objectifs et choisis un niveau de suivi adapté à la semaine à venir.',
      action: 'goals',
      actionLabel: 'Voir les objectifs',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'continue-progress',
      title: 'Poursuivre sur cette base',
      detail: 'La semaine est bien documentée. Utilise les objectifs pour préparer le prochain jalon.',
      action: 'goals',
      actionLabel: 'Voir les objectifs',
    });
  }

  return recommendations.slice(0, 3);
}

export function buildWeeklyReviewInsights({
  review,
  activities,
  workoutSessions,
  endurancePlanning,
}: BuildWeeklyReviewInsightsInput): WeeklyReviewInsights {
  const weeklyActivities = activities.filter((activity) => isWithinWeek(activity.date, review));
  const weeklyWorkoutSessions = workoutSessions.filter((session) => {
    const referenceDate = session.plannedDate ?? session.date;
    return isWithinWeek(referenceDate, review);
  });
  const plannedStrengthSessions = weeklyWorkoutSessions.filter(isPlannedStrengthSession);
  const completedStrengthPlanned = plannedStrengthSessions.filter(
    ({ status }) => status === 'completed',
  ).length;
  const skippedStrength = plannedStrengthSessions.filter(
    ({ status }) => status === 'skipped',
  ).length;
  const abandonedStrength = plannedStrengthSessions.filter(
    ({ status }) => status === 'abandoned',
  ).length;
  const pendingStrength = plannedStrengthSessions.filter(
    ({ status }) => status === 'planned' || status === 'inProgress',
  ).length;

  const completedWorkoutSessions = workoutSessions.filter(
    (session) => session.status === 'completed' && isWithinWeek(session.date, review),
  );
  const completedWorkoutDates = new Set(completedWorkoutSessions.map(({ date }) => date));
  const countedActivities = weeklyActivities.filter(
    (activity) => activity.type !== 'strengthTraining' || !completedWorkoutDates.has(activity.date),
  );

  const strengthActivityEntries = countedActivities.filter(
    ({ type }) => type === 'strengthTraining',
  );
  const enduranceActivities = countedActivities.filter(
    ({ type }) => type !== 'strengthTraining',
  );
  const endurancePlannedSessions = (
    endurancePlanning.plannedCount
    + endurancePlanning.completedCount
    + endurancePlanning.skippedCount
  );
  const plannedSessions = plannedStrengthSessions.length + endurancePlannedSessions;
  const completedPlannedSessions = completedStrengthPlanned + endurancePlanning.completedCount;
  const skippedPlannedSessions = skippedStrength + endurancePlanning.skippedCount;
  const abandonedPlannedSessions = abandonedStrength;
  const pendingPlannedSessions = pendingStrength + endurancePlanning.plannedCount;
  const actualSessions = completedWorkoutSessions.length + countedActivities.length;
  const activityMinutes = Math.round(
    completedWorkoutSessions.reduce(
      (total, session) => total + (session.durationMinutes ?? 0),
      0,
    )
      + countedActivities.reduce(
        (total, activity) => total + activity.durationMinutes,
        0,
      ),
  );

  const training: WeeklyTrainingInsights = {
    hasPlanning: plannedSessions > 0,
    plannedSessions,
    completedPlannedSessions,
    skippedPlannedSessions,
    abandonedPlannedSessions,
    pendingPlannedSessions,
    ...(plannedSessions > 0
      ? {
        adherencePercent: Math.round(
          (completedPlannedSessions / plannedSessions) * 100,
        ),
      }
      : {}),
    actualSessions,
    activityMinutes,
    strengthSessions: completedWorkoutSessions.length + strengthActivityEntries.length,
    enduranceSessions: enduranceActivities.length,
    runningDistanceKm: enduranceActivities
      .filter((activity) => activity.type === 'running')
      .reduce((total, activity) => total + activity.distanceKm, 0),
    cyclingDistanceKm: enduranceActivities
      .filter((activity) => activity.type === 'cycling')
      .reduce((total, activity) => total + (activity.distanceKm ?? 0), 0),
    swimmingDistanceMeters: enduranceActivities
      .filter((activity) => activity.type === 'swimming')
      .reduce((total, activity) => total + activity.distanceMeters, 0),
  };

  const successes: string[] = [];
  if (
    training.hasPlanning
    && training.completedPlannedSessions === training.plannedSessions
  ) {
    successes.push(
      training.plannedSessions === 1
        ? 'La séance prévue a été réalisée.'
        : `Les ${formatCount(training.plannedSessions, 'séance prévue', 'séances prévues')} ont été réalisées.`,
    );
  } else if (
    training.hasPlanning
    && (training.adherencePercent ?? 0) >= 75
  ) {
    successes.push(
      `${training.completedPlannedSessions} séances réalisées sur ${training.plannedSessions} prévues.`,
    );
  }
  if (training.actualSessions >= 3) {
    successes.push(
      `${formatCount(training.actualSessions, 'activité enregistrée', 'activités enregistrées')} cette semaine.`,
    );
  }
  if (review.completedFoodDays >= 5) {
    successes.push(
      `${review.completedFoodDays} journées alimentaires terminées.`,
    );
  }
  if (review.stepGoalDays >= 5) {
    successes.push(
      `Objectif de pas atteint ${review.stepGoalDays} jours sur 7.`,
    );
  }
  if (review.weighInCount >= 3) {
    successes.push(
      `${review.weighInCount} pesées permettent d’observer la tendance de la semaine.`,
    );
  }

  const attentionPoints: string[] = [];
  if (
    training.hasPlanning
    && training.completedPlannedSessions < training.plannedSessions
  ) {
    attentionPoints.push(
      `${training.completedPlannedSessions} séances réalisées sur ${training.plannedSessions} prévues.`,
    );
  } else if (!training.hasPlanning && training.actualSessions > 0) {
    attentionPoints.push(
      'Des activités ont été enregistrées, mais aucun planning n’était défini pour cette semaine.',
    );
  }
  if (training.actualSessions === 0) {
    attentionPoints.push(
      'Aucune activité sportive n’est enregistrée pour cette semaine.',
    );
  }
  if (review.completedFoodDays < 4) {
    attentionPoints.push(
      `${review.completedFoodDays} journée(s) alimentaire(s) terminée(s) : la comparaison nutritionnelle reste limitée.`,
    );
  }
  if (review.recordedStepDays < 4) {
    attentionPoints.push(
      `Les pas sont renseignés sur ${review.recordedStepDays} jour(s).`,
    );
  }
  if (review.weighInCount < 3) {
    attentionPoints.push(
      `${review.weighInCount} pesée(s) enregistrée(s) : la tendance du poids reste indicative.`,
    );
  }

  return {
    training,
    successes: successes.slice(0, 3),
    attentionPoints: attentionPoints.slice(0, 3),
    recommendations: buildRecommendations(review, training),
  };
}
