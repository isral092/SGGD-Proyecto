import { supabase } from '@/core/config/supabaseClient'

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

  async updateRol(userId: string, nuevoRol: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ rol: nuevoRol })
      .eq('id', userId)

    if (error) throw error
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
