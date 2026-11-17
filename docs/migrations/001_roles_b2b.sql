-- =============================================================================
-- MIGRACIÓN DE ROLES PARA MODELO B2B CERRADO (SGGD)
-- Ejecutado con éxito en Supabase SQL Editor
-- =============================================================================

-- 1. Agregar 'empleado' al enum public.user_role si no existe
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'empleado';

-- 2. Cambiar el valor por defecto de la columna rol a 'empleado'
ALTER TABLE public.profiles ALTER COLUMN rol SET DEFAULT 'empleado'::public.user_role;

-- 3. Actualizar los usuarios existentes creados como 'cliente' a 'empleado'
UPDATE public.profiles
SET rol = 'empleado'::public.user_role
WHERE rol::text IN ('cliente', 'empresa');

-- 4. Actualizar el trigger handle_new_user() para que lea el rol del metadata
-- y solo ponga 'empleado' si no se especificó un rol diferente (ej. admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', new.email),
    COALESCE((new.raw_user_meta_data->>'rol')::public.user_role, 'empleado'::public.user_role)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol;
  RETURN NEW;
END;
$function$;
