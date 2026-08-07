import { supabase } from '@/core/config/supabaseClient'

export interface GarantiaBasica {
  numero_serie: string
  modelo_producto: string
  cliente_email: string
}

export interface Reclamacion {
  id?: string
  garantia_id: string
  motivo_reclamacion: string
  descripcion_detallada: string | null
  estado_reclamacion: string
  evidencia_url?: string
  fecha_solicitud?: string
  garantias?: GarantiaBasica | null
}

export const reclamacionesRepo = {
  async getReclamaciones(): Promise<Reclamacion[]> {
    const { data, error } = await supabase
      .from('reclamaciones')
      .select('*, garantias(numero_serie, modelo_producto, cliente_email)')
      .order('fecha_solicitud', { ascending: false })

    if (error) throw error
    return data as Reclamacion[]
  },

  async insertReclamacion(reclamacion: Reclamacion): Promise<void> {
    const { error } = await supabase.from('reclamaciones').insert([reclamacion])
    if (error) throw error
  }
}
