import { supabase } from '@/core/config/supabaseClient'

export interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: string
  activo: boolean
}

export const usuariosRepo = {
  async getPerfiles(): Promise<Perfil[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Perfil[]
  },

  async updateRol(userId: string, nuevoRol: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ rol: nuevoRol })
      .eq('id', userId)

    if (error) throw error
  }
}
