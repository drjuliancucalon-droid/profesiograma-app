# Profesiograma SST — Sistema de Evaluaciones Médicas Ocupacionales

> Desarrollado por **Dr. Julián Andrés Cucalón Jurado** — Especialista SST & IA  
> Stack: Cloudflare Workers · Cloudflare D1 · Cloudflare Pages · React · Hono · TypeScript

---

## Arquitectura

```
profesiograma-app/
├── apps/
│   ├── web/          ← Frontend React + Vite + TypeScript (Cloudflare Pages)
│   └── api/          ← Backend Cloudflare Worker con Hono (REST API)
├── packages/
│   └── shared-types/ ← Tipos TypeScript compartidos front/back
└── .github/
    └── workflows/    ← CI/CD deploy automático
```

## Setup Local

```bash
# Instalar dependencias
npm install

# Crear base de datos D1
npx wrangler d1 create profesiograma-db
# Copiar el database_id generado en apps/api/wrangler.toml

# Aplicar schema
npx wrangler d1 execute profesiograma-db --file=apps/api/src/db/schema.sql

# Variables de entorno del Worker (secrets)
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put JWT_SECRET

# Desarrollo local
npm run dev:api    # Worker en localhost:8787
npm run dev:web    # Vite en localhost:5173
```

## Deploy Producción

```bash
# API (Worker)
cd apps/api && npx wrangler deploy

# Frontend (Pages)
cd apps/web && npm run build
# Conectar /apps/web en Cloudflare Pages dashboard
```

## Variables de entorno necesarias

| Variable | Dónde | Descripción |
|---|---|---|
| `GEMINI_API_KEY` | Wrangler Secret | API key Google Gemini 2.5 Flash |
| `JWT_SECRET` | Wrangler Secret | Secret para firmar tokens JWT (mínimo 32 chars) |
| `VITE_API_URL` | `.env.local` web | URL del Worker (ej: https://api.profesiograma.workers.dev) |

## Marco Legal
- Resolución 1843 de 2025
- Sentencia T-202 de 2024 / Ley 2114
- Decreto 1072 de 2015
- Resolución 4272 de 2021 (Trabajo en Alturas)
- Res. 20223040040595 de 2022 (PESV Conductores)
