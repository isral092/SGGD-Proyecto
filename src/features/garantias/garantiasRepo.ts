import { supabase } from '@/core/config/supabaseClient'

export interface Garantia {
  id?: string
  numero_serie: string
  modelo_producto: string
  cliente_email: string
  fecha_venta: string
  fecha_vencimiento: string
  hash_certificado?: string
  qr_url?: string
  estado?: string
  created_at?: string
  dias_restantes?: number
  estado_vigencia?: string
}

export const garantiasRepo = {
  async insertGarantia(garantia: Garantia) {
    const numSerie = garantia.numero_serie.trim()

    // 1. Verificación previa de número de serie existente para respuesta inmediata y consistente
    const { data: garantiaExistente } = await supabase
      .from('garantias')
      .select('id')
      .eq('numero_serie', numSerie)
      .maybeSingle()

    if (garantiaExistente) {
      throw new Error('Este número de serie ya se encuentra registrado')
    }

    // 2. Inserción con captura de restricción UNIQUE en base de datos
    const { error } = await supabase.from('garantias').insert([garantia])
    if (error) {
      if (
        error.code === '23505' ||
        error.message.includes('unique constraint') ||
        error.message.includes('duplicate key')
      ) {
        throw new Error('Este número de serie ya está registrado')
      }
      throw error
    }
  },

  async getGarantias(): Promise<Garantia[]> {
    const { data, error } = await supabase
      .from('garantias')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data as Garantia[]
  },

  async getGarantiaByHash(hash: string): Promise<Garantia> {
    const { data, error } = await supabase
      .from('garantias')
      .select('*')
      .eq('hash_certificado', hash)
      .single()

    if (error || !data) {
      throw new Error('Certificado no válido o no existe')
    }
    return data as Garantia
  },

  async registrarAuditoria(garantiaId: string) {
    const { error } = await supabase.from('garantias_audit').insert([
      {
        garantia_id: garantiaId,
        accion: 'VERIFICADA',
        datos_nuevos: { verificacion: new Date().toISOString() },
      },
    ])
    // La auditoría no debe bloquear la visualización pública del certificado si RLS restringe el insert anónimo
    if (error) {
      console.warn('No se pudo registrar auditoría de verificación:', error.message)
    }
  }
}
