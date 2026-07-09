import { describe, expect, it } from 'vitest';
import { socialDirectoryInternals } from './socialDirectory.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/gu, ' ').trim().toLowerCase();
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = normalizeSql(sql);
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  first() {
    return this.database.first(this.sql, this.args);
  }

  run() {
    return this.database.run(this.sql, this.args);
  }
}

class FakeDirectoryDatabase {
  constructor(rows = [], raceOwnerId) {
    this.rows = new Map(rows.map((row) => [row.handle, row]));
    this.raceOwnerId = raceOwnerId;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async first(sql, args) {
    if (sql.includes('from social_directory_handles') && sql.includes('where handle = ?1')) {
      return this.rows.get(args[0]);
    }
    throw new Error(`Unsupported first SQL: ${sql}`);
  }

  async run(sql, args) {
    if (sql.startsWith('create table') || sql.startsWith('create index')) return {};

    if (sql.startsWith('insert or ignore into social_directory_handles')) {
      const [handle, ownerUserId, displayName, timestamp] = args;
      if (!this.rows.has(handle)) {
        const actualOwner = this.raceOwnerId ?? ownerUserId;
        this.rows.set(handle, {
          handle,
          owner_user_id: actualOwner,
          owner_display_name: displayName,
          reserved_at: timestamp,
          updated_at: timestamp,
        });
      }
      return {};
    }

    if (sql.startsWith('update social_directory_handles')) {
      const [handle, displayName, timestamp, ownerUserId] = args;
      const row = this.rows.get(handle);
      if (row?.owner_user_id === ownerUserId) {
        this.rows.set(handle, {
          ...row,
          owner_display_name: displayName,
          updated_at: timestamp,
        });
      }
      return {};
    }

    if (sql.startsWith('delete from social_directory_handles')) {
      const [ownerUserId, nextHandle] = args;
      for (const [handle, row] of this.rows) {
        if (row.owner_user_id === ownerUserId && handle !== nextHandle) {
          this.rows.delete(handle);
        }
      }
      return {};
    }

    throw new Error(`Unsupported run SQL: ${sql}`);
  }
}

describe('socialDirectory reservation', () => {
  it('réserve le nouveau handle avant de libérer l’ancien', async () => {
    const database = new FakeDirectoryDatabase([{
      handle: 'ancien.handle',
      owner_user_id: 'user-1',
      owner_display_name: 'Ancien',
      reserved_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z',
    }]);

    const result = await socialDirectoryInternals.reserveSocialHandle(database, {
      userId: 'user-1',
      handle: 'nouveau.handle',
      displayName: 'Nouveau',
    }, 'user-1');

    expect(result.status).toBe(201);
    expect(database.rows.has('ancien.handle')).toBe(false);
    expect(database.rows.get('nouveau.handle')).toMatchObject({
      owner_user_id: 'user-1',
      owner_display_name: 'Nouveau',
    });
  });

  it('conserve l’ancien handle si un autre compte gagne la réservation concurrente', async () => {
    const database = new FakeDirectoryDatabase([{
      handle: 'ancien.handle',
      owner_user_id: 'user-1',
      owner_display_name: 'Ancien',
      reserved_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z',
    }], 'user-2');

    const result = await socialDirectoryInternals.reserveSocialHandle(database, {
      userId: 'user-1',
      handle: 'nouveau.handle',
      displayName: 'Nouveau',
    }, 'user-1');

    expect(result.status).toBe(409);
    expect(database.rows.get('ancien.handle')?.owner_user_id).toBe('user-1');
    expect(database.rows.get('nouveau.handle')?.owner_user_id).toBe('user-2');
  });

  it('applique les mêmes contraintes de format que le client', () => {
    expect(() => socialDirectoryInternals.normalizeHandle('_alex')).toThrow();
    expect(() => socialDirectoryInternals.normalizeHandle('a'.repeat(25))).toThrow();
    expect(socialDirectoryInternals.normalizeHandle('alex.run')).toBe('alex.run');
  });
});
