import type {
  SyncPrototypeInteractionSnapshot,
  SyncPrototypeSyncSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { toLocalDate } from '@/shared/utils/dates';

export type ActionStatus =
  | 'idle'
  | 'email'
  | 'otp'
  | 'logout'
  | 'sync'
  | 'weight-save'
  | 'weight-delete'
  | 'real-weight-analyze'
  | 'real-weight-sync';

export interface WeightDraftState {
  date: string;
  weightKg: string;
  note: string;
}

export function createEmptyWeightDraft(): WeightDraftState {
  return {
    date: toLocalDate(),
    weightKg: '',
    note: '',
  };
}

export const inputClasses =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const syncStatusLabels: Record<
  SyncPrototypeSyncSnapshot['status'],
  string
> = {
  'not-started': 'Synchronisation nécessaire',
  connecting: 'Synchronisation en cours',
  connected: 'Cloud connecté',
  disconnected: 'Synchronisation nécessaire',
  error: 'Erreur de synchronisation',
  offline: 'Hors ligne — enregistré localement',
};

export const syncPhaseLabels: Record<
  SyncPrototypeSyncSnapshot['phase'],
  string
> = {
  initial: 'Enregistré sur cet appareil',
  'not-in-sync': 'Synchronisation nécessaire',
  pushing: 'Synchronisation en cours',
  pulling: 'Synchronisation en cours',
  'in-sync': 'Synchronisé',
  error: 'Erreur de synchronisation',
  offline: 'Hors ligne — enregistré localement',
};

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

export function interactionError(
  interaction: SyncPrototypeInteractionSnapshot | undefined,
): string | undefined {
  const alert = interaction?.alerts.find((item) => item.type === 'error');
  if (!alert) return undefined;

  switch (alert.messageCode) {
    case 'INVALID_EMAIL':
      return 'Cette adresse email n’est pas valide.';
    case 'INVALID_OTP':
      return 'Le code saisi est incorrect ou a expiré.';
    case 'LICENSE_LIMIT_REACHED':
      return 'La limite de comptes autorisés pour ce service est atteinte.';
    default:
      return alert.message || 'Dexie Cloud a refusé cette opération.';
  }
}

export function interactionMessage(
  interaction: SyncPrototypeInteractionSnapshot,
): string {
  return (
    interaction.alerts.map((alert) => alert.message).filter(Boolean).join(' ') ||
    'Dexie Cloud demande une confirmation.'
  );
}

export function formatDiagnosticDate(value: string | undefined): string {
  if (!value) return 'Jamais';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
