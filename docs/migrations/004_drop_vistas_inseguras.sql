-- =============================================================================
-- SGGD - MIGRACIÓN 004: ELIMINACIÓN DE VISTAS INSEGURAS (SECURITY DEFINER)
-- =============================================================================
-- Elimina vistas heredadas de prototipos iniciales que omitían la cláusula
-- security_invoker = true y permitían evadir las políticas RLS de las tablas base.
-- El frontend consume las tablas directamente o funciones RPC controladas.
-- =============================================================================

DROP VIEW IF EXISTS public.garantias_activas_con_dias;
DROP VIEW IF EXISTS public.reclamaciones_pendientes;
DROP VIEW IF EXISTS public.profiles_activos;
