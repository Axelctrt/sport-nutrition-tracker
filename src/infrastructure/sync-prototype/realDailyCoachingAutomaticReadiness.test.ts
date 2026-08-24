import Dexie, { type Table } from 'dexie';
import type { DailyCheckIn } from '@/domain/models/dailyCoaching';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  synchronizeRealDailyCoaching,
  type DailyCoachingDayAggregate,
} from '@/infrastructure/sync-prototype/realDailyCoachingSyncService';

const USER_ID = 'user-daily-coaching-readiness';
const DATE = '2026-08-19';
const CREATED_AT = '2026-08-19T06:00:00.000Z';

type CloudDay = DailyCoachingDayAggregate & {
  owner?: string;
  realmId?: string;
};

class TestCloudDatabase extends Dexie {
  declare realDailyCoachingDays: Table<CloudDay, string>;

  constructor() {
    super(`sportpilot-daily-coaching-readiness-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({ realDailyCoachingDays: 'id, date, updatedAt' });
  }
}

function checkIn(
  date = DATE,
  updatedAt = '2026-08-19T07:00:00.000Z',
): DailyCheckIn {
  return {
    id: `daily-check-in:${date}`,
    date,
    sleepDurationMinutes: 450,
    readiness: 'normal',
    contextFlags: ['travel'],
    contextSyncPreference: 'account',
    completedAt: updatedAt,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function cloudDay(
  date: string,
  owner: string,
  updatedAt: string,
): CloudDay {
  const value = checkIn(date, updatedAt);
  return {
    id: `#daily-coaching:${date}`,
    date,
    checkIn: value,
    updatedAt,
    owner,
    realmId: owner,
  };
}

describe('Daily Coaching — gates fresh-device et isolation', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(
      `sportpilot-daily-coaching-readiness-local-${crypto.randomUUID()}`,
    );
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('restaure le cloud sur un appareil frais sans réécriture cloud', async () => {
    await cloud.realDailyCoachingDays.put(
      cloudDay(DATE, USER_ID, '2026-08-19T07:00:00.000Z'),
    );
    const beforeCloud = await cloud.realDailyCoachingDays.toArray();

    const result = await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(result).toMatchObject({ uploadedDays: 0, downloadedDays: 1 });
    expect(await local.dailyCheckIns.get(`daily-check-in:${DATE}`)).toMatchObject({
      date: DATE,
      readiness: 'normal',
      contextFlags: ['travel'],
    });
    expect(await cloud.realDailyCoachingDays.toArray()).toEqual(beforeCloud);
  });

  it('ignore et préserve strictement les jours appartenant à un autre compte', async () => {
    const foreignDate = '2026-08-18';
    await cloud.realDailyCoachingDays.put(
      cloudDay(foreignDate, 'other-user', '2026-08-18T07:00:00.000Z'),
    );
    const foreignBefore = await cloud.realDailyCoachingDays.get(
      `#daily-coaching:${foreignDate}`,
    );

    await local.dailyCheckIns.put(
      checkIn(DATE, '2026-08-19T08:00:00.000Z'),
    );

    await synchronizeRealDailyCoaching(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await cloud.realDailyCoachingDays.get(
      `#daily-coaching:${foreignDate}`,
    )).toEqual(foreignBefore);
    expect(await local.dailyCheckIns.get(`daily-check-in:${foreignDate}`))
      .toBeUndefined();
    expect(await cloud.realDailyCoachingDays.get(`#daily-coaching:${DATE}`))
      .toBeDefined();
  });
});
