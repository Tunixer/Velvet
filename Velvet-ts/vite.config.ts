import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  publicDir: 'public',
  build: {
    target: 'es2020',
    polyfillModulePreload: false,
  },
});
