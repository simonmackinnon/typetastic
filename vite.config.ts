import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.COGNITO_USER_POOL_ID': JSON.stringify(process.env.COGNITO_USER_POOL_ID ?? ''),
    'process.env.COGNITO_CLIENT_ID':    JSON.stringify(process.env.COGNITO_CLIENT_ID ?? ''),
    'process.env.API_BASE_URL':         JSON.stringify(process.env.API_BASE_URL ?? ''),
    'process.env.COGNITO_DOMAIN':       JSON.stringify(process.env.COGNITO_DOMAIN ?? ''),
    // amazon-cognito-identity-js (via its Buffer polyfill) reads Node's `global`.
    // Vite <= 7's Rollup CommonJS handling rewrote it in builds, and TYP-11 shimmed
    // the dev server's esbuild pre-bundling. Vite 8 bundles with Rolldown, which
    // does neither, so the built app crashed with "global is not defined".
    // A top-level define covers both the build and the dev server.
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
