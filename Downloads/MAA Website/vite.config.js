import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    proxy: {
      '/api-cas': {
        target: 'https://cas.anteraja.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-cas/, '')
      },
      '/api-main': {
        target: 'https://api.anteraja.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-main/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
});
