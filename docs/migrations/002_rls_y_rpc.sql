-- =============================================================================
-- SGGD - ENDURECIMIENTO DE POLÍTICAS RLS, RPC Y TRIGGERS DE SEGURIDAD
-- =============================================================================
-- Protocolo de ejecución sin tiempo de caída (Zero-Downtime):
--   1. Ejecutar PARTE A en Supabase SQL Editor.
--   2. Desplegar los cambios de frontend (RPC verificar_garantia + update en crearEmpleado).
--   3. Ejecutar PARTE B en Supabase SQL Editor para revocar accesos anónimos abiertos.
--   4. Ejecutar el bloque de VERIFICACIÓN final.
-- =============================================================================

-- =============================================================================
-- PARTE A: HELPERS, PROTECCIÓN DE COLUMNAS, RPC Y RECLAMACIÓN CONTROLADA
-- (Es aditiva: convive con las políticas existentes sin romper nada)
-- =============================================================================
BEGIN;

-- A1. Helper is_staff: valida que el usuario esté autenticado, con rol válido y activo
CREATE OR REPLACE FUNCTION public.is_staff()
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
      AND rol IN ('admin', 'empleado')
      AND COALESCE(activo, true)
  );
$$;

-- A2. Helper garantia_vigente: valida que la garantía exista y no haya vencido (hora local México)
CREATE OR REPLACE FUNCTION public.garantia_vigente(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.garantias
    WHERE id = p_id
      AND fecha_vencimiento >= (now() AT TIME ZONE 'America/Mexico_City')::date
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garantia_vigente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.garantia_vigente(uuid) TO anon, authenticated;

-- A3. Trigger de protección: impide escalada de rol y auto-degradación de administradores
CREATE OR REPLACE FUNCTION public.proteger_columnas_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Solo admin puede cambiar rol o estado de cuenta activo
  IF (NEW.rol IS DISTINCT FROM OLD.rol OR NEW.activo IS DISTINCT FROM OLD.activo)
     AND NOT public.is_admin_check() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol o el estado de la cuenta';
  END IF;

  -- Un administrador no puede degradar su propio rol
  IF NEW.id = auth.uid()
     AND OLD.rol = 'admin'
     AND NEW.rol IS DISTINCT FROM OLD.rol THEN
    RAISE EXCEPTION 'Un administrador no puede cambiar su propio rol';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_columnas_profiles ON public.profiles;
CREATE TRIGGER trg_proteger_columnas_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_columnas_profiles();

-- A4. RPC de verificación pública: enmascara email en servidor y audita internamente
CREATE OR REPLACE FUNCTION public.verificar_garantia(p_hash text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.garantias%ROWTYPE;
BEGIN
  IF p_hash IS NULL OR length(trim(p_hash)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO g
  FROM public.garantias
  WHERE hash_certificado = trim(p_hash);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Auditoría automática interna desde el servidor
  INSERT INTO public.garantias_audit (garantia_id, accion, datos_nuevos)
  VALUES (g.id, 'VERIFICADA', jsonb_build_object('verificacion', now()));

  RETURN jsonb_build_object(
    'id', g.id,
    'numero_serie', g.numero_serie,
    'modelo_producto', g.modelo_producto,
    'cliente_email',
      CASE
        WHEN position('@' IN g.cliente_email) > 0 THEN
          left(split_part(g.cliente_email, '@', 1), 2) || '******@' ||
          split_part(g.cliente_email, '@', 2)
        ELSE 'Cliente registrado'
      END,
    'fecha_venta', g.fecha_venta,
    'fecha_vencimiento', g.fecha_vencimiento,
    'hash_certificado', g.hash_certificado
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_garantia(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_garantia(text) TO anon, authenticated;

-- A5. Política controlada para inserción de reclamaciones
DROP POLICY IF EXISTS "Reclamacion controlada" ON public.reclamaciones;
CREATE POLICY "Reclamacion controlada"
  ON public.reclamaciones
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    estado_reclamacion = 'pendiente'
    AND public.garantia_vigente(garantia_id)
  );

COMMIT;


-- =============================================================================
-- PARTE B: CIERRE DE BRECHAS Y RESTRICCIÓN ESTRICTA A STAFF ACTIVO
-- (Ejecutar en Supabase SQL Editor ÚNICAMENTE después de desplegar el frontend)
-- =============================================================================
BEGIN;

-- B1. Trigger de alta: nunca confiar en raw_user_meta_data para el rol.
-- Toda cuenta nueva nace inactiva (activo = false) como 'empleado'.
-- Solo un admin autenticado la activa mediante update en crearEmpleado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol, activo)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', new.email),
    'empleado'::public.user_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- B2. garantias: eliminar acceso anónimo abierto; restringir a staff activo
DROP POLICY IF EXISTS "Permitir registro publico" ON public.garantias;
DROP POLICY IF EXISTS "Permitir verificacion publica" ON public.garantias;
DROP POLICY IF EXISTS "Permitir registro a usuarios autenticados" ON public.garantias;
DROP POLICY IF EXISTS "Ver garantías desde reclamaciones" ON public.garantias;

CREATE POLICY "Staff registra garantias"
  ON public.garantias FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff ve garantias"
  ON public.garantias FOR SELECT TO authenticated
  USING (public.is_staff());

-- B3. reclamaciones: eliminar ALL anónimo abierto; lectura y actualización solo para staff activo
DROP POLICY IF EXISTS "Reclamaciones publicas" ON public.reclamaciones;
DROP POLICY IF EXISTS "Permitir reclamaciones a usuarios autenticados" ON public.reclamaciones;
DROP POLICY IF EXISTS "Ver reclamaciones autenticados" ON public.reclamaciones;

CREATE POLICY "Staff ve reclamaciones"
  ON public.reclamaciones FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff actualiza reclamaciones"
  ON public.reclamaciones FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- B4. garantias_audit: sin acceso directo. La RPC verificar_garantia audita internamente
DROP POLICY IF EXISTS "Auditoria publica" ON public.garantias_audit;
DROP POLICY IF EXISTS "Permitir insercion de auditoria publica" ON public.garantias_audit;
DROP POLICY IF EXISTS "Permitir auditoria a usuarios autenticados" ON public.garantias_audit;

COMMIT;


-- =============================================================================
-- VERIFICACIÓN FINAL (Ejecutar después del COMMIT de la PARTE B)
-- =============================================================================
BEGIN;
SET LOCAL ROLE anon;
-- Debe retornar 0 filas visibles:
SELECT count(*) AS garantias_visibles_anon FROM public.garantias;
SELECT count(*) AS reclamaciones_visibles_anon FROM public.reclamaciones;
-- Debe retornar NULL sin errores:
SELECT public.verificar_garantia('hash-inexistente') AS rpc_hash_falso;
ROLLBACK;

-- Consultar catálogo final de políticas activas:
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
