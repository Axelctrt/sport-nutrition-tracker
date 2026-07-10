import type { TrainingAgendaEntry } from '@/application/planning/trainingAgendaService';
import {
  routePaths,
  weeklyPlanningSessionPath,
  workoutSessionPath,
} from '@/app/routePaths';
import type { ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';

export function sportActivityCreationPath(type: ActivityType, date: LocalDate): string {
  if (type === 'running') {
    return `${routePaths.addRunningActivity}?${new URLSearchParams({ date }).toString()}`;
  }
  if (type === 'swimming') {
    return `${routePaths.addSwimmingActivity}?${new URLSearchParams({ date }).toString()}`;
  }
  if (type === 'strengthTraining') {
    return routePaths.workoutSessions;
  }

  return `${routePaths.addOtherActivity}?${new URLSearchParams({ date, type }).toString()}`;
}

export function sportAgendaEntryPath(entry: TrainingAgendaEntry): string {
  if (entry.status === 'inProgress' && entry.source === 'strength') {
    return workoutSessionPath(entry.id);
  }

  if (entry.source === 'strength') {
    return weeklyPlanningSessionPath(entry.date, entry.id);
  }

  const type = entry.activityType ?? 'otherCardio';
  const base = sportActivityCreationPath(type, entry.date);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${new URLSearchParams({
    plannedSource: 'endurancePlanning',
    plannedId: entry.id,
  }).toString()}`;
}
