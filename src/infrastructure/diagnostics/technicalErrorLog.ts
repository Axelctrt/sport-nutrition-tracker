export interface TechnicalErrorRecord {
  recordedAt: string;
  category: 'react-error-boundary';
  errorName: string;
}

const STORAGE_KEY = 'sportpilot:last-technical-error';

export function recordTechnicalError(error: Error, recordedAt: string = new Date().toISOString()): void {
  try {
    const record: TechnicalErrorRecord = {
      recordedAt,
      category: 'react-error-boundary',
      errorName: error.name || 'Error',
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Le diagnostic ne doit jamais déclencher une nouvelle erreur applicative.
  }
}

export function readLastTechnicalError(): TechnicalErrorRecord | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<TechnicalErrorRecord>;
    if (
      typeof value.recordedAt !== 'string'
      || value.category !== 'react-error-boundary'
      || typeof value.errorName !== 'string'
    ) {
      return undefined;
    }
    return value as TechnicalErrorRecord;
  } catch {
    return undefined;
  }
}
