import { ref } from 'vue'
import { garantiasRepo, type Garantia } from './garantiasRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'

export function useGarantias() {
  const garantias = ref<Garantia[]>([])
  const garantiaActual = ref<Garantia | null>(null)
  const { loading, error, execute } = useAsyncState()

  const loadGarantias = async () => {
    const data = await execute(() => garantiasRepo.getGarantias())
    if (data) garantias.value = data
  }

  const verificarGarantia = async (hash: string) => {
    const data = await execute(async () => {
      const g = await garantiasRepo.getGarantiaByHash(hash)
      
      const hoy = new Date()
      const vencimiento = new Date(g.fecha_vencimiento)

      if (hoy > vencimiento) {
        g.estado_vigencia = 'VENCIDA'
      } else {
        g.estado_vigencia = 'ACTIVA'
        const diferencia = vencimiento.getTime() - hoy.getTime()
        g.dias_restantes = Math.ceil(diferencia / (1000 * 3600 * 24))
      }

      if (g.id) {
        await garantiasRepo.registrarAuditoria(g.id)
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
