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
      .limit(100)

    if (error) throw error
    return data as Reclamacion[]
  },

  async insertReclamacion(reclamacion: Reclamacion): Promise<void> {
    const { error } = await supabase.from('reclamaciones').insert([reclamacion])
    if (!error) return

    // Errores de BD con significado de negocio: se traducen para el formulario público.
    switch (error.code) {
      case '23505': // índice único reclamaciones_una_abierta_por_garantia
        throw new Error('Ya existe una reclamación en curso para este certificado.')
      case '42501': // RLS: la garantía no existe o ya no está vigente
        throw new Error('No se pudo registrar la reclamación. Verifica que la garantía siga vigente.')
      case '23514': // CHECK: estado, longitud de textos o URL de evidencia
        throw new Error(
          'Los datos de la reclamación no son válidos. Revisa el motivo, la descripción y la URL de evidencia.',
        )
      default:
        throw error
    }
  },
}
