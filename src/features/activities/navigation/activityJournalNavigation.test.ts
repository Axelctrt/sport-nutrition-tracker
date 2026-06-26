import { describe, expect, it } from 'vitest';
import {
  createActivityJournalFeedbackState,
  createActivityJournalRestoreState,
  createActivityJournalReturnState,
} from '@/features/activities/navigation/activityJournalNavigation';

describe('activityJournalNavigation', () => {
  it('conserve le contexte de retour vers le journal', () => {
    expect(createActivityJournalReturnState(
      '/activities?date=2026-06-25',
      'journal-location-key',
      '2026-06-25',
    )).toEqual({
      activityJournalReturn: {
        path: '/activities?date=2026-06-25',
        scrollKey: 'journal-location-key',
        date: '2026-06-25',
      },
    });
  });

  it('transmet la confirmation et restaure le scroll lorsque la date ne change pas', () => {
    expect(createActivityJournalFeedbackState(
      {
        path: '/activities?date=2026-06-25',
        scrollKey: 'journal-location-key',
        date: '2026-06-25',
      },
      {
        title: 'Activité ajoutée',
        activityId: 'activity-saved',
      },
      '2026-06-25',
    )).toEqual({
      activityJournalFeedback: {
        title: 'Activité ajoutée',
        activityId: 'activity-saved',
      },
      scroll: 'restore',
      restoreScrollKey: 'journal-location-key',
    });
  });

  it('revient en haut lorsque la date de destination change', () => {
    expect(createActivityJournalFeedbackState(
      {
        path: '/activities?date=2026-06-24',
        scrollKey: 'journal-location-key',
        date: '2026-06-24',
      },
      { title: 'Activité ajoutée' },
      '2026-06-25',
    )).toEqual({
      activityJournalFeedback: { title: 'Activité ajoutée' },
      scroll: 'top',
    });

    expect(createActivityJournalRestoreState(undefined)).toBeUndefined();
  });
});
