import type {
  ActivityIntensity,
  ActivityType,
  CyclingBikeType,
  CyclingEnvironment,
  MainStroke,
  RunningSessionType,
  RunningTerrainType,
  SwimmingSessionType,
} from '@/domain/models/activity';

export const activityTypeLabels: Record<ActivityType, string> = {
  running: 'Course',
  swimming: 'Natation',
  strengthTraining: 'Musculation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Autre cardio',
};

export const intensityLabels: Record<ActivityIntensity, string> = {
  low: 'Faible',
  moderate: 'Modérée',
  high: 'Élevée',
};

export const runningSessionLabels: Record<RunningSessionType, string> = {
  easy: 'Footing',
  recovery: 'Récupération',
  longRun: 'Sortie longue',
  tempo: 'Tempo',
  intervals: 'Fractionné',
  hills: 'Côtes',
  competition: 'Compétition',
};

export const swimmingSessionLabels: Record<SwimmingSessionType, string> = {
  recovery: 'Récupération',
  technique: 'Technique',
  endurance: 'Endurance',
  tempo: 'Tempo',
  intervals: 'Intervalles',
  competition: 'Compétition',
};

export const strokeLabels: Record<MainStroke, string> = {
  freestyle: 'Crawl',
  breaststroke: 'Brasse',
  backstroke: 'Dos',
  butterfly: 'Papillon',
  mixed: 'Mixte',
  drills: 'Éducatifs',
};

export const terrainLabels: Record<RunningTerrainType, string> = {
  road: 'Route',
  track: 'Piste',
  trail: 'Trail / sentier',
  treadmill: 'Tapis',
  mixed: 'Mixte',
};

export const bikeTypeLabels: Record<CyclingBikeType, string> = {
  road: 'Route',
  gravel: 'Gravel',
  mountain: 'VTT',
  city: 'Ville / trekking',
  indoor: 'Vélo d’intérieur',
  other: 'Autre',
};

export const cyclingEnvironmentLabels: Record<CyclingEnvironment, string> = {
  outdoor: 'Extérieur',
  indoor: 'Intérieur',
};
