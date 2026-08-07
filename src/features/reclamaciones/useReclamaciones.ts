import { ref } from 'vue'
import { reclamacionesRepo, type Reclamacion } from './reclamacionesRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'

export function useReclamaciones() {
  const reclamaciones = ref<Reclamacion[]>([])
  const { loading, error, execute } = useAsyncState()

  const loadReclamaciones = async () => {
    const data = await execute(() => reclamacionesRepo.getReclamaciones())
    if (data) reclamaciones.value = data
  }

  const enviarReclamacion = async (reclamacionData: Omit<Reclamacion, 'id' | 'created_at'>) => {
    const success = await execute(async () => {
      await reclamacionesRepo.insertReclamacion(reclamacionData as Reclamacion)
      return true
    })
    return !!success
  }

  return {
    reclamaciones,
    loading,
    error,
    loadReclamaciones,
    enviarReclamacion
  }
}
