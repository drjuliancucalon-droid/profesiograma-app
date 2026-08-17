export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  BROWSER: Fetcher;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}
