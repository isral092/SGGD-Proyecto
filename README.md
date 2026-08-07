# SGGD — Sistema de Garantías Digitales

Frontend del sistema para registrar, verificar y gestionar garantías de productos con certificados digitales (hash SHA-256 + código QR).

## Stack

- Vue 3 + TypeScript + Vite
- Vue Router + Pinia
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL)
- Zod (validación)

## Arquitectura

Este proyecto sigue una arquitectura **Feature-based MVVM ligero** 
(Features + Repositorios + Composables). No MVC tradicional.

Ver la guía completa en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Configuración

```sh
npm install
cp .env.example .env
# Editar .env con credenciales de Supabase
npm run dev
```

### Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave anónima de Supabase |
| `VITE_APP_URL` | No | URL pública para QR (ej. en Vercel) |
| `VITE_HASH_SALT` | No | Salt del hash; debe coincidir con garantías ya registradas |

## Scripts

```sh
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run type-check   # Verificación de tipos
npm run lint         # ESLint + Oxlint
npm run test:unit    # Vitest
npm run test:e2e     # Playwright
```

## Rutas principales

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/` | Público | Registro de garantías |
| `/verificar/:hash` | Público | Verificación por QR |
| `/login` | Público | Autenticación |
| `/garantias` | Autenticado | Listado de garantías |
| `/reclamaciones` | Autenticado | Gestión de reclamaciones |
| `/perfil` | Autenticado | Perfil del usuario |
| `/admin/roles` | Admin | Gestor de roles |

## Roles

- **admin** — Gestión de usuarios y roles
- **empresa** — Registro y consulta de garantías
- **cliente** — Consulta de perfil y verificación

## Estructura del proyecto

```text
src/
├── assets/        # Estilos globales y recursos estáticos
├── core/          # Infraestructura (Supabase, Utils, Zod Schemas)
├── features/      # Módulos Verticales (auth, garantias, reclamaciones, usuarios)
├── router/        # Configuración de Vue Router y guards
└── shared/        # Componentes y layouts genéricos (AppNavbar, Icons)
```

## Despliegue

Configurado para Vercel (`vercel.json` con rewrites SPA). Definir las variables de entorno en el panel de Vercel.
