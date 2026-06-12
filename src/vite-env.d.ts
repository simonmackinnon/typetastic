/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    COGNITO_USER_POOL_ID?: string;
    COGNITO_CLIENT_ID?: string;
    API_BASE_URL?: string;
  }
}
