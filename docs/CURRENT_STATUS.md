# Estado Actual del Proyecto y Bitácora de Relevo (CURRENT_STATUS.md)

> **Última actualización:** 16 de Noviembre de 2026  
> **Estado de la suite de pruebas:** 69/69 tests unitarios en verde + test E2E de Playwright en CI.  
> **Linter:** 0 errores, 0 advertencias (`npm run lint:check`).  
> **Build:** Exitoso y validado (`npm run build`).  
> **Rama base:** `main` (protegida por GitHub Rulesets con CI obligatorio).

---

## 🧭 ¿Cómo retomar este proyecto en una nueva sesión o laptop?

1. Lee las reglas permanentes en [`AGENTS.md`](../AGENTS.md).
2. Revisa la tabla de hitos completados a continuación para conocer la cobertura actual.
3. Si se requiere agregar una funcionalidad nueva, toma como punto de partida el **Backlog Técnico** al final de este archivo.

---

## 📊 1. Hitos Completados y Verificados

| Nivel / Módulo | Estado | Detalle y Cobertura |
| :--- | :---: | :--- |
| **Nivel 0 · Integridad de Base de Datos** | ✅ **Completado** | Triggers contra escalada de privilegios; RLS activo en las 4 tablas (`garantias`, `garantias_audit`, `profiles`, `reclamaciones`); RPC `verificar_garantia` con enmascaramiento en servidor; índices de unicidad en serie y en reclamaciones abiertas; restricciones CHECK activas. |
| **Nivel 1 · Red de Seguridad & CI** | ✅ **Completado** | Workflow `.github/workflows/ci.yml` configurado y en verde. `docs/SCHEMA.sql` conciliado con la base de datos real e idempotente. Limpieza destructiva (`TRUNCATE`) aislada en `docs/one-off/` con `RAISE EXCEPTION`. |
| **P0 · Mapeo de errores PostgreSQL (PR #10)** | ✅ **Completado** | Mapeo de códigos `23505`, `42501` y `23514` a mensajes claros en `reclamacionesRepo.ts` (+5 tests). |
| **Nivel 2 · Sesión reactiva & Auth Hardening (PR #11 y #12)** | ✅ **Completado** | Reloj reactivo `now = ref(Date.now())` con `setTimeout` acotado; listener GoTrue síncrono; carrera de perfiles resuelta; desacoplamiento de capas (`signIn`/`signOut` en `authStore`); rollback automático si falla perfil; 54 tests en verde. |
| **Limpieza de Vistas Inseguras (Supabase)** | ✅ **Completado** | Se ejecutó `DROP VIEW` sobre `garantias_activas_con_dias`, `reclamaciones_pendientes` y `profiles_activos`, eliminando vistas `SECURITY DEFINER` obsoletas (documentado en `docs/migrations/004_drop_vistas_inseguras.sql`). |
| **PR A · Ciclo de Vida de Reclamaciones (PR #13)** | ✅ **Completado** | `updateEstadoReclamacion` con lista blanca de columnas RLS (`estado_reclamacion`, `notas_tecnico`), `.select()` y mapeo de errores; helper anti-XSS `esUrlSegura`; UI con filtros por estado, badges, notas técnicas y `fecha_resolucion`; 66 tests unitarios en verde. |
| **PR B · Gestión y Baja de Empleados (PR #14)** | ✅ **Completado** | `setActivo(userId, activo)` en `usuariosRepo.ts` con `.select()` y validación de filas; desanidación de `execute()` en `registrarEmpleado`; toggle `Activo`/`Inactivo` con modal de confirmación, protección contra auto-bloqueo y rollback visual en selector de roles; ajustes responsivos en `AppNavbar.vue` y `ReclamacionListado.vue`; 69 tests unitarios en verde. |
| **PR C · Documentación, CI E2E y Limpieza (PR #15)** | ✅ **Completado** | `README.md` y `docs/ARCHITECTURE.md` actualizados con roles vigentes (`admin`/`empleado`), rutas reales y árbol de archivos; scripts SQL organizados en `docs/migrations/`, `docs/SCHEMA.sql` y `docs/one-off/`; job de Playwright E2E sobre Chromium integrado en GitHub Actions CI. |

---

## 📍 2. Punto Exacto de Avance (Cierre de Entrega)

- El desarrollo planificado para el prototipo de **Taller de Investigación 2** ha quedado formalmente **concluido al 100%**.
- Todos los Pull Requests (#10, #11, #12, #13, #14 y #15) han sido probados por CI y fusionados en `main`.
- Las ramas remotas (`feat/*`, `fix/*`, `chore/*`) se preservan intencionalmente en el repositorio para proveer evidencia auditable y visual del flujo de trabajo *Git Feature Branching* ante el comité evaluador.
- La suite completa de calidad cuenta con:
  - **69 pruebas unitarias** pasando (`vitest`).
  - **Prueba E2E institucional** pasando en navegador Chromium headless (`playwright`).
  - **Linter y Type-check** con 0 errores y 0 advertencias (`oxlint`, `eslint`, `vue-tsc`).
  - **Build de producción** generado y desplegado sin incidencias.

---

## 📌 3. Backlog Técnico (Mejoras Futuras Opcionales)

- Evaluar mover la generación de `hash_certificado` a PostgreSQL mediante `gen_random_bytes(16)`, prescindiendo de `crypto-js` y `VITE_HASH_SALT`.
- Redirección automática a `/login` al expirar la sesión cuando el usuario permanece inactivo en pantalla.
- Aviso en interfaz o paginación cuando un listado alcance el límite de 100 registros.
