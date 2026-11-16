# Guía de Desarrollo y Reglas de Trabajo para Agentes (AGENTS.md)

Este documento define la **Constitución Técnica y Operativa** del repositorio **SGGD Frontend** (Sistema de Garantías Digitales). Cualquier agente de IA, desarrollador o asistente automatizado que trabaje en este proyecto **DEBE leer, respetar y hacer cumplir** estas reglas sin excepciones.

---

## 🏛️ 1. Stack Tecnológico & Arquitectura

- **Framework:** Vue 3 (Composition API con sintaxis `<script setup lang="ts">`).
- **Lenguaje:** TypeScript en modo estricto.
- **Estilos:** Tailwind CSS.
- **Estado Global:** Pinia.
- **Backend / BaaS:** Supabase (PostgreSQL con RLS, Triggers, RPCs y Auth GoTrue).
- **Tooling & Build:** Vite.
- **Calidad & Testing:** Vitest (unit tests), Playwright (E2E), Oxlint + ESLint (linter), Vue-Tsc (type-checking).
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`).

### Patrón Arquitectónico: Feature-based MVVM Ligero
La aplicación está organizada en vertical slices organizadas por dominio de negocio dentro de `src/features/`. Se rige bajo una **separación estricta de capas unidireccional**:

```text
[ Vistas / Componentes UI ]  (.vue)
            │
            ▼
[ Composables (ViewModel) ]  (use*.ts)  /  [ Stores (Estado Global) ] (*Store.ts)
            │
            ▼
[ Repositorios (Data Layer) ] (*Repo.ts)
            │
            ▼
[ Infraestructura / Cliente API ] (supabaseClient.ts)
```

---

## 🚫 2. Reglas de Capas Inquebrantables (Leyes del Repo)

1. **PROHIBIDO importar `supabaseClient` o `supabase` en vistas `.vue`:**
   - Ningún componente o vista puede invocar directamente `supabase.from(...)` o `supabase.auth.*`.
   - Las operaciones de autenticación pasan exclusivamente por `src/features/auth/authStore.ts`.
   - Las operaciones de base de datos pasan exclusivamente por los repositorios correspondientes (`*Repo.ts`).
2. **PROHIBIDO importar repositorios (`*Repo.ts`) en vistas `.vue`:**
   - La UI solo se comunica con **Composables** (`useGarantias`, `useReclamaciones`, `useUsuarios`) o el **Store** (`useAuthStore`).
   - El Composable es el encargado de gestionar `loading`, `error`, llamadas al repositorio y exponer datos reactivos.
3. **PROHIBIDO almacenar lógica de negocio pesada en componentes de presentación:**
   - Los archivos `.vue` solo contienen lógica de renderizado, vinculación de eventos (`@click`, `@submit`) y llamadas a métodos del ViewModel/Composable.

---

## 🛡️ 3. Reglas de Backend y Base de Datos (PostgreSQL en Supabase)

El frontend opera bajo una filosofía **Zero-Trust (Confianza Cero en el Cliente)**:
1. **Defensa en Profundidad (RLS):** La seguridad real reside en PostgreSQL mediante Row Level Security (RLS). Las restricciones en el router o botones deshabilitados en Vue son solo para UX.
2. **Permisos de Columna Estrictos:**
   - Al ejecutar un `.update()`, enviar **únicamente** las columnas permitidas por el RLS del rol actual (ej. un empleado actualizando una reclamación solo tiene permiso en `estado_reclamacion` y `notas_tecnico`). Enviar campos no autorizados provocará error `42501 (insufficient_privilege)`.
3. **Verificación Obligatoria de Filas Afectadas:**
   - Al realizar `.update()` o `.delete()`, **siempre** encadenar `.select()`.
   - Verificar que el arreglo devuelto contenga al menos 1 fila. Si devuelve 0 filas, debe arrojarse un error descriptivo (indica que la fila no existe o RLS bloqueó la operación silenciosamente).
4. **Mapeo de Errores PostgreSQL:**
   - Todo repositorio debe traducir códigos de error de Postgres a mensajes legibles para el usuario:
     - `23505`: Conflicto de unicidad (ej. ya existe una reclamación abierta o número de serie duplicado).
     - `42501`: Error de permisos RLS o garantía vencida.
     - `23514`: Violación de restricción CHECK (ej. URL mal formada o texto fuera de rango).
5. **Funciones y Triggers en BD:**
   - Toda función con `SECURITY DEFINER` debe incluir `SET search_path = ''` para prevenir secuestro de esquemas.
   - Todo script SQL de migración debe ser idempotente (`DROP POLICY IF EXISTS`, etc.). Prohibido incluir `TRUNCATE` o `DROP TABLE` en scripts de ejecución continua.

---

## 🔒 4. Estándares de Seguridad Web (Frontend)

1. **Prevención de XSS en URLs externas:**
   - Cualquier URL proveniente de la base de datos (como `evidencia_url`) **DEBE** validarse con un helper estricto (ej. `esUrlSegura(url)` con regex `^https?://`).
   - Prohibido renderizar enlaces con protocolos peligrosos (`javascript:`, `data:`).
   - Todo enlace a recursos externos debe incluir `target="_blank" rel="noopener noreferrer"`.
2. **Sesión Reactiva:**
   - La expiración de la sesión se gestiona con el reloj reactivo de `authStore.ts` y temporizadores limitados a $2^{31}-1$ ms.
   - Las cuentas con `activo = false` deben ser redirigidas a `/perfil` sin acceso a los módulos operativos.

---

## 🧪 5. Malla de Calidad y Verificación Obligatoria

Antes de dar por concluida cualquier modificación o enviar un PR, el agente **DEBE** ejecutar y validar localmente la suite completa de calidad:

```bash
# 1. Verificación de Linter (Oxlint + ESLint sin flags de auto-fix)
npm run lint:check

# 2. Suite de Pruebas Unitarias
npx vitest run

# 3. Compilación limpia y chequeo de tipos estricto
npm run build
```

**Criterio de Aceptación:**
- 0 errores y 0 advertencias de linter.
- 100% de los tests unitarios en verde.
- Build generado exitosamente sin errores de TypeScript (`vue-tsc`).

---

## 🌿 6. Flujo de Trabajo Git & CI/CD

1. **La rama `main` está protegida por Rulesets en GitHub:**
   - **NUNCA** hacer commits ni push directo sobre `main`.
2. **Flujo de Ramas & PRs:**
   - Toda nueva tarea nace en una rama nombrada según la convención:
     - `feat/<nombre-de-la-funcionalidad>`
     - `fix/<nombre-del-bug>`
     - `chore/<tarea-de-mantenimiento>`
   - Se abre un Pull Request hacia `main` con un título claro y descripción detallada de cambios.
   - El PR solo se fusiona cuando el check del CI de GitHub Actions (`Type-check, Lint, Unit Tests & Build`) esté en verde.
3. **Commits Convencionales:**
   - Usar formato semántico: `feat(...)`, `fix(...)`, `test(...)`, `refactor(...)`, `docs(...)`, `chore(...)`.

---

## 📖 7. Documento de Handover (`docs/CURRENT_STATUS.md`)

Antes de iniciar cualquier trabajo, el agente debe consultar [docs/CURRENT_STATUS.md](file:///c:/Proyectos/sggd-frontend/docs/CURRENT_STATUS.md) para saber exactamente qué se completó, en qué rama se está trabajando y cuál es la siguiente tarea prioritaria. Al terminar una jornada o hito, dicho archivo debe actualizarse.
