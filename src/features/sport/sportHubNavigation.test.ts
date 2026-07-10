import {
  sportActivityCreationPath,
  sportAgendaEntryPath,
} from '@/features/sport/sportHubNavigation';

describe('sportHubNavigation', () => {
  it('ouvre le bon formulaire selon le type avec la date sélectionnée', () => {
    expect(sportActivityCreationPath('running', '2026-07-10')).toBe(
      '/activities/add/running?date=2026-07-10',
    );
    expect(sportActivityCreationPath('walking', '2026-07-10')).toBe(
      '/activities/add/other?date=2026-07-10&type=walking',
    );
    expect(sportActivityCreationPath('strengthTraining', '2026-07-10')).toBe(
      '/strength/sessions',
    );
  });

  it('ouvre directement une séance active et conserve la référence d’un cardio planifié', () => {
    expect(sportAgendaEntryPath({
      id: 'strength-1',
      source: 'strength',
      title: 'Séance active',
      date: '2026-07-10',
      status: 'inProgress',
    })).toBe('/strength/sessions/strength-1');

    expect(sportAgendaEntryPath({
      id: 'run-1',
      source: 'endurance',
      title: 'Footing',
      date: '2026-07-11',
      status: 'upcoming',
      activityType: 'running',
    })).toBe(
      '/activities/add/running?date=2026-07-11&plannedSource=endurancePlanning&plannedId=run-1',
    );
  });
});
