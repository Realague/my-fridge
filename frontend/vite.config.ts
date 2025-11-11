import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
