import { defineConfig } from 'vite';

// Görseller assets/, veriler data/ altından; Vite bunları URL olarak paketler.
export default defineConfig({
  base: './',
  server: { host: true },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
});
