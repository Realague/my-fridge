/// <reference types="vite/client" />

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
