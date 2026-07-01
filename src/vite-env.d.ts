/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />


declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ENABLE_SYNC_PROTOTYPE?: 'true' | 'false';
  readonly VITE_DEXIE_CLOUD_DATABASE_URL?: string;
  readonly VITE_ENABLE_REAL_WEIGHT_SYNC?: 'true' | 'false';
  readonly VITE_ENABLE_REAL_ACTIVITY_SYNC?: 'true' | 'false';
  readonly VITE_ENABLE_REAL_GOAL_SYNC?: 'true' | 'false';
  readonly VITE_ENABLE_REAL_STRENGTH_SYNC?: 'true' | 'false';
  readonly VITE_ENABLE_SYNC_DIAGNOSTICS?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
