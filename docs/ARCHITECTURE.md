# Arquitectura — SGGD Frontend

## Arquitectura Unificada: Feature-based MVVM ligero

Hemos adoptado una postura arquitectónica madura y pragmática, organizando el frontend en un único modelo: **Feature-based MVVM ligero**.
Esta arquitectura abandona la terminología confusa en favor de una estructura que escala naturalmente con Vue 3.

## Estructura de Directorios (Single Source of Truth)

Toda la aplicación se organiza bajo la siguiente jerarquía estricta:

```text
src/
├── assets/                  # CSS global e imágenes
├── core/                    # Infraestructura compartida
│   ├── config/
│   │   └── supabaseClient.ts
│   ├── types/
│   │   └── supabase.ts
│   └── utils/
│       ├── __tests__/
│       │   └── cryptoUtils.spec.ts
│       ├── cryptoUtils.ts
│       └── schema.ts
│
├── features/                # Módulos de negocio (Vertical Slices)
│   ├── auth/                # Login y Store de Autenticación
│   ├── garantias/           # Registro, Listado, Verificación
│   ├── reclamaciones/       # Listado de reclamaciones
│   └── usuarios/            # Perfil y Gestor de Roles
│
├── shared/                  # UI genérica
│   ├── icons/               # Iconos SVG como componentes Vue
│   └── layout/
│       └── AppNavbar.vue
│
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

## Principios Arquitectónicos Claros

1. **Un feature = una carpeta:** Todo lo relacionado a un dominio de negocio (Garantías, Auth, Usuarios) vive junto.
2. **Repository por feature (`*Repo.ts`):** Encargado exclusivo de hablar con la infraestructura (Supabase o APIs). Aísla la base de datos de la UI.
3. **Composable como fachada (`use*.ts`):** Actúa como el *ViewModel*. Orquesta la lógica: llama al Repository, maneja estados de carga y expone variables reactivas a la vista.
4. **Store solo para estado global (`*Store.ts`):** Pinia se reserva para datos que deben persistir entre múltiples pantallas (ej. sesión de usuario).
5. **Core para infraestructura:** Todo lo que va en `core/` debe ser agnóstico al negocio.

## Seguridad y Transparencia

### 1. Seguridad Basada en el Cliente vs Servidor (Supabase RLS)
> [!IMPORTANT]
> Las validaciones de ruta (`router/index.ts`) y la restricción de opciones en la UI son para fines de **Experiencia de Usuario (UX)**. 
> Para proteger la base de datos de accesos no autorizados, es mandatorio tener activadas y configuradas las **Políticas RLS (Row Level Security)** en Supabase. Un usuario malintencionado puede evadir las capas de Vue y consultar la API de Supabase directamente si las tablas no tienen RLS.

### 2. Limitaciones de Criptografía en el Cliente
El archivo `src/core/utils/cryptoUtils.ts` genera hashes para las URLs públicas de validación de garantías.
- **Limitación:** Al ser una aplicación 100% frontend (SPA), el salt `VITE_HASH_SALT` se compila y expone en el cliente.
- **Alcance:** Funciona como un mecanismo de ofuscación de URLs para evitar manipulación fácil, pero no reemplaza a una firma criptográfica en backend.

### 3. Configuración de Variables de Entorno (`.env`)
El proyecto utiliza variables de entorno para su inicialización:
- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave anónima pública de Supabase.
- `VITE_HASH_SALT`: Salt de hashing para verificación (ofuscación).
