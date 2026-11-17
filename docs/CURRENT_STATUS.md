# Estado Actual del Proyecto y Bitácora de Relevo (CURRENT_STATUS.md)

> **Última actualización:** 16 de Noviembre de 2026  
> **Estado de la suite de pruebas:** 69/69 tests unitarios en verde (100% pasando).  
> **Linter:** 0 errores, 0 advertencias (`npm run lint:check`).  
> **Build:** Exitoso y validado (`npm run build`).  
> **Rama base:** `main` (protegida por GitHub Rulesets con CI obligatorio).

---

## 🧭 ¿Cómo retomar este proyecto en una nueva sesión o laptop?

Si eres un agente de IA o un desarrollador nuevo en este repositorio:
1. Lee las reglas permanentes en [AGENTS.md](file:///c:/Proyectos/sggd-frontend/AGENTS.md).
2. Lee este documento para situarte en el punto exacto de avance.
3. No reescribas ni modifiques módulos ya marcados como ✅ **Completados y Verificados**.
4. Inicia directamente en la tarea correspondiente del **Plan Inmediato de PRs** (actualmente **PR C** tras fusionar **PR B**).

---

## 📊 1. Hitos Completados y Verificados (NO TOCAR)

| Nivel / Módulo | Estado | Detalle y Cobertura |
| :--- | :---: | :--- |
| **Nivel 0 · Integridad de Base de Datos** | ✅ **Completado** | Triggers contra escalada de privilegios; RLS activo en las 4 tablas (`garantias`, `garantias_audit`, `profiles`, `reclamaciones`); RPC `verificar_garantia` con enmascaramiento en servidor; índices de unicidad en serie y en reclamaciones abiertas; restricciones CHECK activas. |
| **Nivel 1 · Red de Seguridad & CI** | ✅ **Completado** | Workflow `.github/workflows/ci.yml` configurado y en verde. `docs/SCHEMA.sql` conciliado al 100% con la base de datos real e idempotente. Limpieza destructiva (`TRUNCATE`) aislada en `docs/one-off/` con `RAISE EXCEPTION`. |
| **P0 · Mapeo de errores PostgreSQL (PR #10)** | ✅ **Completado** | Mapeo de códigos `23505`, `42501` y `23514` a mensajes claros en `reclamacionesRepo.ts` (+5 tests). |
| **Nivel 2 · Sesión reactiva & Auth Hardening (PR #11 y #12)** | ✅ **Completado** | Reloj reactivo `now = ref(Date.now())` con `setTimeout` acotado; listener GoTrue síncrono; carrera de perfiles (A-tarde / B-temprano) resuelta; desacoplamiento de capas (`signIn`/`signOut` en `authStore`); rollback automático si falla perfil; 54 tests en verde. |
| **Limpieza de Vistas Inseguras (Supabase)** | ✅ **Completado** | Se ejecutó `DROP VIEW` sobre `garantias_activas_con_dias`, `reclamaciones_pendientes` y `profiles_activos`, cerrando los avisos críticos de *Security Definer View* en el asesor de seguridad de Supabase. |
| **PR A · Ciclo de Vida de Reclamaciones (PR #13)** | ✅ **Completado** | `updateEstadoReclamacion` con lista blanca de columnas RLS (`estado_reclamacion`, `notas_tecnico`), `.select()` y mapeo de errores; helper anti-XSS `esUrlSegura`; UI con filtros por estado, badges, notas técnicas y `fecha_resolucion`; 66 tests unitarios en verde. |
| **PR B · Gestión y Baja de Empleados (`feat/baja-empleados`)** | ✅ **Completado** | `setActivo(userId, activo)` en `usuariosRepo.ts` con `.select()` y validación de filas; desanidación de `execute()` en `registrarEmpleado`; toggle `Activo`/`Inactivo` con modal de confirmación, protección contra auto-bloqueo y rollback visual en selector de roles; 69 tests unitarios en verde. |

---

## 📍 2. Punto Exacto de Avance (Dónde estamos parados hoy)

- La implementación de **PR B (`feat/baja-empleados`)** está completa y verificada localmente (69/69 tests unitarios, 0 errores de linter, build limpio).
- Incluye el pulido visual responsive de `AppNavbar.vue`, la alineación de controles en `ReclamacionListado.vue` y la documentación de políticas RLS para `garantias_audit` en `docs/SCHEMA.sql`.
- Lista en el working tree para commit, push y apertura de Pull Request hacia `main`, además de desactivar desde la UI las cuentas de prueba `jperez@example.com` y `luisexample15@gmail.com`.

---

## 🚀 3. Hoja de Ruta Inmediata (Siguientes Pull Requests)

### PR B · `feat/baja-empleados` (✅ Implementado en rama actual)
**Meta:** Gestión segura de empleados activos/inactivos desde la interfaz de administración.
1. **`src/features/usuarios/usuariosRepo.ts`:**
   - Implementado `setActivo(userId: string, activo: boolean)` con `.select()` y validación de filas.
2. **`src/features/usuarios/useUsuarios.ts` y `UsuariosListado.vue`:**
   - Interruptor/toggle interactivo de estado (`Activo`/`Inactivo`) con modal de confirmación.
   - Interruptor deshabilitado en la fila del administrador actual para evitar auto-bloqueos.
   - Rollback visual en el `<select>` de roles si la llamada falla.
   - Llamadas `execute()` desanidadas en `registrarEmpleado`.
3. **Desactivación de Cuentas:**
   - Desactivar las cuentas de prueba `jperez@example.com` y `luisexample15@gmail.com` desde la propia UI.
4. **Tests Unitarios:**
   - Cobertura para `setActivo` en `usuariosRepo.spec.ts` (+3 tests).

---

### PR C · `chore/docs-y-limpieza` (Prioridad Baja)
**Meta:** Pulido de documentación, CI E2E y limpieza del repositorio.
1. Actualizar `README.md` y `docs/ARCHITECTURE.md` (eliminar menciones a roles legacy `empresa`/`cliente`, documentar roles `admin`/`empleado` y comandos de verificación).
2. Reorganizar archivos SQL en `docs/migrations/`, `docs/SCHEMA.sql` y `docs/one-off/`.
3. Evaluar integración de tests Playwright E2E en GitHub Actions CI.
4. Eliminar ramas remotas y locales ya fusionadas.

---

## 📌 4. Backlog Técnico (Sin Prisa)
- Evaluar mover la generación de `hash_certificado` a PostgreSQL mediante `gen_random_bytes(16)`, prescindiendo de `crypto-js` y `VITE_HASH_SALT`.
- Redirección automática a `/login` al expirar la sesión cuando el usuario está inactivo en pantalla.
- Mensaje de aviso cuando un listado alcance el límite de 100 registros.
