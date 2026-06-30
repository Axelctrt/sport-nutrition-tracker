import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { loadBackupSettings } from '@/application/backup/backupApplicationService';
import { routePaths } from '@/app/routePaths';
import {
  getBackupReminderStatus,
  type BackupReminderStatus,
} from '@/domain/backup/backupReminder';
import type { AppSettings } from '@/domain/models/settings';
import { useToast } from '@/shared/toast/useToast';

export const BACKUP_REMINDER_SNOOZE_STORAGE_KEY =
  'sportpilot.backupReminder.snooze';
export const BACKUP_REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1_000;

export interface BackupReminderStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface StoredBackupReminderSnooze {
  referenceDate: string;
  snoozedUntil: string;
}

interface BackupReminderCoordinatorProps {
  loadSettings?: () => Promise<AppSettings>;
  now?: () => Date;
  storage?: BackupReminderStorage;
}

const systemNow = () => new Date();

function resolveBrowserStorage(): BackupReminderStorage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function parseStoredSnooze(
  raw: string | null,
): StoredBackupReminderSnooze | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredBackupReminderSnooze>;

    if (
      typeof parsed.referenceDate !== 'string' ||
      typeof parsed.snoozedUntil !== 'string'
    ) {
      return undefined;
    }

    return {
      referenceDate: parsed.referenceDate,
      snoozedUntil: parsed.snoozedUntil,
    };
  } catch {
    return undefined;
  }
}

function isBackupReminderSnoozed(
  status: BackupReminderStatus,
  now: Date,
  storage: BackupReminderStorage | undefined,
): boolean {
  if (!storage) return false;

  try {
    const stored = parseStoredSnooze(
      storage.getItem(BACKUP_REMINDER_SNOOZE_STORAGE_KEY),
    );

    if (!stored || stored.referenceDate !== status.referenceDate) {
      return false;
    }

    const snoozedUntil = new Date(stored.snoozedUntil);
    return (
      !Number.isNaN(snoozedUntil.getTime()) &&
      snoozedUntil.getTime() > now.getTime()
    );
  } catch {
    return false;
  }
}

function snoozeBackupReminder(
  status: BackupReminderStatus,
  now: Date,
  storage: BackupReminderStorage | undefined,
): void {
  if (!storage) return;

  try {
    storage.setItem(
      BACKUP_REMINDER_SNOOZE_STORAGE_KEY,
      JSON.stringify({
        referenceDate: status.referenceDate,
        snoozedUntil: new Date(
          now.getTime() + BACKUP_REMINDER_SNOOZE_MS,
        ).toISOString(),
      } satisfies StoredBackupReminderSnooze),
    );
  } catch {
    // Le rappel reste secondaire si le stockage navigateur est indisponible.
  }
}

function reminderDescription(
  settings: AppSettings,
  status: BackupReminderStatus,
): string {
  if (!settings.lastBackupExportedAt) {
    return 'Aucune sauvegarde complète n’a encore été créée sur cet appareil.';
  }

  return `${status.daysSinceReference} jours se sont écoulés depuis la dernière sauvegarde.`;
}

export function BackupReminderCoordinator({
  loadSettings = loadBackupSettings,
  now = systemNow,
  storage,
}: BackupReminderCoordinatorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (
      shownRef.current ||
      location.pathname === routePaths.backup
    ) {
      return;
    }

    let active = true;

    const checkReminder = async () => {
      try {
        const settings = await loadSettings();
        if (!active || shownRef.current) return;

        const currentDate = now();
        const status = getBackupReminderStatus(
          settings,
          currentDate,
        );
        const effectiveStorage =
          storage ?? resolveBrowserStorage();

        if (
          !status.due ||
          isBackupReminderSnoozed(
            status,
            currentDate,
            effectiveStorage,
          )
        ) {
          return;
        }

        shownRef.current = true;
        snoozeBackupReminder(
          status,
          currentDate,
          effectiveStorage,
        );

        toast.showToast({
          title: 'Sauvegarde recommandée',
          description: reminderDescription(settings, status),
          tone: 'info',
          durationMs: 12_000,
          dedupeKey: `backup-reminder:${status.referenceDate}`,
          action: {
            label: 'Sauvegarder',
            ariaLabel: 'Ouvrir la page de sauvegarde',
            onClick: () => navigate(routePaths.backup),
          },
        });
      } catch {
        // Le rappel ne doit jamais bloquer l’utilisation de l’application.
      }
    };

    void checkReminder();

    return () => {
      active = false;
    };
  }, [
    loadSettings,
    location.pathname,
    navigate,
    now,
    storage,
    toast,
  ]);

  return null;
}
