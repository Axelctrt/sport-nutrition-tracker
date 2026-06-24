import type { EntityChanges } from '@/domain/models/common';
import type { AppSettings } from '@/domain/models/settings';

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(changes: EntityChanges<AppSettings>): Promise<AppSettings>;
  reset(): Promise<AppSettings>;
}
