import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Read the repo-root .env, the same file the server uses.
  const env = loadEnv(mode, '..', '');
  // PORT is deliberately ignored: dev tools often set it for this Vite server, not the API.
  const serverUrl = `http://localhost:${env.API_PORT || 3001}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // host: true lets phones on the same Wi-Fi open the dev server.
      host: true,
      // Same origin as in production: the browser only talks to Vite, which forwards these to the server.
      proxy: {
        '/api': serverUrl,
        '/socket.io': { target: serverUrl, ws: true },
      },
    },
  };
});
