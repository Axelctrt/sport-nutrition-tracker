/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />


declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ENABLE_SYNC_PROTOTYPE?: 'true' | 'false';
  readonly VITE_DEXIE_CLOUD_DATABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
