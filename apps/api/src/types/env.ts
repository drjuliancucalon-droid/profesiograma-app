export interface Env {
  DB: D1Database;
  BROWSER: Fetcher;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}

type AuthUser = {
  sub: string;
  email: string;
  rol: 'admin' | 'medico' | 'rrhh' | 'sst';
  organizacion_id: string;
  es_superadmin: boolean;
  iat: number;
  exp: number;
};

// Tipo único reutilizable en todas las rutas y middlewares
export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
};

// Permite c.get('user') / c.set('user') con tipo inferido automáticamente
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
