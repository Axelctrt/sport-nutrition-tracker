import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { cleanupLocalDevelopmentPwa } from '@/pwa/cleanupLocalDevelopmentPwa';
import '@/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.");
}

const appRootElement = rootElement;

async function bootstrap(): Promise<void> {
  try {
    const reloadScheduled = await cleanupLocalDevelopmentPwa();
    if (reloadScheduled) return;
  } catch (error) {
    console.warn('Le nettoyage du service worker local a échoué.', error);
  }

  createRoot(appRootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
