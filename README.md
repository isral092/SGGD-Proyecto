# SGGD — Sistema de Garantías Digitales

Aplicación web para la emisión, verificación pública y gestión de garantías y reclamaciones mediante certificados digitales con código QR.

## Stack técnico

- **Frontend:** Vue 3 (Composition API, `<script setup lang="ts">`), TypeScript, Vite
- **Estado y rutas:** Pinia, Vue Router 5
- **Estilos:** Tailwind CSS 4
- **Validación:** Zod
- **Backend / BaaS:** Supabase (PostgreSQL, Row Level Security, funciones RPC y Auth)
- **Pruebas y calidad:** Vitest, Playwright, Oxlint + ESLint, `vue-tsc`

## Arquitectura

El proyecto está organizado bajo **Feature-based MVVM ligero** con separación unidireccional de capas:

`Vistas (.vue)` → `Composables (use*.ts) / Stores (*Store.ts)` → `Repositorios (*Repo.ts)` → `Cliente Supabase`

La documentación detallada de capas, responsabilidades y decisiones de diseño se encuentra en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Instalación y configuración local

```bash
npm install
cp .env.example .env
# Configurar las variables de entorno en .env
npm run dev
```

### Variables de entorno

| Variable | Requerida | Descripción |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Sí | URL del proyecto en Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública (`anon`) de Supabase |
| `VITE_APP_URL` | No | URL base usada al generar enlaces de QR (por defecto `window.location.origin`) |
| `VITE_HASH_SALT` | No | Salt para la generación de hashes de certificados |

## Scripts disponibles

```bash
npm run dev          # Levanta el servidor de desarrollo (Vite)
npm run build        # Ejecuta type-check y genera el bundle de producción
npm run type-check   # Verificación estricta de tipos con vue-tsc
npm run lint:check   # Ejecuta Oxlint y ESLint sin modificar archivos (usado en CI)
npm run lint         # Ejecuta Oxlint y ESLint con auto-corrección
npm run test:unit    # Ejecuta la suite de pruebas unitarias con Vitest
npm run test:e2e     # Ejecuta las pruebas E2E con Playwright
```

## Rutas y control de acceso

| Ruta | Acceso | Descripción |
| :--- | :--- | :--- |
| `/login` | Público | Inicio de sesión para personal autorizado |
| `/verificar/:hash` | Público | Consulta pública de certificado por QR y registro de reclamaciones |
| `/` | `admin`, `empleado` | Emisión de certificados digitales de garantía |
| `/garantias` | `admin`, `empleado` | Listado y búsqueda de garantías registradas |
| `/reclamaciones` | `admin`, `empleado` | Gestión técnica de reclamaciones, estados y notas |
| `/perfil` | Autenticado | Información de la cuenta y estado de activación |
| `/admin/roles` | `admin` | Alta de empleados, asignación de roles y activación/baja de cuentas |

## Modelo de roles y seguridad

El sistema opera bajo un esquema interno para el personal de la empresa y un portal público sin cuenta para el consumidor final:

- **`admin`:** Acceso operativo completo y administración de cuentas de usuario (`/admin/roles`).
- **`empleado`:** Emisión de garantías, consulta de registros y seguimiento técnico de reclamaciones.
- **Consulta pública (anónimo):** Los clientes verifican la vigencia de su certificado en `/verificar/:hash` y pueden abrir una reclamación si la garantía está vigente, sin exponer datos sensibles.

> [!NOTE]
> El enum `public.user_role` en PostgreSQL conserva las etiquetas históricas `empresa` y `cliente` por compatibilidad del catálogo, utilizando `'cliente'` como valor por defecto de mínimo privilegio antes de que un administrador active una cuenta.

## Base de datos (Supabase)

La documentación SQL vive en [`docs/`](docs/):

- [`docs/SCHEMA.sql`](docs/SCHEMA.sql): Esquema completo e idempotente (tablas, índices únicos parciales, restricciones `CHECK`, funciones `SECURITY DEFINER`, triggers y políticas RLS).
- [`docs/migrations/`](docs/migrations/): Historial incremental de migraciones aplicadas.
- [`docs/one-off/`](docs/one-off/): Scripts puntuales de mantenimiento protegidos contra ejecución accidental.

### Verificación rápida de RLS

Para comprobar en el SQL Editor de Supabase que un usuario anónimo no puede leer las tablas directamente y que la RPC pública responde adecuadamente:

```sql
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS garantias_visibles_anon FROM public.garantias;         -- esperado: 0
SELECT count(*) AS reclamaciones_visibles_anon FROM public.reclamaciones; -- esperado: 0
SELECT public.verificar_garantia('hash-inexistente') AS rpc_resultado;    -- esperado: NULL
ROLLBACK;
```

## Estructura del directorio

```text
src/
├── assets/          # Estilos globales (Tailwind CSS)
├── core/            # Cliente Supabase, composable useAsyncState, esquemas Zod y utilidades
├── features/        # Módulos de dominio (auth, garantias, reclamaciones, usuarios)
├── router/          # Definición de rutas y guard de navegación por rol y estado activo
└── shared/          # Componentes transversales (AppNavbar, iconos)
```

## Despliegue

El repositorio incluye `vercel.json` configurado con redirecciones SPA hacia `index.html`. En el panel de Vercel deben definirse `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_HASH_SALT`.
