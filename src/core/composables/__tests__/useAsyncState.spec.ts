import { describe, it, expect } from 'vitest'
import { useAsyncState } from '../useAsyncState'

describe('useAsyncState', () => {
  it('gestiona el estado de exito y asigna successMessage opcional cuando la promesa se resuelve', async () => {
    const { loading, error, successMessage, execute } = useAsyncState()

    const resultado = await execute(async () => {
      expect(loading.value).toBe(true)
      return { ok: true }
    }, 'Operación exitosa')

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(successMessage.value).toBe('Operación exitosa')
    expect(resultado).toEqual({ ok: true })
  })

  it('captura errores, limpia successMessage y retorna null cuando la promesa falla', async () => {
    const { loading, error, successMessage, execute } = useAsyncState()

    // Primero un éxito previo
    await execute(async () => true, 'Éxito previo')
    expect(successMessage.value).toBe('Éxito previo')

    // Luego una falla
    const resultado = await execute(async () => {
      throw new Error('Fallo de conexión')
    }, 'No debería asignarse')

    expect(loading.value).toBe(false)
    expect(resultado).toBeNull()
    expect(error.value).toBe('Fallo de conexión')
    expect(successMessage.value).toBeNull()
  })
})
