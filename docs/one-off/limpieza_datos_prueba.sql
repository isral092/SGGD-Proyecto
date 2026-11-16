-- =============================================================================
-- DESTRUCTIVO - REFERENCIA HISTORICA - NO EJECUTAR EN PRODUCCION
-- =============================================================================
-- Se ejecuto UNA SOLA VEZ (noviembre 2026) para borrar los datos de prueba de
-- garantias, reclamaciones y auditoria antes de aplicar el Nivel 0 de integridad.
-- Conserva public.profiles.
--
-- Este archivo falla a proposito: borra TODAS las garantias, reclamaciones y la
-- auditoria, y no se puede deshacer. Si de verdad necesitas repetirlo (por ejemplo
-- en una base de pruebas), elimina el bloque DO de abajo de forma consciente.
-- =============================================================================

DO $$
BEGIN
  RAISE EXCEPTION 'Archivo bloqueado: este script borra TODOS los datos operativos. Ver cabecera.';
END
$$;

TRUNCATE TABLE public.reclamaciones, public.garantias_audit, public.garantias CASCADE;
