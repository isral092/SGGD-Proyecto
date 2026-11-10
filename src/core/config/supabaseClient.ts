import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno requeridas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Cliente efímero sin persistencia de sesión en localStorage.
 * Permite que un Administrador registre nuevas cuentas de empleados
 * mediante `signUp` sin sobrescribir ni cerrar su propia sesión activa.
 */
export const createEphemeralClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
