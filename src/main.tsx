import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { cleanupLocalDevelopmentPwa } from '@/pwa/cleanupLocalDevelopmentPwa';
import { installPreloadErrorRecovery, schedulePreloadRecoveryReset } from '@/pwa/preloadErrorRecovery';
import { AppSplashScreen } from '@/shared/ui/AppSplashScreen';
import '@/styles/index.css';

installPreloadErrorRecovery();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.");
}

const appRoot = createRoot(rootElement);

async function bootstrap(): Promise<void> {
  appRoot.render(
    <StrictMode>
      <AppSplashScreen />
    </StrictMode>,
  );

  try {
    const reloadScheduled = await cleanupLocalDevelopmentPwa();
    if (reloadScheduled) return;
  } catch (error) {
    console.warn('Le nettoyage du service worker local a échoué.', error);
  }

  appRoot.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  schedulePreloadRecoveryReset();
}

void bootstrap();
