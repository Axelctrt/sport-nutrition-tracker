import { useContext } from 'react';
import { DatabaseContext } from '@/app/providers/database/DatabaseContext';

export function useDatabase() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase doit être utilisé dans DatabaseProvider.');
  }

  return context;
}
