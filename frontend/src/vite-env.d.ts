/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_ENV_BANNER?: string;
  readonly VITE_DEPLOY_BRANCH?: string;
  readonly VITE_DEPLOY_COMMIT?: string;
  readonly VITE_BUILD_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: Element, config: any) => void;
          prompt: (notification?: (data: any) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export {};
