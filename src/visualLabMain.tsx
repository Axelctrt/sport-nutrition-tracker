import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { VisualLabPage } from '@/features/development/pages/VisualLabPage';
import '@/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.");
}

createRoot(rootElement).render(
  <StrictMode>
    <VisualLabPage />
  </StrictMode>,
);
