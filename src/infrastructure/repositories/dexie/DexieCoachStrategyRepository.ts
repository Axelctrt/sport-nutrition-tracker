import Dexie from 'dexie';
import { COACH_STRATEGY_STATE_ID, type CoachStrategyState } from '@/domain/coach/coachStrategyState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { getActiveDataSpace } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import type { CoachStrategyRepository, CoachStrategySources } from '@/infrastructure/repositories/contracts/CoachStrategyRepository';
import { coachStrategyStateSchema } from '@/shared/validation/coachStrategyStateSchema';

export const COACH_STRATEGY_SOURCE_TABLES = [
  'userProfile', 'userSettings', 'deviceSettings', 'weights', 'foodEntries',
  'dailyJournalStatuses', 'dailyTargets', 'dailySteps', 'dailyCheckIns', 'dailyCheckOuts',
  'activities', 'workoutSessions', 'workoutSessionExercises', 'strengthSets',
  'exerciseDefinitions', 'acceptedCalorieAdjustments',
] as const satisfies readonly (keyof CoachStrategySources)[];

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]),
  );
  return value;
}

export class DexieCoachStrategyRepository implements CoachStrategyRepository {
  private readonly database: AppDatabase;
  private readonly isCurrentSpace: () => boolean;
  constructor(database: AppDatabase, isCurrentSpace = () => getActiveDataSpace().databaseName === database.name) {
    this.database = database;
    this.isCurrentSpace = isCurrentSpace;
  }

  private assertSpace(): void {
    if (!this.isCurrentSpace()) throw new Error('L’espace utilisateur a changé.');
  }

  async read(): Promise<CoachStrategyState | undefined> {
    this.assertSpace();
    const state = await this.database.coachStrategyStates.get(COACH_STRATEGY_STATE_ID);
    this.assertSpace();
    return state ? coachStrategyStateSchema.parse(state) : undefined;
  }

  async transact(update: Parameters<CoachStrategyRepository['transact']>[0]): Promise<CoachStrategyState> {
    this.assertSpace();
    return this.database.transaction('rw',
      [...COACH_STRATEGY_SOURCE_TABLES.map((name) => this.database.table(name)), this.database.coachStrategyStates],
      async () => {
        const state = await this.read();
        const entries = await Promise.all(COACH_STRATEGY_SOURCE_TABLES.map(async (name) =>
          [name, await this.database.table(name).toArray()] as const));
        const sources = Object.fromEntries(entries) as unknown as CoachStrategySources;
        // Equality token only, never an ordering clock. Raw health data is not duplicated in the state.
        const digest = await Dexie.waitFor(crypto.subtle.digest('SHA-256',
          new TextEncoder().encode(JSON.stringify(canonical(sources)))));
        const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        const next = coachStrategyStateSchema.parse(await Dexie.waitFor(update(state, sources, fingerprint)));
        this.assertSpace();
        if (JSON.stringify(next) !== JSON.stringify(state)) await this.database.coachStrategyStates.put(next);
        return next;
      });
  }
}
