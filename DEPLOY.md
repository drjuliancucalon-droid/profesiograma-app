# Guía de Primer Deploy

## Pre-requisitos en Cloudflare Dashboard

### 1. Crear base de datos D1
```bash
npx wrangler d1 create profesiograma-db
```
Copia el `database_id` que devuelve y reemplázalo en `apps/api/wrangler.toml`.

### 2. Crear bucket R2 (opcional, para logos)
```bash
npx wrangler r2 bucket create profesiograma-assets
```

### 3. Agregar secretos al Worker
```bash
cd apps/api
npx wrangler secret put JWT_SECRET        # cadena aleatoria larga
npx wrangler secret put GEMINI_API_KEY    # clave de Google AI Studio
```

### 4. GitHub Secrets requeridos
En `Settings → Secrets and variables → Actions` del repo agrega:

| Secret | Dónde obtenerlo |
|---|---|
| `CLOUDFLARE_API_TOKEN` | dashboard.cloudflare.com → My Profile → API Tokens → Create Token (use template "Edit Cloudflare Workers") |
| `CLOUDFLARE_ACCOUNT_ID` | dashboard.cloudflare.com → lado derecho de la página de inicio |

### 5. Activar Browser Rendering
El binding `[browser]` en `wrangler.toml` ya está configurado.  
Requiere plan **Workers Paid** (5 USD/mes) o superior.

---

## Primer deploy manual (sin CI)
```bash
# Desde la raíz del repo
npm ci
cd apps/api
npm ci
npx wrangler d1 migrations apply profesiograma-db --remote
npx wrangler deploy
```

## Verificar que funciona
```bash
curl https://profesiograma-api.workers.dev/health
# {"status":"ok","timestamp":"..."}
```

## Endpoints disponibles
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | /api/auth/login | ❌ | Login |
| GET | /health | ❌ | Health check |
| GET | /api/empresas | ✅ | Listar empresas |
| POST | /api/empresas | ✅ admin | Crear empresa |
| GET | /api/profesiograma | ✅ | Listar profesiogramas |
| POST | /api/profesiograma | ✅ | Crear profesiograma |
| POST | /api/profesiograma/generate | ✅ medico | Generar con IA |
| GET | /api/ordenes | ✅ | Listar órdenes |
| POST | /api/ordenes | ✅ | Crear orden |
| GET | /api/pdf/profesiogramas/:id/pdf | ✅ | Exportar PDF |
| GET | /api/users | ✅ admin | Listar usuarios |
| POST | /api/users | ✅ admin | Crear usuario |
| GET | /api/historial | ✅ | Historial versiones |
