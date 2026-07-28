import { describe, it, expect } from 'vitest'
import { generarHashGarantia } from '../cryptoUtils'

describe('generarHashGarantia', () => {
  it('genera un hash SHA-256 determinístico', () => {
    const hash = generarHashGarantia('SN-990', 'cliente@ejemplo.com')
    expect(hash).toHaveLength(64)
    expect(hash).toBe(generarHashGarantia('SN-990', 'cliente@ejemplo.com'))
  })

  it('produce hashes distintos para datos distintos', () => {
    const a = generarHashGarantia('SN-001', 'a@test.com')
    const b = generarHashGarantia('SN-002', 'b@test.com')
    expect(a).not.toBe(b)
  })
})
