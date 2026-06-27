import { RouterProvider } from 'react-router-dom';

import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { PwaUpdatePrompt } from '@/pwa/PwaUpdatePrompt';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </AppProviders>
  );
}
