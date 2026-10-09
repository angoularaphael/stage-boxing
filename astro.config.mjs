import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://stages.boxingcenter.fr',
  trailingSlash: 'never',
  server: {
    port: 5620,
    host: '127.0.0.1',
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5621',
          changeOrigin: true,
        },
      },
    },
  },
});
