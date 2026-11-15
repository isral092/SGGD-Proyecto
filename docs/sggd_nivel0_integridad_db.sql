-- =============================================================================
-- SGGD - NIVEL 0: INTEGRIDAD Y ENDURECIMIENTO FINAL DE LA BASE DE DATOS
-- =============================================================================
-- Incluye limpieza de datos de prueba en garantias/reclamaciones/auditoria
-- (conservando intactos los usuarios en public.profiles) para que todas las
-- restricciones CHECK e indices unicos entren 100% validados (convalidated = true).
-- =============================================================================

BEGIN;

-- 0.0 Limpieza de registros de prueba (conserva public.profiles intacto)
TRUNCATE TABLE public.reclamaciones, public.garantias_audit, public.garantias CASCADE;

-- 0.1 RLS activo en las 4 tablas (idempotente). Importante para garantias_audit,
--     que ya no tiene politicas: con RLS activo queda cerrada; sin RLS quedaria abierta.
ALTER TABLE public.garantias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garantias_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamaciones   ENABLE ROW LEVEL SECURITY;

-- 0.2 is_admin_check: un admin INACTIVO deja de ser admin.
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND rol = 'admin'
      AND COALESCE(activo, true)
  );
$$;

-- 0.3 Unicidad real del numero de serie.
CREATE UNIQUE INDEX IF NOT EXISTS garantias_numero_serie_uniq
  ON public.garantias (upper(btrim(numero_serie)));

-- 0.4 Estados validos de reclamacion + limites sobre texto que envia un anonimo.
ALTER TABLE public.reclamaciones DROP CONSTRAINT IF EXISTS reclamaciones_estado_reclamacion_check;
ALTER TABLE public.reclamaciones DROP CONSTRAINT IF EXISTS reclamaciones_estado_check;
ALTER TABLE public.reclamaciones
  ADD CONSTRAINT reclamaciones_estado_check
  CHECK (estado_reclamacion IN ('pendiente', 'en_revision', 'resuelta', 'rechazada'));

-- La URL de evidencia la escribe un anonimo y luego la abre el personal:
-- solo se admiten http(s). Evita 'javascript:' y similares.
ALTER TABLE public.reclamaciones DROP CONSTRAINT IF EXISTS reclamaciones_evidencia_url_check;
ALTER TABLE public.reclamaciones
  ADD CONSTRAINT reclamaciones_evidencia_url_check
  CHECK (evidencia_url IS NULL OR (evidencia_url ~* '^https?://' AND length(evidencia_url) <= 500));

ALTER TABLE public.reclamaciones DROP CONSTRAINT IF EXISTS reclamaciones_texto_check;
ALTER TABLE public.reclamaciones
  ADD CONSTRAINT reclamaciones_texto_check
  CHECK (
    length(btrim(motivo_reclamacion)) > 0
    AND length(motivo_reclamacion) <= 300
    AND (descripcion_detallada IS NULL OR length(descripcion_detallada) <= 3000)
  );

-- 0.5 El anonimo no puede fijar campos de gestion interna al crear la reclamacion.
DROP POLICY IF EXISTS "Reclamacion controlada" ON public.reclamaciones;
CREATE POLICY "Reclamacion controlada"
  ON public.reclamaciones
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    estado_reclamacion = 'pendiente'
    AND notas_tecnico IS NULL
    AND fecha_resolucion IS NULL
    AND public.garantia_vigente(garantia_id)
  );

-- 0.6 El personal solo puede modificar campos de gestion (no el texto del cliente,
--     ni garantia_id). Privilegio por columna; las fechas las maneja el trigger 0.7.
REVOKE UPDATE ON public.reclamaciones FROM anon, authenticated;
GRANT UPDATE (estado_reclamacion, notas_tecnico) ON public.reclamaciones TO authenticated;

-- 0.7 Fechas de gestion controladas por el servidor (el cliente no las puede falsear).
CREATE OR REPLACE FUNCTION public.reclamaciones_gestion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.fecha_actualizacion := now();

  IF NEW.estado_reclamacion IN ('resuelta', 'rechazada')
     AND OLD.estado_reclamacion IS DISTINCT FROM NEW.estado_reclamacion THEN
    NEW.fecha_resolucion := now();
  ELSIF NEW.estado_reclamacion IN ('pendiente', 'en_revision') THEN
    NEW.fecha_resolucion := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reclamaciones_gestion ON public.reclamaciones;
CREATE TRIGGER trg_reclamaciones_gestion
  BEFORE UPDATE ON public.reclamaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.reclamaciones_gestion();

-- 0.8 profiles: reglas de baja segura.
CREATE OR REPLACE FUNCTION public.proteger_columnas_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sin usuario (SQL Editor / service_role): se permite.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Solo un admin puede cambiar rol, estado de cuenta o email.
  IF (NEW.rol IS DISTINCT FROM OLD.rol
      OR NEW.activo IS DISTINCT FROM OLD.activo
      OR NEW.email IS DISTINCT FROM OLD.email)
     AND NOT public.is_admin_check() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol, el estado o el email de la cuenta';
  END IF;

  -- Nadie puede cambiarse su propio rol ni desactivar su propia cuenta.
  IF NEW.id = auth.uid()
     AND (NEW.rol IS DISTINCT FROM OLD.rol
          OR (COALESCE(OLD.activo, true) AND NOT COALESCE(NEW.activo, true))) THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta';
  END IF;

  -- Siempre debe quedar al menos un administrador activo.
  IF OLD.rol = 'admin' AND COALESCE(OLD.activo, true)
     AND (NEW.rol IS DISTINCT FROM 'admin' OR NOT COALESCE(NEW.activo, true)) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE rol = 'admin' AND COALESCE(activo, true) AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Debe existir al menos un administrador activo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 0.9 Una sola reclamacion abierta por garantia (frena el spam sobre una misma garantia).
CREATE UNIQUE INDEX IF NOT EXISTS reclamaciones_una_abierta_por_garantia
  ON public.reclamaciones (garantia_id)
  WHERE estado_reclamacion IN ('pendiente', 'en_revision');

COMMIT;


-- =============================================================================
-- VERIFICACION (solo lectura)
-- =============================================================================

-- 1. RLS activo (las 4 filas deben tener relrowsecurity = true)
SELECT c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 2. Restricciones CHECK validadas (convalidated = true)
SELECT conrelid::regclass AS tabla, conname, convalidated
FROM pg_constraint
WHERE conname LIKE 'reclamaciones_%_check';

-- 3. Indices unicos creados
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('garantias_numero_serie_uniq', 'reclamaciones_una_abierta_por_garantia');
