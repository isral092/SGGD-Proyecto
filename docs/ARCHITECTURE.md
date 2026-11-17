# Arquitectura — SGGD Frontend

## Modelo: Feature-based MVVM ligero

El proyecto organiza el código por dominio de negocio (*vertical slices*) dentro de `src/features/`, manteniendo una separación unidireccional de responsabilidades:

```text
[ Vistas (.vue) ]
       │
       ▼
[ Composables (use*.ts) / Stores (*Store.ts) ]
       │
       ▼
[ Repositorios (*Repo.ts) ]
       │
       ▼
[ Cliente de infraestructura (supabaseClient.ts) ]
```

## Estructura de directorios

```text
src/
├── assets/
│   └── main.css                     # Configuración e imports de Tailwind CSS
├── core/                            # Infraestructura compartida y utilidades agnósticas
│   ├── composables/
│   │   ├── __tests__/
│   │   │   └── useAsyncState.spec.ts
│   │   └── useAsyncState.ts         # Manejo estandarizado de loading, error y successMessage
│   ├── config/
│   │   └── supabaseClient.ts        # Instancia principal y cliente efímero de Supabase
│   └── utils/
│       ├── __tests__/               # Pruebas unitarias de utilidades y esquemas
│       ├── cryptoUtils.ts           # Generación de hash SHA-256 para certificados
│       ├── fechaUtils.ts            # Cálculos de vigencia y formato en zona local
│       ├── formatUtils.ts           # Enmascaramiento defensivo de correos en UI
│       └── schema.ts                # Esquemas de validación con Zod
│
├── features/                        # Módulos de negocio
│   ├── auth/
│   │   ├── __tests__/
│   │   ├── AuthLogin.vue
│   │   └── authStore.ts             # Estado global de sesión, perfil y expiración reactiva
│   ├── garantias/
│   │   ├── __tests__/
│   │   ├── GarantiaListado.vue
│   │   ├── GarantiaRegistro.vue
│   │   ├── GarantiaVerificacion.vue
│   │   ├── garantiasRepo.ts
│   │   └── useGarantias.ts
│   ├── reclamaciones/
│   │   ├── __tests__/
│   │   ├── ReclamacionListado.vue
│   │   ├── reclamacionesRepo.ts
│   │   └── useReclamaciones.ts
│   └── usuarios/
│       ├── __tests__/
│       ├── UsuarioPerfil.vue
│       ├── UsuariosListado.vue
│       ├── usuariosRepo.ts
│       └── useUsuarios.ts
│
├── router/
│   ├── index.ts                     # Rutas y guard de autorización por rol y cuenta activa
│   └── index.spec.ts
├── shared/
│   ├── icons/                       # Componentes SVG
│   └── layout/
│       └── AppNavbar.vue
├── App.vue
└── main.ts
```

## Reglas de capas

1. **Vistas (`.vue`):** Solo contienen plantilla, estado local de interfaz (modales, pestañas, borradores de inputs) y llamadas a composables o stores. Ningún componente `.vue` importa `supabaseClient` ni archivos `*Repo.ts`.
2. **Composables (`use*.ts`):** Actúan como *ViewModel*. Orquestan llamadas al repositorio a través de `useAsyncState`, actualizan las listas reactivas en memoria y exponen funciones listas para la vista.
3. **Store de autenticación (`authStore.ts`):**
   - Centraliza `signIn`, `signOut`, `initialize`, `syncSession` y `ensureProfile`.
   - Mantiene un reloj reactivo (`now`) sincronizado con `session.expires_at` mediante `setTimeout` acotado a $2^{31}-1$ ms para invalidar la sesión automáticamente al expirar el token.
   - Descarta respuestas de perfil obsoletas si el usuario activo cambia mientras una petición sigue en vuelo.
   - Expone los getters `isAuthenticated`, `isActive` (`profile.activo === true`), `isAdmin` e `isEmpleado`.
4. **Repositorios (`*Repo.ts`):**
   - Única capa que interactúa con `supabase.from(...)` o `supabase.rpc(...)`.
   - En operaciones `.update()`, encadenan `.select()` y comprueban que se haya afectado al menos una fila para detectar bloqueos silenciosos de RLS.
   - Traducen códigos de error de PostgreSQL (`23505`, `42501`, `23514`) a mensajes claros de dominio.

## Seguridad en cliente y servidor

### 1. Row Level Security (RLS) y funciones RPC
Los guards de `src/router/index.ts` y las validaciones de interfaz cumplen un propósito de experiencia de usuario. El control de acceso real reside en PostgreSQL:

- Las tablas `garantias`, `garantias_audit`, `profiles` y `reclamaciones` tienen RLS habilitado.
- La consulta pública de certificados (`/verificar/:hash`) no tiene permiso `SELECT` directo sobre `garantias`; consume la función `SECURITY DEFINER` `public.verificar_garantia(p_hash)`, que devuelve únicamente los campos públicos con el correo del cliente ya enmascarado desde el servidor.
- En `reclamaciones`, los permisos de actualización están restringidos a nivel de columna (`GRANT UPDATE (estado_reclamacion, notas_tecnico)`), y las fechas de solicitud, actualización y resolución las asigna un trigger en el servidor.
- En `profiles`, el trigger `trg_proteger_columnas_profiles` impide que un usuario cambie su propio rol, se desactive a sí mismo o deje al sistema sin al menos un administrador activo.

### 2. Prevención de XSS en enlaces externos
El campo `evidencia_url` de una reclamación proviene de un formulario público. Antes de renderizarlo como `<a href="...">`, se valida en el cliente con `esUrlSegura(url)` (aceptando únicamente protocolos `http:` y `https:`) y se acompaña de `target="_blank" rel="noopener noreferrer"`. En la base de datos, la restricción `reclamaciones_evidencia_url_check` refuerza la misma regla.

### 3. Alcance del hash de certificado en el cliente
`src/core/utils/cryptoUtils.ts` genera un identificador SHA-256 para cada certificado usando `VITE_HASH_SALT`. Al ejecutarse en el navegador, este hash funciona como un identificador único no secuencial para el código QR y no como una firma criptográfica con secreto de servidor.
