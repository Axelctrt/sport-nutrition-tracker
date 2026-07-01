import type {
  DXCAlert,
  DXCUserInteraction,
  SyncState,
  UserLogin,
} from 'dexie-cloud-addon';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import type { WeightEntry } from '@/domain/models/weight';
import { weightEntryIdForDate } from '@/domain/sync/deterministicEntityIds';
import {
  createSyncPrototypeDatabase,
  type SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
  type SyncPrototypeDiagnosticsSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { readSyncPrototypeConfig } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { isValidLocalDate } from '@/shared/validation/localDate';
import {
  previewRealWeightSync,
  synchronizeRealWeights,
  type RealWeightSyncPreview,
  type RealWeightSyncResult,
} from '@/infrastructure/sync-prototype/realWeightSyncService';
import {
  previewRealActivitySync,
  synchronizeRealActivities,
  type RealActivitySyncPreview,
  type RealActivitySyncResult,
} from '@/infrastructure/sync-prototype/realActivitySyncService';

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

export interface SyncPrototypeWeightSnapshot {
  readonly weights: readonly WeightEntry[];
  readonly deletedCount: number;
  readonly isLoading: boolean;
  readonly errorMessage?: string;
}

export interface SyncPrototypeWeightDraft {
  readonly date: LocalDate;
  readonly weightKg: number;
  readonly note?: string;
}

export interface SyncPrototypeRealWeightSnapshot {
  readonly enabled: boolean;
  readonly status: 'disabled' | 'idle' | 'analyzing' | 'ready' | 'syncing' | 'error';
  readonly preview?: RealWeightSyncPreview;
  readonly lastResult?: RealWeightSyncResult;
  readonly errorMessage?: string;
}

export interface SyncPrototypeRealActivitySnapshot {
  readonly enabled: boolean;
  readonly status:
    | 'disabled'
    | 'idle'
    | 'analyzing'
    | 'ready'
    | 'syncing'
    | 'error';
  readonly preview?: RealActivitySyncPreview;
  readonly lastResult?: RealActivitySyncResult;
  readonly errorMessage?: string;
}

export interface SyncPrototypeSnapshot {
  readonly account: SyncPrototypeAccountSnapshot;
  readonly sync: SyncPrototypeSyncSnapshot;
  readonly weights: SyncPrototypeWeightSnapshot;
  readonly realWeights?: SyncPrototypeRealWeightSnapshot;
  readonly realActivities?: SyncPrototypeRealActivitySnapshot;
  readonly diagnostics: SyncPrototypeDiagnosticsSnapshot;
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
  analyzeRealWeights(): Promise<RealWeightSyncPreview>;
  syncRealWeights(): Promise<RealWeightSyncResult>;
  analyzeRealActivities?(): Promise<RealActivitySyncPreview>;
  syncRealActivities?(): Promise<RealActivitySyncResult>;
  saveWeight(draft: SyncPrototypeWeightDraft): Promise<WeightEntry>;
  deleteWeight(weightId: EntityId): Promise<void>;
}

type CloudOwned<T> = T & {
  readonly owner?: string;
  readonly realmId?: string;
};

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

function emptyWeightSnapshot(
  isLoading = false,
): SyncPrototypeWeightSnapshot {
  return {
    weights: [],
    deletedCount: 0,
    isLoading,
  };
}

function belongsToCurrentUser(
  entity: CloudOwned<object>,
  currentUserId: string,
): boolean {
  return !entity.owner || entity.owner === currentUserId;
}

function validateWeightDraft(
  draft: SyncPrototypeWeightDraft,
): SyncPrototypeWeightDraft {
  if (!isValidLocalDate(draft.date)) {
    throw new Error('La date de pesée est invalide.');
  }

  if (
    !Number.isFinite(draft.weightKg) ||
    draft.weightKg < 30 ||
    draft.weightKg > 350
  ) {
    throw new Error('Le poids doit être compris entre 30 et 350 kg.');
  }

  const note = draft.note?.trim();
  if (note && note.length > 500) {
    throw new Error('La note ne doit pas dépasser 500 caractères.');
  }

  return {
    date: draft.date,
    weightKg: Math.round(draft.weightKg * 10) / 10,
    ...(note ? { note } : {}),
  };
}

export interface SyncPrototypeClientOptions {
  readonly realWeightSyncEnabled?: boolean;
  readonly realActivitySyncEnabled?: boolean;
  readonly localDatabase?: AppDatabase;
}

class DefaultSyncPrototypeClient implements SyncPrototypeClient {
  private snapshot: SyncPrototypeSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly database: SyncPrototypeDatabase;
  private initializationPromise: Promise<void> | undefined;
  private currentInteraction: DXCUserInteraction | undefined;
  private weightRefreshSequence = 0;
  private readonly realWeightSyncEnabled: boolean;
  private readonly realActivitySyncEnabled: boolean;
  private readonly localDatabase: AppDatabase;

  constructor(
    database: SyncPrototypeDatabase,
    options: SyncPrototypeClientOptions = {},
  ) {
    this.database = database;
    this.realWeightSyncEnabled = options.realWeightSyncEnabled === true;
    this.realActivitySyncEnabled =
      options.realActivitySyncEnabled === true;
    this.localDatabase = options.localDatabase ?? appDatabase;
    this.currentInteraction = database.cloud.userInteraction.value;
    const account = sanitizeAccount(database.cloud.currentUser.value);
    this.snapshot = {
      account,
      sync: sanitizeSyncState(database.cloud.syncState.value),
      weights: emptyWeightSnapshot(true),
      ...(this.realWeightSyncEnabled
        ? { realWeights: { enabled: true, status: 'idle' as const } }
        : {}),
      ...(this.realActivitySyncEnabled
        ? { realActivities: { enabled: true, status: 'idle' as const } }
        : {}),
      diagnostics: createEmptySyncPrototypeDiagnostics(
        account.userId ?? account.email,
      ),
      ...(this.currentInteraction
        ? { interaction: sanitizeInteraction(this.currentInteraction)! }
        : {}),
    };

    database.cloud.currentUser.subscribe((user) => {
      const account = sanitizeAccount(user);
      const accountId = account.userId ?? account.email;
      const accountFingerprint =
        createSyncPrototypeAccountFingerprint(accountId);
      const accountChanged =
        accountFingerprint !==
        this.snapshot.diagnostics.accountFingerprint;
      this.snapshot = {
        ...this.snapshot,
        account,
        ...(!user.isLoggedIn
          ? {
              weights: emptyWeightSnapshot(false),
              diagnostics: createEmptySyncPrototypeDiagnostics(),
            }
          : {
              diagnostics: accountChanged
                ? createEmptySyncPrototypeDiagnostics(accountId)
                : this.snapshot.diagnostics,
            }),
      };
      this.notify();

      if (user.isLoggedIn && this.initializationPromise) {
        void this.initializationPromise.then(() => this.refreshWeights());
      }
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

    database.cloud.events?.syncComplete.subscribe(() => {
      this.snapshot = {
        ...this.snapshot,
        diagnostics: {
          ...this.snapshot.diagnostics,
          lastSyncCompletedAt: new Date().toISOString(),
        },
      };
      this.notify();
      void this.refreshWeights();
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
        .then(async () => {
          await this.refreshWeights();
        })
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
    await this.refreshWeights();
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
    this.snapshot = {
      ...this.snapshot,
      weights: emptyWeightSnapshot(false),
      ...(this.realWeightSyncEnabled
        ? { realWeights: { enabled: true, status: 'idle' as const } }
        : {}),
      ...(this.realActivitySyncEnabled
        ? { realActivities: { enabled: true, status: 'idle' as const } }
        : {}),
      diagnostics: createEmptySyncPrototypeDiagnostics(),
    };
    this.notify();
  }

  async syncNow(): Promise<void> {
    await this.initialize();
    await this.database.cloud.sync();
    await this.refreshWeights();
  }

  async analyzeRealWeights(): Promise<RealWeightSyncPreview> {
    await this.initialize();
    this.assertRealWeightSyncAvailable();
    this.snapshot = {
      ...this.snapshot,
      realWeights: {
        enabled: true,
        status: 'analyzing',
      },
    };
    this.notify();

    try {
      await this.database.cloud.sync();
      const preview = await previewRealWeightSync(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      this.snapshot = {
        ...this.snapshot,
        realWeights: { enabled: true, status: 'ready', preview },
      };
      this.notify();
      return preview;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'L’analyse des vraies pesées a échoué.';
      this.snapshot = {
        ...this.snapshot,
        realWeights: { enabled: true, status: 'error', errorMessage },
      };
      this.notify();
      throw error;
    }
  }

  async syncRealWeights(): Promise<RealWeightSyncResult> {
    await this.initialize();
    this.assertRealWeightSyncAvailable();
    this.snapshot = {
      ...this.snapshot,
      realWeights: {
        ...(this.snapshot.realWeights ?? {}),
        enabled: true,
        status: 'syncing',
      },
    };
    this.notify();

    try {
      await this.database.cloud.sync();
      const result = await synchronizeRealWeights(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      await this.database.cloud.sync();
      const preview = await previewRealWeightSync(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      this.snapshot = {
        ...this.snapshot,
        realWeights: {
          enabled: true,
          status: 'ready',
          preview,
          lastResult: result,
        },
      };
      this.notify();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'La synchronisation des vraies pesées a échoué.';
      this.snapshot = {
        ...this.snapshot,
        realWeights: { enabled: true, status: 'error', errorMessage },
      };
      this.notify();
      throw error;
    }
  }

  async analyzeRealActivities(): Promise<RealActivitySyncPreview> {
    await this.initialize();
    this.assertRealActivitySyncAvailable();
    this.snapshot = {
      ...this.snapshot,
      realActivities: {
        enabled: true,
        status: 'analyzing',
      },
    };
    this.notify();

    try {
      await this.database.cloud.sync();
      const preview = await previewRealActivitySync(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      this.snapshot = {
        ...this.snapshot,
        realActivities: { enabled: true, status: 'ready', preview },
      };
      this.notify();
      return preview;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'L’analyse des activités a échoué.';
      this.snapshot = {
        ...this.snapshot,
        realActivities: { enabled: true, status: 'error', errorMessage },
      };
      this.notify();
      throw error;
    }
  }

  async syncRealActivities(): Promise<RealActivitySyncResult> {
    await this.initialize();
    this.assertRealActivitySyncAvailable();
    this.snapshot = {
      ...this.snapshot,
      realActivities: {
        ...(this.snapshot.realActivities ?? {}),
        enabled: true,
        status: 'syncing',
      },
    };
    this.notify();

    try {
      await this.database.cloud.sync();
      const result = await synchronizeRealActivities(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      await this.database.cloud.sync();
      const preview = await previewRealActivitySync(
        this.localDatabase,
        this.database,
        this.database.cloud.currentUserId,
      );
      this.snapshot = {
        ...this.snapshot,
        realActivities: {
          enabled: true,
          status: 'ready',
          preview,
          lastResult: result,
        },
      };
      this.notify();
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'La synchronisation des activités a échoué.';
      this.snapshot = {
        ...this.snapshot,
        realActivities: { enabled: true, status: 'error', errorMessage },
      };
      this.notify();
      throw error;
    }
  }

  async saveWeight(
    rawDraft: SyncPrototypeWeightDraft,
  ): Promise<WeightEntry> {
    await this.initialize();
    this.assertLoggedIn();

    const draft = validateWeightDraft(rawDraft);
    const id = weightEntryIdForDate(draft.date);
    const occurredAt = new Date().toISOString();
    const target = { entityType: 'weight' as const, entityId: id };

    const saved = await this.database.transaction(
      'rw',
      this.database.weights,
      this.database.deletionRecords,
      async () => {
        const current = await this.database.weights.get(id);
        const markerId = deletionRecordId('weight', id);
        const currentMarker =
          await this.database.deletionRecords.get(markerId);

        let entry: WeightEntry;
        if (current) {
          const normalizedNote = draft.note ?? '';
          const currentNote = current.note ?? '';
          const changes: Partial<WeightEntry> = {
            updatedAt: occurredAt,
          };

          if (current.weightKg !== draft.weightKg) {
            changes.weightKg = draft.weightKg;
          }
          if (currentNote !== normalizedNote) {
            changes.note = normalizedNote;
          }

          entry = {
            ...current,
            weightKg: draft.weightKg,
            note: normalizedNote,
            updatedAt: occurredAt,
          };
          await this.database.weights.update(id, changes);
        } else {
          entry = {
            id,
            date: draft.date,
            weightKg: draft.weightKg,
            ...(draft.note ? { note: draft.note } : {}),
            createdAt: occurredAt,
            updatedAt: occurredAt,
          };
          await this.database.weights.add(entry);
        }

        if (currentMarker?.status === 'deleted') {
          await this.database.deletionRecords.put(
            createRestoredDeletionRecord(
              target,
              occurredAt,
              currentMarker.deletedAt,
              currentMarker,
            ),
          );
        }

        return entry;
      },
    );

    await this.refreshWeights();
    return saved;
  }

  async deleteWeight(weightId: EntityId): Promise<void> {
    await this.initialize();
    this.assertLoggedIn();

    const occurredAt = new Date().toISOString();

    await this.database.transaction(
      'rw',
      this.database.weights,
      this.database.deletionRecords,
      async () => {
        const current = await this.database.weights.get(weightId);
        if (!current) return;

        const target = {
          entityType: 'weight' as const,
          entityId: current.id,
        };
        const markerId = deletionRecordId('weight', current.id);
        const currentMarker =
          await this.database.deletionRecords.get(markerId);

        await this.database.deletionRecords.put(
          createDeletedDeletionRecord(
            target,
            occurredAt,
            currentMarker,
          ),
        );
        await this.database.weights.delete(current.id);
      },
    );

    await this.refreshWeights();
  }

  private assertRealActivitySyncAvailable(): void {
    if (!this.realActivitySyncEnabled) {
      throw new Error(
        'La synchronisation des activités est désactivée par configuration.',
      );
    }
    this.assertLoggedIn();
  }

  private assertRealWeightSyncAvailable(): void {
    if (!this.realWeightSyncEnabled) {
      throw new Error(
        'La synchronisation des vraies pesées est désactivée par configuration.',
      );
    }
    this.assertLoggedIn();
  }

  private assertLoggedIn(): void {
    if (!this.database.cloud.currentUser.value.isLoggedIn) {
      throw new Error(
        'Connecte le compte de test avant de modifier les pesées fictives.',
      );
    }
  }

  private async refreshWeights(): Promise<void> {
    const sequence = ++this.weightRefreshSequence;

    if (!this.database.cloud.currentUser.value.isLoggedIn) {
      this.snapshot = {
        ...this.snapshot,
        weights: emptyWeightSnapshot(false),
        diagnostics: createEmptySyncPrototypeDiagnostics(),
      };
      this.notify();
      return;
    }

    const {
      errorMessage: _previousWeightError,
      ...weightSnapshotWithoutError
    } = this.snapshot.weights;
    this.snapshot = {
      ...this.snapshot,
      weights: {
        ...weightSnapshotWithoutError,
        isLoading: true,
      },
    };
    this.notify();

    try {
      const [allWeights, allMarkers] = await Promise.all([
        this.database.weights.toArray(),
        this.database.deletionRecords.toArray(),
      ]);
      if (sequence !== this.weightRefreshSequence) return;

      const currentUserId = this.database.cloud.currentUserId;
      const weights = allWeights.filter((entry) =>
        belongsToCurrentUser(entry, currentUserId),
      );
      const markers = allMarkers.filter(
        (marker) =>
          marker.entityType === 'weight' &&
          belongsToCurrentUser(marker, currentUserId),
      );
      const deletedIds = new Set(
        markers
          .filter((marker) => marker.status === 'deleted')
          .map((marker) => marker.entityId),
      );
      const visibleWeights = weights
        .filter((entry) => !deletedIds.has(entry.id))
        .sort((left, right) => right.date.localeCompare(left.date));
      const latestWeightUpdatedAt = visibleWeights
        .map((entry) => entry.updatedAt)
        .sort((left, right) => right.localeCompare(left))[0];
      const {
        latestWeightUpdatedAt: _previousLatestWeightUpdatedAt,
        ...diagnosticsWithoutLatestWeight
      } = this.snapshot.diagnostics;
      const accountFingerprint =
        createSyncPrototypeAccountFingerprint(currentUserId);

      this.snapshot = {
        ...this.snapshot,
        weights: {
          weights: visibleWeights,
          deletedCount: deletedIds.size,
          isLoading: false,
        },
        diagnostics: {
          ...diagnosticsWithoutLatestWeight,
          ...(accountFingerprint ? { accountFingerprint } : {}),
          visibleWeightCount: visibleWeights.length,
          deletedWeightCount: deletedIds.size,
          lastRefreshAt: new Date().toISOString(),
          ...(latestWeightUpdatedAt ? { latestWeightUpdatedAt } : {}),
        },
      };
      this.notify();
    } catch (error) {
      if (sequence !== this.weightRefreshSequence) return;
      this.snapshot = {
        ...this.snapshot,
        weights: {
          ...this.snapshot.weights,
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Les pesées fictives n’ont pas pu être chargées.',
        },
      };
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export function createSyncPrototypeClient(
  database: SyncPrototypeDatabase,
  options: SyncPrototypeClientOptions = {},
): SyncPrototypeClient {
  return new DefaultSyncPrototypeClient(database, options);
}

let singletonDatabase: SyncPrototypeDatabase | undefined;
let singletonClient: SyncPrototypeClient | undefined;

export function getSyncPrototypeClient(): SyncPrototypeClient {
  if (singletonClient) return singletonClient;

  const config = readSyncPrototypeConfig();
  if (!config.enabled) {
    throw new Error('Le prototype de synchronisation est désactivé.');
  }
  singletonDatabase = createSyncPrototypeDatabase(config);
  singletonClient = createSyncPrototypeClient(singletonDatabase, {
    realWeightSyncEnabled: config.realWeightSyncEnabled,
    realActivitySyncEnabled: config.realActivitySyncEnabled,
    localDatabase: appDatabase,
  });
  return singletonClient;
}
