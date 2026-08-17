export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  BROWSER: Fetcher;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}

// Extiende el contexto Hono con variables tipadas
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      sub: string;
      email: string;
      rol: 'admin' | 'medico' | 'rrhh' | 'sst';
      iat: number;
      exp: number;
    };
  }
}
