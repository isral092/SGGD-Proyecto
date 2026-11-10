import { supabase, createEphemeralClient } from '@/core/config/supabaseClient'
import type { NuevoEmpleadoInput } from '@/core/utils/schema'

export interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: string
  activo: boolean
  created_at: string
}

export const usuariosRepo = {
  async getPerfiles(): Promise<Perfil[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data as Perfil[]
  },

  async crearEmpleado(nuevo: NuevoEmpleadoInput): Promise<void> {
    const emailNormalizado = nuevo.email.trim().toLowerCase()

    // 1. Verificación previa en profiles para respuesta inmediata
    const { data: usuarioExistente } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailNormalizado)
      .maybeSingle()

    if (usuarioExistente) {
      throw new Error('Este correo electrónico ya se encuentra registrado en el sistema')
    }

    const authClient = createEphemeralClient()
    const { data, error } = await authClient.auth.signUp({
      email: emailNormalizado,
      password: nuevo.password,
      options: {
        data: {
          nombre: nuevo.nombre.trim(),
          rol: nuevo.rol,
        },
      },
    })

    if (error) {
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.status === 422
      ) {
        throw new Error('Este correo electrónico ya se encuentra registrado en el sistema')
      }
      throw error
    }

    // 2. Detección de ofuscación de Supabase (cuando el usuario ya existe y no lanza error)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Este correo electrónico ya se encuentra registrado en el sistema')
    }

    if (data.user) {
      // Sincronizar explícitamente en la tabla profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: emailNormalizado,
        nombre: nuevo.nombre.trim(),
        rol: nuevo.rol,
        activo: true,
      })

      if (profileError) {
        console.warn('Nota al sincronizar perfil:', profileError.message)
      }
    }
  },

  async updateRol(userId: string, nuevoRol: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ rol: nuevoRol })
      .eq('id', userId)
      .select('id, rol')

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('No se pudo actualizar el rol. Verifica tus permisos de administrador en Supabase (RLS).')
    }
  },

  async getPerfilById(userId: string): Promise<Perfil> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('El perfil no existe en la base de datos. Contacta al administrador.')
      }
      throw error
    }
    return data as Perfil
  }
}
