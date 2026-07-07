import {
  formatSocialActivityDuration,
  formatSocialActivityPace,
  formatSocialActivitySwimPace,
  presentSocialActivityChart,
  presentSocialActivitySummary,
  presentSocialCardioTags,
  presentSocialStrengthSet,
} from '@/features/friends/components/socialActivityFeedPresentation';

describe('social activity feed presentation 0.29.0 A8', () => {
  it('formate les durées et les rythmes sans produire 60 secondes', () => {
    expect(formatSocialActivityDuration(62)).toBe('1 h 02');
    expect(formatSocialActivityDuration(120)).toBe('2 h');
    expect(formatSocialActivityPace(5.999)).toBe('6\'00"/km');
    expect(formatSocialActivitySwimPace(119.8)).toBe('2\'00"/100 m');
  });

  it('présente les métriques autorisées avec un libellé métier', () => {
    expect(presentSocialActivitySummary({
      durationMinutes: 62,
      distanceKm: 10.25,
      caloriesKcal: 620,
      exerciseCount: 4,
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'duration', label: 'Durée', value: '1 h 02' }),
      expect.objectContaining({ id: 'distance-km', label: 'Distance', value: '10,25 km' }),
      expect.objectContaining({ id: 'calories', label: 'Calories', value: '620 kcal' }),
      expect.objectContaining({ id: 'exercise-count', value: '4 exercices' }),
    ]));
  });

  it('traduit les caractéristiques cardio persistées', () => {
    expect(presentSocialCardioTags({
      family: 'cardio',
      sessionType: 'intervals',
      terrainType: 'track',
    }, 'running')).toEqual(['Fractionné', 'Piste']);

    expect(presentSocialCardioTags({
      family: 'cardio',
      sessionType: 'technique',
      mainStroke: 'freestyle',
      poolLengthMeters: 25,
    }, 'swimming')).toEqual(['Technique', 'Crawl', 'Bassin 25 m']);
  });

  it('distingue la charge externe, le poids du corps et l’assistance', () => {
    expect(presentSocialStrengthSet({
      setNumber: 1,
      repetitions: 10,
      loadKg: 60,
      loadUnit: 'kg',
    }).main).toBe('60 kg × 10');
    expect(presentSocialStrengthSet({
      setNumber: 2,
      repetitions: 9,
      loadUnit: 'bodyweight',
    }).main).toBe('Poids du corps × 9');
    expect(presentSocialStrengthSet({
      setNumber: 3,
      repetitions: 8,
      loadKg: 20,
      loadUnit: 'assistedKg',
    }).main).toBe('Assistance 20 kg × 8');
  });

  it('ne construit un graphique qu’à partir de points réellement fournis', () => {
    expect(presentSocialActivityChart({ family: 'cardio' })).toBeUndefined();
    expect(presentSocialActivityChart({
      family: 'cardio',
      paceSeries: [
        { elapsedSeconds: 0, paceMinutesPerKm: 5.5 },
        { elapsedSeconds: 600, paceMinutesPerKm: 5.25 },
      ],
    })).toEqual(expect.objectContaining({
      metric: 'pace',
      reverseYAxis: true,
      points: [
        { elapsedSeconds: 0, value: 5.5 },
        { elapsedSeconds: 600, value: 5.25 },
      ],
    }));
  });
});
