import { describe, expect, it } from 'vitest';

import {
  cloudAccountStatusLabel,
  cloudLicenseLabel,
  mapCloudOperationError,
  resolveCloudAccountAccess,
} from './cloudAccountAccess';

const now = new Date('2026-07-28T12:00:00.000Z');

describe('resolveCloudAccountAccess', () => {
  it('ne considère pas une identité connectée sans jeton renouvelable comme opérationnelle', () => {
    expect(resolveCloudAccountAccess({
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      license: { type: 'prod', status: 'ok' },
    }, { isOnline: true, now })).toMatchObject({
      status: 'reauthentication-required',
      isIdentityConnected: true,
      isOperational: false,
      errorCode: 'SESSION_EXPIRED',
    });
  });

  it('demande un unique renouvellement quand le jeton d’accès est périmé mais le refresh est valide', () => {
    expect(resolveCloudAccountAccess({
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      license: { type: 'prod', status: 'ok' },
      hasAccessToken: true,
      accessTokenExpiresAt: '2026-07-28T11:59:00.000Z',
      hasRefreshToken: true,
      refreshTokenExpiresAt: '2026-08-28T12:00:00.000Z',
    }, { isOnline: true, now })).toMatchObject({
      status: 'renewal-required',
      canAttemptRenewal: true,
      isOperational: false,
    });
  });

  it('réserve le statut hors connexion à navigator.onLine faux', () => {
    expect(resolveCloudAccountAccess({
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      license: { type: 'prod', status: 'ok' },
      hasAccessToken: true,
    }, { isOnline: false, now })).toMatchObject({
      status: 'offline',
      errorCode: 'NETWORK_OFFLINE',
    });
  });

  it('bloque une licence expirée avant de considérer le jeton', () => {
    expect(resolveCloudAccountAccess({
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      license: { type: 'eval', status: 'expired', evalDaysLeft: 0 },
      hasAccessToken: true,
    }, { isOnline: true, now })).toMatchObject({
      status: 'license-expired',
      errorCode: 'LICENSE_EXPIRED',
      isOperational: false,
    });
  });
});

describe('libellés et erreurs cloud', () => {
  it('présente les licences avec un libellé français', () => {
    expect(cloudLicenseLabel({
      type: 'prod',
      status: 'ok',
    })).toBe('Production active');
    expect(cloudLicenseLabel({
      type: 'eval',
      status: 'expired',
      evalDaysLeft: 0,
    })).toBe('Évaluation terminée');
  });

  it('présente un état court sans confondre licence et réseau', () => {
    const access = resolveCloudAccountAccess({
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      license: { type: 'eval', status: 'expired', evalDaysLeft: 0 },
      hasAccessToken: true,
    }, { isOnline: true, now });

    expect(cloudAccountStatusLabel(access)).toBe('Synchronisation suspendue');
  });

  it('ne laisse pas remonter HttpError 403 dans l’interface', () => {
    expect(mapCloudOperationError(new Error('HttpError: 403')).message)
      .toBe('L’accès cloud de ce compte n’est pas autorisé. Vérifie l’état du compte.');
  });
});
