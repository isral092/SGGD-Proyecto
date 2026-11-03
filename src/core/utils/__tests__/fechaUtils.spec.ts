import { describe, it, expect } from 'vitest'
import {
  parsearFechaLocal,
  calcularDiasRestantes,
  obtenerEstadoVigencia,
  calcularVigenciaGarantia,
  formatearFecha,
} from '../fechaUtils'

describe('fechaUtils', () => {
  const fechaBase = new Date(2026, 7, 15, 14, 30, 0) // 15 de agosto de 2026, 14:30 hrs local

  it('parsearFechaLocal crea la fecha exacta en zona horaria local sin restar un dia por UTC', () => {
    const fecha = parsearFechaLocal('2026-08-15')
    expect(fecha.getFullYear()).toBe(2026)
    expect(fecha.getMonth()).toBe(7) // Agosto es 7 (0-indexed)
    expect(fecha.getDate()).toBe(15)
  })

  it('calcularDiasRestantes devuelve 0 cuando vence el mismo dia (sin importar la hora actual)', () => {
    expect(calcularDiasRestantes('2026-08-15', fechaBase)).toBe(0)
  })

  it('calcularDiasRestantes devuelve dias positivos en el futuro y negativos en el pasado', () => {
    expect(calcularDiasRestantes('2026-08-25', fechaBase)).toBe(10)
    expect(calcularDiasRestantes('2026-08-14', fechaBase)).toBe(-1)
  })

  it('obtenerEstadoVigencia clasifica correctamente en VENCIDA, POR VENCER y ACTIVA', () => {
    expect(obtenerEstadoVigencia('2026-08-14', fechaBase)).toBe('VENCIDA')
    expect(obtenerEstadoVigencia('2026-08-15', fechaBase)).toBe('POR VENCER') // 0 días
    expect(obtenerEstadoVigencia('2026-09-14', fechaBase)).toBe('POR VENCER') // 30 días exactos
    expect(obtenerEstadoVigencia('2026-09-15', fechaBase)).toBe('ACTIVA') // 31 días
  })

  it('calcularVigenciaGarantia retorna tanto el estado como los dias restantes', () => {
    const res = calcularVigenciaGarantia('2026-08-20', fechaBase)
    expect(res).toEqual({
      estado: 'POR VENCER',
      diasRestantes: 5,
    })
  })

  it('formatearFecha devuelve N/A cuando no hay fecha o es invalida, y formatea correctamente', () => {
    expect(formatearFecha(undefined)).toBe('N/A')
    expect(formatearFecha('')).toBe('N/A')
    expect(formatearFecha('2026-08-15')).toMatch(/15\/8\/2026|15\/08\/2026/)
  })
})
