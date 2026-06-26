export interface ActivityJournalReturnContext {
  path: string;
  scrollKey: string;
  date: string;
}

export interface ActivityJournalFeedback {
  title: string;
  activityId?: string;
}

export interface ActivityJournalNavigationState {
  activityJournalReturn?: ActivityJournalReturnContext;
  activityJournalFeedback?: ActivityJournalFeedback;
  scroll?: 'top' | 'preserve' | 'restore';
  restoreScrollKey?: string;
}

export function createActivityJournalReturnState(
  path: string,
  scrollKey: string,
  date: string,
): ActivityJournalNavigationState {
  return {
    activityJournalReturn: {
      path,
      scrollKey,
      date,
    },
  };
}

export function createActivityJournalFeedbackState(
  context: ActivityJournalReturnContext | undefined,
  feedback: ActivityJournalFeedback,
  destinationDate: string,
): ActivityJournalNavigationState {
  const canRestore = context?.date === destinationDate;

  return {
    activityJournalFeedback: feedback,
    ...(canRestore
      ? {
          scroll: 'restore' as const,
          restoreScrollKey: context.scrollKey,
        }
      : {
          scroll: 'top' as const,
        }),
  };
}

export function createActivityJournalRestoreState(
  context: ActivityJournalReturnContext | undefined,
): ActivityJournalNavigationState | undefined {
  if (!context) return undefined;

  return {
    scroll: 'restore',
    restoreScrollKey: context.scrollKey,
  };
}
