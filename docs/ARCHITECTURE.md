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
