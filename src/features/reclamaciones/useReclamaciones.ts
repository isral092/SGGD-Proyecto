import { ref } from 'vue'
import {
  reclamacionesRepo,
  type Reclamacion,
  type ReclamacionEstado,
} from './reclamacionesRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'

export type { Reclamacion, ReclamacionEstado }

/**
 * Valida estrictamente que una URL externa utilice protocolo HTTP/HTTPS seguro
 * para prevenir vectores XSS (ej. javascript:, data:, vbscript:).
 */
export function esUrlSegura(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const limpia = url.trim()
  if (!/^https?:\/\/\S+$/i.test(limpia)) return false
  try {
    const parsed = new URL(limpia)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function useReclamaciones() {
  const reclamaciones = ref<Reclamacion[]>([])
  const { loading, error, successMessage, execute } = useAsyncState()

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

  const cambiarEstadoReclamacion = async (
    id: string,
    nuevoEstado: ReclamacionEstado,
    notasTecnico?: string,
  ): Promise<boolean> => {
    const actualizada = await execute(
      () => reclamacionesRepo.updateEstadoReclamacion(id, nuevoEstado, notasTecnico),
      '✅ Estado de la reclamación actualizado correctamente',
    )

    if (actualizada) {
      const idx = reclamaciones.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        const actual = reclamaciones.value[idx]!
        reclamaciones.value[idx] = {
          ...actual,
          ...actualizada,
          garantias: actualizada.garantias ?? actual.garantias,
        }
      }
      return true
    }
    return false
  }

  return {
    reclamaciones,
    loading,
    error,
    successMessage,
    loadReclamaciones,
    enviarReclamacion,
    cambiarEstadoReclamacion,
    esUrlSegura,
  }
}

