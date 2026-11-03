import { ref } from 'vue'

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
      error.value = err instanceof Error ? err.message : 'Error desconocido'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, successMessage, execute }
}
