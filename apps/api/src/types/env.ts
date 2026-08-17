export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  BROWSER: Fetcher;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}

// Tipo único reutilizable en todas las rutas y middlewares
export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user: {
      sub: string;
      email: string;
      rol: 'admin' | 'medico' | 'rrhh' | 'sst';
      iat: number;
      exp: number;
    };
  };
};

// Permite c.get('user') / c.set('user') con tipo inferido automáticamente
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
