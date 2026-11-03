import { ref } from 'vue'

export function extraerMensajeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim().length > 0) return msg
  }
  if (typeof err === 'string' && err.trim().length > 0) return err
  return 'Error desconocido'
}

export function useAsyncState() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  const execute = async <T>(
    fn: () => Promise<T>,
    msgExito?: string
  ): Promise<T | null> => {
    loading.value = true
    error.value = null
    successMessage.value = null
    try {
      const result = await fn()
      if (msgExito) {
        successMessage.value = msgExito
      }
      return result
    } catch (err: unknown) {
      error.value = extraerMensajeError(err)
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, successMessage, execute }
}
