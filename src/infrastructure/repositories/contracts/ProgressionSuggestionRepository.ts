import type { EntityId, NewEntity } from '@/domain/models/common';
import type {
  ProgressionSuggestion,
  ProgressionSuggestionStatus,
} from '@/domain/models/strength';

export interface ProgressionSuggestionUpdate {
  suggestedLoadKg?: number;
  status?: ProgressionSuggestionStatus;
  decidedAt?: string | undefined;
  appliedAt?: string | undefined;
}

export interface ProgressionSuggestionRepository {
  getById(id: EntityId): Promise<ProgressionSuggestion | undefined>;
  listBySession(sessionId: EntityId): Promise<ProgressionSuggestion[]>;
  createMany(suggestions: Array<NewEntity<ProgressionSuggestion>>): Promise<ProgressionSuggestion[]>;
  update(id: EntityId, changes: ProgressionSuggestionUpdate): Promise<ProgressionSuggestion>;
}
