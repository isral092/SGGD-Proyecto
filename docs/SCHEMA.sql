-- =============================================================================
-- SGGD - ESQUEMA COMPLETO DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- Extraído de los catálogos reales (information_schema, pg_enum, pg_policies,
-- pg_proc, pg_constraint y pg_indexes) tras aplicar Nivel 0 de Integridad.
-- =============================================================================

-- 1. TIPOS ENUMERADOS (pg_enum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'garantia_estado') THEN
    CREATE TYPE public.garantia_estado AS ENUM ('activa', 'reclamada', 'vencida', 'cancelada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'empresa', 'cliente', 'empleado');
  END IF;
END
$$;

-- 2. TABLAS Y RESTRICCIONES (information_schema.columns & pg_constraint)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  nombre character varying NULL,
  rol public.user_role NOT NULL DEFAULT 'empleado'::public.user_role,
  empresa_id uuid NULL,
  activo boolean NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.garantias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_serie text NOT NULL,
  modelo_producto text NOT NULL,
  cliente_email text NOT NULL,
  fecha_venta date NULL DEFAULT CURRENT_DATE,
  duracion_meses integer NULL DEFAULT 12,
  fecha_vencimiento date NOT NULL,
  hash_certificado text NOT NULL,
  qr_url text NULL,
  estado public.garantia_estado NULL DEFAULT 'activa'::public.garantia_estado,
  created_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT garantias_pkey PRIMARY KEY (id),
  CONSTRAINT garantias_hash_certificado_key UNIQUE (hash_certificado)
);

CREATE TABLE IF NOT EXISTS public.garantias_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  garantia_id uuid NOT NULL,
  accion text NOT NULL,
  datos_anteriores jsonb NULL,
  datos_nuevos jsonb NULL,
  fecha_cambio timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT garantias_audit_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reclamaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  garantia_id uuid NOT NULL,
  motivo_reclamacion text NOT NULL,
  descripcion_detallada text NULL,
  evidencia_url text NULL,
  estado_reclamacion text NULL DEFAULT 'pendiente'::text,
  notas_tecnico text NULL,
  fecha_resolucion timestamp with time zone NULL,
  fecha_solicitud timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  fecha_actualizacion timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reclamaciones_pkey PRIMARY KEY (id),
  CONSTRAINT reclamaciones_garantia_id_fkey FOREIGN KEY (garantia_id) REFERENCES public.garantias (id),
  CONSTRAINT reclamaciones_estado_check CHECK (
    estado_reclamacion IN ('pendiente', 'en_revision', 'resuelta', 'rechazada')
  ),
  CONSTRAINT reclamaciones_evidencia_url_check CHECK (
    evidencia_url IS NULL OR (evidencia_url ~* '^https?://' AND length(evidencia_url) <= 500)
  ),
  CONSTRAINT reclamaciones_texto_check CHECK (
    length(btrim(motivo_reclamacion)) > 0
    AND length(motivo_reclamacion) <= 300
    AND (descripcion_detallada IS NULL OR length(descripcion_detallada) <= 3000)
  )
);

-- 3. ÍNDICES ÚNICOS DE INTEGRIDAD (pg_indexes)

CREATE UNIQUE INDEX IF NOT EXISTS garantias_numero_serie_uniq
  ON public.garantias (upper(btrim(numero_serie)));

CREATE UNIQUE INDEX IF NOT EXISTS reclamaciones_una_abierta_por_garantia
  ON public.reclamaciones (garantia_id)
  WHERE estado_reclamacion IN ('pendiente', 'en_revision');

-- 4. FUNCIONES Y RPC (pg_proc)

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

-- 5. TRIGGERS (auth.users, profiles, reclamaciones)

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

  IF (NEW.rol IS DISTINCT FROM OLD.rol
      OR NEW.activo IS DISTINCT FROM OLD.activo
      OR NEW.email IS DISTINCT FROM OLD.email)
     AND NOT public.is_admin_check() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol, el estado o el email de la cuenta';
  END IF;

  IF NEW.id = auth.uid()
     AND (NEW.rol IS DISTINCT FROM OLD.rol
          OR (COALESCE(OLD.activo, true) AND NOT COALESCE(NEW.activo, true))) THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta';
  END IF;

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

DROP TRIGGER IF EXISTS trg_proteger_columnas_profiles ON public.profiles;
CREATE TRIGGER trg_proteger_columnas_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_columnas_profiles();

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

-- 6. ROW LEVEL SECURITY (RLS) Y PRIVILEGIOS DE COLUMNA

ALTER TABLE public.garantias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garantias_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamaciones   ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE ON public.reclamaciones FROM anon, authenticated;
GRANT UPDATE (estado_reclamacion, notas_tecnico) ON public.reclamaciones TO authenticated;

-- Políticas de profiles
CREATE POLICY "Usuarios ven su propio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los perfiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin_check());

CREATE POLICY "Usuarios actualizan su perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Solo admins asignan roles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin_check())
  WITH CHECK (public.is_admin_check());

-- Políticas de garantias
CREATE POLICY "Staff registra garantias"
  ON public.garantias FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff ve garantias"
  ON public.garantias FOR SELECT TO authenticated
  USING (public.is_staff());

-- Políticas de reclamaciones
CREATE POLICY "Reclamacion controlada"
  ON public.reclamaciones FOR INSERT TO anon, authenticated
  WITH CHECK (
    estado_reclamacion = 'pendiente'
    AND notas_tecnico IS NULL
    AND fecha_resolucion IS NULL
    AND public.garantia_vigente(garantia_id)
  );

CREATE POLICY "Staff ve reclamaciones"
  ON public.reclamaciones FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff actualiza reclamaciones"
  ON public.reclamaciones FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
