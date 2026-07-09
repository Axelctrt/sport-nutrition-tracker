import {
  checkAccountSocialHandleAvailability,
  provisionAccountSocialIdentity,
} from '@/application/friends/accountSocialIdentityService';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';

const accountUserId = 'dexie-user-123';
const currentIdentity = createDefaultSocialIdentity('2026-07-09T10:00:00.000Z', 'browser');

describe('accountSocialIdentityService', () => {
  it('considère le handle du compte courant comme disponible', async () => {
    await expect(checkAccountSocialHandleAvailability({
      async lookupByHandle() {
        return {
          status: 'found',
          profile: {
            userId: accountUserId as never,
            handle: 'alex.run',
            displayName: 'Alex Run',
            createdAt: '2026-07-09T10:00:00.000Z',
            updatedAt: '2026-07-09T10:00:00.000Z',
          },
        };
      },
    }, '@alex.run', accountUserId)).resolves.toMatchObject({
      status: 'available',
    });
  });

  it('réserve le handle avant de sauvegarder localement', async () => {
    const events: string[] = [];
    const saveIdentity = vi.fn(async () => {
      events.push('local');
    });

    const result = await provisionAccountSocialIdentity({
      accountUserId,
      currentIdentity,
      handle: '@alex.run',
      displayName: 'Alex Run',
      repository: {
        readIdentity: vi.fn(async () => currentIdentity),
        saveIdentity,
      },
      cloudPort: {
        async publishIdentity(identity) {
          events.push('cloud');
          return {
            status: 'created',
            value: identity,
            message: 'Réservé.',
          };
        },
      },
      now: '2026-07-09T11:00:00.000Z',
    });

    expect(events).toEqual(['cloud', 'local']);
    expect(result).toMatchObject({
      status: 'saved',
      identity: {
        userId: accountUserId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      },
    });
  });

  it('ne modifie pas le stockage local en cas de conflit', async () => {
    const saveIdentity = vi.fn();

    const result = await provisionAccountSocialIdentity({
      accountUserId,
      currentIdentity,
      handle: 'alex.run',
      displayName: 'Alex',
      repository: {
        readIdentity: vi.fn(async () => currentIdentity),
        saveIdentity,
      },
      cloudPort: {
        async publishIdentity() {
          return {
            status: 'conflict',
            message: 'Déjà pris.',
          };
        },
      },
    });

    expect(result.status).toBe('conflict');
    expect(saveIdentity).not.toHaveBeenCalled();
  });
});
