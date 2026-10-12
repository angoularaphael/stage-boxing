import { defineConfig } from 'astro/config';
import typoFr from './src/integrations/typo-fr.mjs';

export default defineConfig({
  site: 'https://stages.boxingcenter.fr',
  trailingSlash: 'never',
  // espaces insécables de la typographie française sur le HTML livré (texte seulement)
  integrations: [typoFr()],
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
