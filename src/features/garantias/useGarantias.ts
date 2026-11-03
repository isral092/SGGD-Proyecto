import { ref } from 'vue'
import { garantiasRepo, type Garantia } from './garantiasRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'
import { calcularDiasRestantes } from '@/core/utils/fechaUtils'

export function useGarantias() {
  const garantias = ref<Garantia[]>([])
  const garantiaActual = ref<Garantia | null>(null)
  const { loading, error, execute } = useAsyncState()

  const loadGarantias = async () => {
    const data = await execute(() => garantiasRepo.getGarantias())
    if (data) garantias.value = data
  }

  const verificarGarantia = async (hash: string) => {
    garantiaActual.value = null
    const data = await execute(async () => {
      const hashLimpio = hash.trim()
      if (!hashLimpio) {
        throw new Error('Certificado no válido o no existe')
      }
      const g = await garantiasRepo.getGarantiaByHash(hashLimpio)

      const dias = calcularDiasRestantes(g.fecha_vencimiento)
      if (dias < 0) {
        g.estado_vigencia = 'VENCIDA'
      } else {
        g.estado_vigencia = 'ACTIVA'
        g.dias_restantes = dias
      }

      if (g.id) {
        try {
          await garantiasRepo.registrarAuditoria(g.id)
        } catch {
          // Ignorar fallos de red en auditoría para no bloquear la verificación al cliente
        }
      }
      return g
    })
    
    if (data) garantiaActual.value = data
  }

  const registrarGarantia = async (garantiaData: Garantia) => {
    const success = await execute(async () => {
      await garantiasRepo.insertGarantia(garantiaData)
      return true
    })
    return !!success
  }

  return {
    garantias,
    garantiaActual,
    loading,
    error,
    loadGarantias,
    verificarGarantia,
    registrarGarantia
  }
}
