import { describe, expect, it, vi } from 'vitest';

import { accountDataDeletionInternals } from './accountDataDeletion.js';

describe('account data deletion', () => {
  it('deletes every social row involving the authenticated account in one batch', async () => {
    const statements = [];
    const database = {
      prepare: vi.fn((sql) => ({
        bind: vi.fn((userId) => {
          const statement = { sql, userId };
          statements.push(statement);
          return statement;
        }),
      })),
      batch: vi.fn(async (values) =>
        values.map(() => ({ meta: { changes: 2 } }))),
    };

    const deleted = await accountDataDeletionInternals.deleteSocialAccountData(
      database,
      'account-user',
    );

    expect(database.batch).toHaveBeenCalledOnce();
    expect(statements).toHaveLength(5);
    expect(statements.every((value) => value.userId === 'account-user')).toBe(true);
    expect(statements.map((value) => value.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DELETE FROM social_activity_snapshots'),
        expect.stringContaining('DELETE FROM social_friend_permissions'),
        expect.stringContaining('DELETE FROM social_friend_requests'),
        expect.stringContaining('DELETE FROM social_friendships'),
        expect.stringContaining('DELETE FROM social_directory_handles'),
      ]),
    );
    expect(deleted).toBe(10);
  });
});
