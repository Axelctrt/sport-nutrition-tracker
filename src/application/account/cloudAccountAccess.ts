export type CloudAccountAccessStatus =
  | 'loading'
  | 'signed-out'
  | 'offline'
  | 'license-expired'
  | 'license-deactivated'
  | 'renewal-required'
  | 'reauthentication-required'
  | 'ready';

export type CloudAccountAccessErrorCode =
  | 'ACCOUNT_LOADING'
  | 'ACCOUNT_SIGNED_OUT'
  | 'NETWORK_OFFLINE'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_DEACTIVATED'
  | 'SESSION_EXPIRED'
  | 'CLOUD_UNAVAILABLE';

export interface CloudAccountAccessAccount {
  readonly isLoggedIn: boolean;
  readonly isLoading: boolean;
  readonly userId?: string;
  readonly license?: {
    readonly type: 'demo' | 'eval' | 'prod' | 'client';
    readonly status: 'ok' | 'expired' | 'deactivated';
    readonly evalDaysLeft?: number;
  };
  readonly hasAccessToken?: boolean;
  readonly accessTokenExpiresAt?: string;
  readonly hasRefreshToken?: boolean;
  readonly refreshTokenExpiresAt?: string;
}

export interface CloudAccountAccessSnapshot {
  readonly status: CloudAccountAccessStatus;
  readonly errorCode?: CloudAccountAccessErrorCode;
  readonly isIdentityConnected: boolean;
  readonly isOperational: boolean;
  readonly canAttemptRenewal: boolean;
  readonly message: string;
  readonly actionLabel?: string;
}

export interface ResolveCloudAccountAccessOptions {
  readonly isOnline: boolean;
  readonly now?: Date;
  readonly renewalWindowMs?: number;
}

const DEFAULT_RENEWAL_WINDOW_MS = 60_000;

function expirationTime(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshot(
  status: CloudAccountAccessStatus,
  values: Omit<CloudAccountAccessSnapshot, 'status'>,
): CloudAccountAccessSnapshot {
  return { status, ...values };
}

export function resolveCloudAccountAccess(
  account: CloudAccountAccessAccount,
  options: ResolveCloudAccountAccessOptions,
): CloudAccountAccessSnapshot {
  const connected = account.isLoggedIn;
  if (account.isLoading) {
    return snapshot('loading', {
      errorCode: 'ACCOUNT_LOADING',
      isIdentityConnected: connected,
      isOperational: false,
      canAttemptRenewal: false,
      message: 'Vérification du compte cloud en cours.',
    });
  }
  if (!connected || !account.userId?.trim()) {
    return snapshot('signed-out', {
      errorCode: 'ACCOUNT_SIGNED_OUT',
      isIdentityConnected: false,
      isOperational: false,
      canAttemptRenewal: false,
      message: 'Connecte ton compte pour utiliser les services cloud.',
      actionLabel: 'Se connecter',
    });
  }
  if (!options.isOnline) {
    return snapshot('offline', {
      errorCode: 'NETWORK_OFFLINE',
      isIdentityConnected: true,
      isOperational: false,
      canAttemptRenewal: false,
      message: 'Aucune connexion réseau. Tes données locales restent disponibles.',
      actionLabel: 'Réessayer',
    });
  }
  if (account.license?.status === 'expired') {
    return snapshot('license-expired', {
      errorCode: 'LICENSE_EXPIRED',
      isIdentityConnected: true,
      isOperational: false,
      canAttemptRenewal: false,
      message: 'L’accès cloud de ce compte a expiré.',
      actionLabel: 'Gérer le compte',
    });
  }
  if (account.license?.status === 'deactivated') {
    return snapshot('license-deactivated', {
      errorCode: 'LICENSE_DEACTIVATED',
      isIdentityConnected: true,
      isOperational: false,
      canAttemptRenewal: false,
      message: 'L’accès cloud de ce compte est désactivé.',
      actionLabel: 'Gérer le compte',
    });
  }

  const now = (options.now ?? new Date()).getTime();
  const renewalWindowMs =
    options.renewalWindowMs ?? DEFAULT_RENEWAL_WINDOW_MS;
  const accessTokenFresh =
    account.hasAccessToken === true &&
    expirationTime(account.accessTokenExpiresAt) > now + renewalWindowMs;

  if (accessTokenFresh) {
    return snapshot('ready', {
      isIdentityConnected: true,
      isOperational: true,
      canAttemptRenewal: false,
      message: 'Compte cloud opérationnel.',
    });
  }

  const refreshTokenUsable =
    account.hasRefreshToken === true &&
    expirationTime(account.refreshTokenExpiresAt) > now;
  if (refreshTokenUsable) {
    return snapshot('renewal-required', {
      isIdentityConnected: true,
      isOperational: false,
      canAttemptRenewal: true,
      message: 'Renouvellement sécurisé de la session cloud requis.',
    });
  }

  return snapshot('reauthentication-required', {
    errorCode: 'SESSION_EXPIRED',
    isIdentityConnected: true,
    isOperational: false,
    canAttemptRenewal: false,
    message: 'Ta session cloud a expiré. Reconnecte-toi pour continuer.',
    actionLabel: 'Se reconnecter',
  });
}

export class CloudAccountAccessError extends Error {
  readonly code: CloudAccountAccessErrorCode;

  constructor(code: CloudAccountAccessErrorCode, message: string) {
    super(message);
    this.name = 'CloudAccountAccessError';
    this.code = code;
  }
}

export function cloudAccountAccessError(
  access: CloudAccountAccessSnapshot,
): CloudAccountAccessError {
  return new CloudAccountAccessError(
    access.errorCode ?? 'CLOUD_UNAVAILABLE',
    access.message,
  );
}

export function cloudLicenseLabel(
  license: CloudAccountAccessAccount['license'],
): string {
  if (!license) return 'Accès cloud';
  if (license.type === 'eval' && license.status === 'expired') {
    return 'Évaluation terminée';
  }
  if (license.type === 'eval' && license.status === 'deactivated') {
    return 'Évaluation désactivée';
  }
  const typeLabel = {
    demo: 'Démonstration',
    eval: 'Évaluation',
    prod: 'Production',
    client: 'Client',
  }[license.type];
  const statusLabel = {
    ok: 'active',
    expired: 'expirée',
    deactivated: 'désactivée',
  }[license.status];
  const days =
    license.type === 'eval' && typeof license.evalDaysLeft === 'number'
      ? ` · ${Math.max(0, license.evalDaysLeft)} jour${license.evalDaysLeft > 1 ? 's' : ''} restant${license.evalDaysLeft > 1 ? 's' : ''}`
      : '';
  return `${typeLabel} ${statusLabel}${days}`;
}

export function cloudAccountStatusLabel(
  access: CloudAccountAccessSnapshot,
): string {
  switch (access.status) {
    case 'loading':
      return 'Connexion au cloud…';
    case 'signed-out':
      return 'Déconnecté';
    case 'offline':
      return 'Hors connexion';
    case 'license-expired':
    case 'license-deactivated':
      return 'Synchronisation suspendue';
    case 'renewal-required':
      return 'Renouvellement de la connexion…';
    case 'reauthentication-required':
      return 'Reconnexion requise';
    case 'ready':
      return 'Compte cloud opérationnel';
  }
}

export function mapCloudOperationError(
  error: unknown,
  access?: CloudAccountAccessSnapshot,
): CloudAccountAccessError {
  if (error instanceof CloudAccountAccessError) return error;
  if (access && access.status !== 'ready') return cloudAccountAccessError(access);

  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalized = rawMessage.toLowerCase();
  if (normalized.includes('license') && normalized.includes('deactiv')) {
    return new CloudAccountAccessError(
      'LICENSE_DEACTIVATED',
      'L’accès cloud de ce compte est désactivé.',
    );
  }
  if (normalized.includes('license') || normalized.includes('403')) {
    return new CloudAccountAccessError(
      'LICENSE_EXPIRED',
      'L’accès cloud de ce compte n’est pas autorisé. Vérifie l’état du compte.',
    );
  }
  if (
    normalized.includes('token') ||
    normalized.includes('401') ||
    normalized.includes('unauthorized')
  ) {
    return new CloudAccountAccessError(
      'SESSION_EXPIRED',
      'Ta session cloud a expiré. Reconnecte-toi pour continuer.',
    );
  }
  return new CloudAccountAccessError(
    'CLOUD_UNAVAILABLE',
    'Le service cloud est momentanément indisponible. Réessaie dans un instant.',
  );
}
