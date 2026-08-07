import { ref } from 'vue'
import { garantiasRepo, type Garantia } from './garantiasRepo'

export function useGarantias() {
  const garantias = ref<Garantia[]>([])
  const garantiaActual = ref<Garantia | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadGarantias = async () => {
    loading.value = true
    error.value = null
    try {
      garantias.value = await garantiasRepo.getGarantias()
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Error al cargar garantías'
      }
    } finally {
      loading.value = false
    }
  }

  const verificarGarantia = async (hash: string) => {
    loading.value = true
    error.value = null
    try {
      const data = await garantiasRepo.getGarantiaByHash(hash)
      
      const hoy = new Date()
      const vencimiento = new Date(data.fecha_vencimiento)

      if (hoy > vencimiento) {
        data.estado_vigencia = 'VENCIDA'
      } else {
        data.estado_vigencia = 'ACTIVA'
        const diferencia = vencimiento.getTime() - hoy.getTime()
        data.dias_restantes = Math.ceil(diferencia / (1000 * 3600 * 24))
      }

      garantiaActual.value = data
      
      if (data.id) {
        await garantiasRepo.registrarAuditoria(data.id)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = `Error al verificar: ${err.message}`
      } else {
        error.value = 'Ocurrió un error desconocido'
      }
    } finally {
      loading.value = false
    }
  }

  const registrarGarantia = async (garantiaData: Garantia) => {
    loading.value = true
    error.value = null
    try {
      await garantiasRepo.insertGarantia(garantiaData)
      return true
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Error desconocido al registrar'
      }
      return false
    } finally {
      loading.value = false
    }
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
