import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const portEnv = env.VITE_DEV_SERVER_PORT ?? env.VITE_PORT;
  const port = Number(portEnv ?? 8080);

  return {
    server: {
      host: "0.0.0.0",
      port,
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "my-fridge.multiplus.ovh"
      ],
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico'],
        manifest: {
          name: 'MyFridge',
          short_name: 'MyFridge',
          start_url: '.',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#000000',
          icons: [
            {
              src: 'favicon.ico',
              sizes: '192x192',
              type: 'image/ico'
            },
            {
              src: 'favicon.ico',
              sizes: '512x512',
              type: 'image/ico'
            }
          ]
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
