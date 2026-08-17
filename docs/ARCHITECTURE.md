# Profesiograma App — Arquitectura

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Zustand |
| Backend/API | Cloudflare Workers (Hono) |
| Base de datos | Cloudflare D1 (SQLite) |
| IA | Cloudflare Workers AI (Llama 3.1 8B) |
| PDF/Screenshots | Cloudflare Browser Rendering |
| Auth | JWT con Workers KV |
| Deploy | Cloudflare Pages + GitHub Actions |

## Módulos

```
profesiograma-app/
├── apps/
│   ├── api/               # Cloudflare Worker (Hono)
│   │   ├── src/routes/    # auth, profesiogramas, ordenes
│   │   ├── src/services/  # aiService, pdfService, dbService
│   │   └── wrangler.toml
│   └── web/               # React + Vite
│       └── src/
│           ├── modules/   # auth, dashboard, profesiograma, empresas, ordenes, historial
│           ├── store/     # authStore, profesiogramaStore
│           └── shared/    # api, ui components
├── packages/
│   └── shared-types/      # Tipos compartidos TypeScript
└── .github/workflows/     # CI/CD Deploy
```

## Marco Legal

- **Resolución 1843 de 2025** — Evaluaciones Médicas Ocupacionales Colombia
- **Sentencia T-202 de 2024** — Prohibiciones exámenes discriminatorios
- **Decreto 1072 de 2015** — Exámenes según perfil cargo
- **Resolución 4272 de 2021** — Trabajo en alturas

## Momentos de evaluación

| Sigla | Momento |
|---|---|
| I | Ingreso |
| P | Periódico |
| R | Retiro |
| PI | Post-Incapacidad |
| RL | Reintegro Laboral |

## Flujo de generación IA

1. Usuario ingresa lista de cargos
2. Worker llama a `@cf/meta/llama-3.1-8b-instruct`
3. IA devuelve JSON estructurado con: perfil del cargo, peligros, matriz exámenes, fundamentación técnica
4. Frontend renderiza tabla editable
5. Usuario revisa/edita, guarda en D1
6. Browser Rendering genera PDF del profesiograma
