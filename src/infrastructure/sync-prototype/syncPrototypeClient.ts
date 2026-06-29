import type {
  DXCAlert,
  DXCUserInteraction,
  SyncState,
  UserLogin,
} from 'dexie-cloud-addon';
import {
  createSyncPrototypeDatabase,
  type SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { readSyncPrototypeConfig } from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export interface SyncPrototypeAccountSnapshot {
  readonly isLoggedIn: boolean;
  readonly isLoading: boolean;
  readonly email?: string;
  readonly userId?: string;
  readonly displayName?: string;
  readonly license?: {
    readonly type: 'demo' | 'eval' | 'prod' | 'client';
    readonly status: 'ok' | 'expired' | 'deactivated';
    readonly evalDaysLeft?: number;
  };
}

export interface SyncPrototypeSyncSnapshot {
  readonly status:
    | 'not-started'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error'
    | 'offline';
  readonly phase:
    | 'initial'
    | 'not-in-sync'
    | 'pushing'
    | 'pulling'
    | 'in-sync'
    | 'error'
    | 'offline';
  readonly progress?: number;
  readonly errorMessage?: string;
  readonly license?: 'ok' | 'expired' | 'deactivated';
}

export interface SyncPrototypeInteractionAlert {
  readonly type: DXCAlert['type'];
  readonly messageCode: DXCAlert['messageCode'];
  readonly message: string;
  readonly messageParams: Readonly<Record<string, string>>;
}

export interface SyncPrototypeInteractionSnapshot {
  readonly type: DXCUserInteraction['type'];
  readonly title: string;
  readonly alerts: readonly SyncPrototypeInteractionAlert[];
  readonly submitLabel: string;
  readonly cancelLabel: string | null;
}

export interface SyncPrototypeSnapshot {
  readonly account: SyncPrototypeAccountSnapshot;
  readonly sync: SyncPrototypeSyncSnapshot;
  readonly interaction?: SyncPrototypeInteractionSnapshot;
}

export interface SyncPrototypeClient {
  getSnapshot(): SyncPrototypeSnapshot;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  login(email: string): Promise<void>;
  submitInteraction(params: Readonly<Record<string, string>>): void;
  cancelInteraction(): void;
  logout(): Promise<void>;
  syncNow(): Promise<void>;
}

interface SubscriptionLike {
  unsubscribe(): void;
}

interface ObservableValue<T> {
  readonly value: T;
  subscribe(listener: (value: T) => void): SubscriptionLike;
}

interface SyncPrototypeCloudLike {
  readonly currentUser: ObservableValue<UserLogin>;
  readonly syncState: ObservableValue<SyncState>;
  readonly userInteraction: ObservableValue<DXCUserInteraction | undefined>;
  login(hints: { grant_type: 'otp'; email: string }): Promise<void>;
  logout(): Promise<void>;
  sync(): Promise<void>;
}

interface SyncPrototypeDatabaseLike {
  readonly cloud: SyncPrototypeCloudLike;
  open(): Promise<unknown>;
}

function sanitizeAccount(user: UserLogin): SyncPrototypeAccountSnapshot {
  return {
    isLoggedIn: user.isLoggedIn === true,
    isLoading: user.isLoading === true,
    ...(user.email ? { email: user.email } : {}),
    ...(user.userId ? { userId: user.userId } : {}),
    ...(user.name ? { displayName: user.name } : {}),
    ...(user.license
      ? {
          license: {
            type: user.license.type,
            status: user.license.status,
            ...(typeof user.license.evalDaysLeft === 'number'
              ? { evalDaysLeft: user.license.evalDaysLeft }
              : {}),
          },
        }
      : {}),
  };
}

function sanitizeSyncState(state: SyncState): SyncPrototypeSyncSnapshot {
  return {
    status: state.status,
    phase: state.phase,
    ...(typeof state.progress === 'number'
      ? { progress: state.progress }
      : {}),
    ...(state.error ? { errorMessage: state.error.message } : {}),
    ...(state.license ? { license: state.license } : {}),
  };
}

function sanitizeInteraction(
  interaction: DXCUserInteraction | undefined,
): SyncPrototypeInteractionSnapshot | undefined {
  if (!interaction) return undefined;

  return {
    type: interaction.type,
    title: interaction.title,
    alerts: interaction.alerts.map((alert) => ({
      type: alert.type,
      messageCode: alert.messageCode,
      message: alert.message,
      messageParams: { ...alert.messageParams },
    })),
    submitLabel: interaction.submitLabel,
    cancelLabel: interaction.cancelLabel ?? null,
  };
}

class DefaultSyncPrototypeClient implements SyncPrototypeClient {
  private snapshot: SyncPrototypeSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly database: SyncPrototypeDatabaseLike;
  private initializationPromise: Promise<void> | undefined;
  private currentInteraction: DXCUserInteraction | undefined;

  constructor(database: SyncPrototypeDatabaseLike) {
    this.database = database;
    this.currentInteraction = database.cloud.userInteraction.value;
    this.snapshot = {
      account: sanitizeAccount(database.cloud.currentUser.value),
      sync: sanitizeSyncState(database.cloud.syncState.value),
      ...(this.currentInteraction
        ? { interaction: sanitizeInteraction(this.currentInteraction)! }
        : {}),
    };

    database.cloud.currentUser.subscribe((user) => {
      this.snapshot = {
        ...this.snapshot,
        account: sanitizeAccount(user),
      };
      this.notify();
    });

    database.cloud.syncState.subscribe((syncState) => {
      this.snapshot = {
        ...this.snapshot,
        sync: sanitizeSyncState(syncState),
      };
      this.notify();
    });

    database.cloud.userInteraction.subscribe((interaction) => {
      this.currentInteraction = interaction;
      const sanitized = sanitizeInteraction(interaction);
      const { interaction: _previousInteraction, ...snapshot } = this.snapshot;
      this.snapshot = sanitized
        ? { ...snapshot, interaction: sanitized }
        : snapshot;
      this.notify();
    });
  }

  getSnapshot = (): SyncPrototypeSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.database
        .open()
        .then(() => undefined)
        .catch((error: unknown) => {
          this.initializationPromise = undefined;
          throw error;
        });
    }

    return this.initializationPromise;
  }

  async login(email: string): Promise<void> {
    await this.initialize();

    if (this.database.cloud.currentUser.value.isLoggedIn) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error('Une adresse email est requise.');
    }

    await this.database.cloud.login({
      grant_type: 'otp',
      email: normalizedEmail,
    });
  }

  submitInteraction(params: Readonly<Record<string, string>>): void {
    if (!this.currentInteraction) {
      throw new Error('Aucune interaction Dexie Cloud n’est active.');
    }

    this.currentInteraction.onSubmit({ ...params });
  }

  cancelInteraction(): void {
    this.currentInteraction?.onCancel();
  }

  async logout(): Promise<void> {
    await this.initialize();
    await this.database.cloud.logout();
  }

  async syncNow(): Promise<void> {
    await this.initialize();
    await this.database.cloud.sync();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export function createSyncPrototypeClient(
  database: SyncPrototypeDatabaseLike,
): SyncPrototypeClient {
  return new DefaultSyncPrototypeClient(database);
}

let singletonDatabase: SyncPrototypeDatabase | undefined;
let singletonClient: SyncPrototypeClient | undefined;

export function getSyncPrototypeClient(): SyncPrototypeClient {
  if (singletonClient) return singletonClient;

  const config = readSyncPrototypeConfig();
  singletonDatabase = createSyncPrototypeDatabase(config);
  singletonClient = createSyncPrototypeClient(singletonDatabase);
  return singletonClient;
}
