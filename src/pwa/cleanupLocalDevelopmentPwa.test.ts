import { isLocalDevelopmentOrigin } from '@/pwa/cleanupLocalDevelopmentPwa';

describe('isLocalDevelopmentOrigin', () => {
  it('reconnaît localhost et 127.0.0.1', () => {
    expect(isLocalDevelopmentOrigin({ hostname: 'localhost' } as Location)).toBe(true);
    expect(isLocalDevelopmentOrigin({ hostname: '127.0.0.1' } as Location)).toBe(true);
  });

  it('ne désactive pas la PWA sur une origine publiée', () => {
    expect(isLocalDevelopmentOrigin({ hostname: 'sportpilot.example' } as Location)).toBe(false);
  });
});
