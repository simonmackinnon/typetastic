import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.COGNITO_USER_POOL_ID': JSON.stringify(process.env.COGNITO_USER_POOL_ID ?? ''),
    'process.env.COGNITO_CLIENT_ID': JSON.stringify(process.env.COGNITO_CLIENT_ID ?? ''),
    'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL ?? ''),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
