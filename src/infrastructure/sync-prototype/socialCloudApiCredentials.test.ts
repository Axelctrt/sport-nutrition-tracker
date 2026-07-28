import {
  resolveSocialCloudApiCredentials,
  socialCloudApiHeaders,
} from '@/infrastructure/sync-prototype/socialCloudApiCredentials';

describe('social cloud API credentials', () => {
  it('refuses missing or incomplete credentials', async () => {
    await expect(resolveSocialCloudApiCredentials(() => undefined))
      .resolves.toBeUndefined();
    await expect(resolveSocialCloudApiCredentials(() => ({
      userId: 'owner@example.com',
      accessToken: '   ',
    }))).resolves.toBeUndefined();
  });

  it('refuses credentials belonging to another account', async () => {
    await expect(resolveSocialCloudApiCredentials(
      () => ({ userId: 'owner@example.com', accessToken: 'secret-token' }),
      'victim@example.com',
    )).resolves.toBeUndefined();
  });

  it('builds authenticated no-cookie API headers', () => {
    expect(socialCloudApiHeaders({
      userId: 'owner@example.com',
      accessToken: 'secret-token',
    }, true)).toEqual({
      accept: 'application/json',
      authorization: 'Bearer secret-token',
      'content-type': 'application/json',
    });
  });
});
