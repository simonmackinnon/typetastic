import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.COGNITO_USER_POOL_ID': JSON.stringify(process.env.COGNITO_USER_POOL_ID ?? ''),
    'process.env.COGNITO_CLIENT_ID':    JSON.stringify(process.env.COGNITO_CLIENT_ID ?? ''),
    'process.env.API_BASE_URL':         JSON.stringify(process.env.API_BASE_URL ?? ''),
    'process.env.COGNITO_DOMAIN':       JSON.stringify(process.env.COGNITO_DOMAIN ?? ''),
  },
  // amazon-cognito-identity-js (via its Buffer polyfill) reads Node's `global`.
  // The production build's CommonJS handling rewrites it, but the dev server's
  // dependency pre-bundling doesn't, so `npm run dev` crashed with "global is
  // not defined" (TYP-11). Scoped to dep pre-bundling, so builds are untouched.
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
