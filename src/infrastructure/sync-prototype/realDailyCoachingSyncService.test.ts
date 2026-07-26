import Dexie, { type Table } from 'dexie';

import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from '@/domain/models/dailyCoaching';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealDailyCoachingSync,
  synchronizeRealDailyCoaching,
  type DailyCoachingDayAggregate,
} from '@/infrastructure/sync-prototype/realDailyCoachingSyncService';

type CloudDay = DailyCoachingDayAggregate & {
  owner?: string;
  realmId?: string;
};

class TestCloudDatabase extends Dexie {
  declare realDailyCoachingDays: Table<CloudDay, string>;

  constructor() {
    super(`sportpilot-daily-coaching-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realDailyCoachingDays: 'id, date, updatedAt',
    });
  }
}

const DATE = '2026-07-26';
const CREATED_AT = '2026-07-26T06:00:00.000Z';

function checkIn(
  updatedAt = '2026-07-26T07:00:00.000Z',
  preference: DailyCheckIn['contextSyncPreference'] = 'account',
): DailyCheckIn {
  return {
    id: `daily-check-in:${DATE}`,
    date: DATE,
    sleepDurationMinutes: 450,
    readiness: 'normal',
    contextFlags: ['travel'],
    contextSyncPreference: preference,
    completedAt: updatedAt,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function decision(): DailyActivityDecision {
  const updatedAt = '2026-07-26T08:00:00.000Z';
  return {
    id: `daily-activity-decision:${DATE}`,
    date: DATE,
    decision: 'activities',
    confirmedAt: updatedAt,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function checkOut(): DailyCheckOut {
  const updatedAt = '2026-07-26T20:00:00.000Z';
  return {
    id: `daily-check-out:${DATE}`,
    date: DATE,
    energy: 'normal',
    hunger: 'high',
    foodJournalComplete: true,
    contextFlags: [],
    contextSyncPreference: 'account',
    completedAt: updatedAt,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

describe('synchronisation du suivi quotidien', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(
      `sportpilot-daily-coaching-local-${crypto.randomUUID()}`,
    );
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie un jour local avec ses pas sous un identifiant canonique', async () => {
    await local.dailyCheckIns.add(checkIn());
    await local.dailySteps.add({
      id: 'legacy-random-step-id',
      date: DATE,
      totalSteps: 9_500,
      source: 'manual',
      createdAt: CREATED_AT,
      updatedAt: '2026-07-26T21:00:00.000Z',
    });

    const result = await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.uploadedDays).toBe(1);
    expect(await local.dailySteps.get(`steps:${DATE}`)).toMatchObject({
      totalSteps: 9_500,
    });
    expect(await cloud.realDailyCoachingDays.get(`#daily-coaching:${DATE}`))
      .toMatchObject({
        steps: { id: `steps:${DATE}`, totalSteps: 9_500 },
      });
  });

  it('fusionne independamment le check-in local et le check-out cloud', async () => {
    await local.dailyCheckIns.add(checkIn());
    const remoteCheckOut = checkOut();
    await cloud.realDailyCoachingDays.add({
      id: `#daily-coaching:${DATE}`,
      date: DATE,
      checkOut: remoteCheckOut,
      updatedAt: remoteCheckOut.updatedAt,
    });

    await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.dailyCheckIns.count()).toBe(1);
    expect(await local.dailyCheckOuts.get(`daily-check-out:${DATE}`))
      .toEqual(remoteCheckOut);
    expect(await cloud.realDailyCoachingDays.get(`#daily-coaching:${DATE}`))
      .toMatchObject({
        checkIn: { id: `daily-check-in:${DATE}` },
        checkOut: { id: `daily-check-out:${DATE}` },
      });
  });

  it('ne transmet pas les drapeaux de contexte locaux', async () => {
    await local.dailyCheckIns.add(checkIn(
      '2026-07-26T07:30:00.000Z',
      'localOnly',
    ));
    await local.dailyActivityDecisions.add(decision());

    await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(
      (await cloud.realDailyCoachingDays.get(`#daily-coaching:${DATE}`))
        ?.checkIn?.contextFlags,
    ).toEqual([]);
    expect(
      (await local.dailyCheckIns.get(`daily-check-in:${DATE}`))?.contextFlags,
    ).toEqual(['travel']);
  });

  it('devient stable apres une synchronisation complete', async () => {
    await local.dailyCheckIns.add(checkIn());
    await local.dailyActivityDecisions.add(decision());

    await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const preview = await previewRealDailyCoachingSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
  });
});
