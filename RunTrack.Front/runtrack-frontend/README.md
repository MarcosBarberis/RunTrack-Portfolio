# RunTrack · Frontend

SPA en React 18 + TypeScript + Vite + Tailwind CSS. La documentación general del proyecto está en el [README principal](../../README.md).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con proxy de `/api` a `http://localhost:5053` |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |

## Variables de entorno

Copiá `.env.example` a `.env`.

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL de la API. En desarrollo, si se omite, se usa `http://localhost:5053` |
| `VITE_DEMO_MODE` | `true` para usar la API simulada con datos ficticios (sin backend) |
| `VITE_BASE` | Ruta base de publicación, por ejemplo `/RunTrack-Portfolio/` para GitHub Pages |

## Modo demo

Con `VITE_DEMO_MODE=true`, `src/services/api.ts` deriva cada request a `src/demo/mockApi.ts`, que mantiene los datos en memoria (por pestaña) y replica las reglas de negocio principales de la API: cuotas, período de gracia, EMMAC y rachas.

Accesos de la demo: coach `coach` / `demo1234`, runner con DNI `30111222`.
