import type {
  Activity,
  CyclingActivity,
  EnduranceActivity,
  RunningActivity,
  SwimmingActivity,
} from '@/domain/models/activity';

export interface EnduranceRecord<T extends EnduranceActivity> {
  activity: T;
  value: number;
}

export interface DistanceRecord<T extends RunningActivity | SwimmingActivity> {
  activity: T;
  distance: number;
  durationSeconds: number;
}

export interface EnduranceRecords {
  running: {
    longest?: EnduranceRecord<RunningActivity>;
    fastestPace?: EnduranceRecord<RunningActivity>;
    highestElevation?: EnduranceRecord<RunningActivity>;
    commonDistances: DistanceRecord<RunningActivity>[];
  };
  swimming: {
    longest?: EnduranceRecord<SwimmingActivity>;
    fastestPace?: EnduranceRecord<SwimmingActivity>;
    commonDistances: DistanceRecord<SwimmingActivity>[];
  };
  cycling: {
    longest?: EnduranceRecord<CyclingActivity>;
    fastestSpeed?: EnduranceRecord<CyclingActivity>;
    highestElevation?: EnduranceRecord<CyclingActivity>;
  };
}

export function calculateAverageSpeedKmh(durationMinutes: number, distanceKm: number): number {
  if (durationMinutes <= 0 || distanceKm <= 0) return 0;
  return distanceKm / (durationMinutes / 60);
}

export function calculatePoolLengths(distanceMeters: number, poolLengthMeters: number | undefined): number | undefined {
  if (!poolLengthMeters || distanceMeters <= 0) return undefined;
  return distanceMeters / poolLengthMeters;
}

function minimumBy<T>(items: readonly T[], value: (item: T) => number | undefined): EnduranceRecord<T & EnduranceActivity> | undefined {
  let best: EnduranceRecord<T & EnduranceActivity> | undefined;
  for (const item of items) {
    const candidate = value(item);
    if (candidate === undefined || !Number.isFinite(candidate) || candidate <= 0) continue;
    if (!best || candidate < best.value) {
      best = { activity: item as T & EnduranceActivity, value: candidate };
    }
  }
  return best;
}

function maximumBy<T>(items: readonly T[], value: (item: T) => number | undefined): EnduranceRecord<T & EnduranceActivity> | undefined {
  let best: EnduranceRecord<T & EnduranceActivity> | undefined;
  for (const item of items) {
    const candidate = value(item);
    if (candidate === undefined || !Number.isFinite(candidate) || candidate < 0) continue;
    if (!best || candidate > best.value) {
      best = { activity: item as T & EnduranceActivity, value: candidate };
    }
  }
  return best;
}


const RUNNING_COMMON_DISTANCES_KM = [5, 10, 21.1, 42.195] as const;
const SWIMMING_COMMON_DISTANCES_METERS = [400, 750, 1_000, 1_500, 3_000] as const;

function runningDistanceMatches(actualKm: number, targetKm: number): boolean {
  return Math.abs(actualKm - targetKm) <= Math.max(0.05, targetKm * 0.01);
}

function commonRunningDistanceRecords(activities: readonly RunningActivity[]): DistanceRecord<RunningActivity>[] {
  return RUNNING_COMMON_DISTANCES_KM.flatMap((distance) => {
    const candidates = activities.filter((activity) => runningDistanceMatches(activity.distanceKm, distance));
    const fastest = minimumBy(candidates, (activity) => activity.durationMinutes * 60);
    return fastest ? [{ activity: fastest.activity as RunningActivity, distance, durationSeconds: fastest.value }] : [];
  });
}

function commonSwimmingDistanceRecords(activities: readonly SwimmingActivity[]): DistanceRecord<SwimmingActivity>[] {
  return SWIMMING_COMMON_DISTANCES_METERS.flatMap((distance) => {
    const candidates = activities.filter((activity) => activity.distanceMeters === distance);
    const fastest = minimumBy(candidates, (activity) => activity.durationMinutes * 60);
    return fastest ? [{ activity: fastest.activity as SwimmingActivity, distance, durationSeconds: fastest.value }] : [];
  });
}

export function calculateEnduranceRecords(activities: readonly Activity[]): EnduranceRecords {
  const running = activities.filter((activity): activity is RunningActivity => activity.type === 'running');
  const swimming = activities.filter((activity): activity is SwimmingActivity => activity.type === 'swimming');
  const cycling = activities.filter((activity): activity is CyclingActivity => activity.type === 'cycling');

  const runningLongest = maximumBy(running, (activity) => activity.distanceKm) as EnduranceRecords['running']['longest'];
  const runningFastest = minimumBy(running, (activity) => (activity.durationMinutes * 60) / activity.distanceKm) as EnduranceRecords['running']['fastestPace'];
  const runningElevation = maximumBy(running, (activity) => activity.elevationGainMeters) as EnduranceRecords['running']['highestElevation'];
  const swimmingLongest = maximumBy(swimming, (activity) => activity.distanceMeters) as EnduranceRecords['swimming']['longest'];
  const swimmingFastest = minimumBy(swimming, (activity) => (activity.durationMinutes * 60) / (activity.distanceMeters / 100)) as EnduranceRecords['swimming']['fastestPace'];
  const cyclingLongest = maximumBy(cycling, (activity) => activity.distanceKm) as EnduranceRecords['cycling']['longest'];
  const cyclingFastest = maximumBy(cycling, (activity) => (
    activity.distanceKm === undefined
      ? undefined
      : calculateAverageSpeedKmh(activity.durationMinutes, activity.distanceKm)
  )) as EnduranceRecords['cycling']['fastestSpeed'];
  const cyclingElevation = maximumBy(cycling, (activity) => activity.elevationGainMeters) as EnduranceRecords['cycling']['highestElevation'];

  return {
    running: {
      ...(runningLongest ? { longest: runningLongest } : {}),
      ...(runningFastest ? { fastestPace: runningFastest } : {}),
      ...(runningElevation ? { highestElevation: runningElevation } : {}),
      commonDistances: commonRunningDistanceRecords(running),
    },
    swimming: {
      ...(swimmingLongest ? { longest: swimmingLongest } : {}),
      ...(swimmingFastest ? { fastestPace: swimmingFastest } : {}),
      commonDistances: commonSwimmingDistanceRecords(swimming),
    },
    cycling: {
      ...(cyclingLongest ? { longest: cyclingLongest } : {}),
      ...(cyclingFastest ? { fastestSpeed: cyclingFastest } : {}),
      ...(cyclingElevation ? { highestElevation: cyclingElevation } : {}),
    },
  };
}
