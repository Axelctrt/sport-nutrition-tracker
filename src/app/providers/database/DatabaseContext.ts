import { createContext } from 'react';

export type DatabaseStatus = 'initializing' | 'ready' | 'error';

export interface DatabaseContextValue {
  status: DatabaseStatus;
  errorMessage?: string;
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);
