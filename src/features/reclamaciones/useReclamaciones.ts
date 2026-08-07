import { ref } from 'vue'
import { reclamacionesRepo, type Reclamacion } from './reclamacionesRepo'

export function useReclamaciones() {
  const reclamaciones = ref<Reclamacion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadReclamaciones = async () => {
    loading.value = true
    error.value = null
    try {
      reclamaciones.value = await reclamacionesRepo.getReclamaciones()
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Error al cargar reclamaciones'
      }
    } finally {
      loading.value = false
    }
  }
  
  const enviarReclamacion = async (reclamacion: Reclamacion) => {
    loading.value = true
    error.value = null
    try {
      await reclamacionesRepo.insertReclamacion(reclamacion)
      return true
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Error desconocido al enviar reclamación'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    reclamaciones,
    loading,
    error,
    loadReclamaciones,
    enviarReclamacion
  }
}
