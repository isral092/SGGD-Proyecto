import { describe, it, expect } from 'vitest'
import {
  obtenerFechaHoyISO,
  parsearFechaLocal,
  calcularDiasRestantes,
  obtenerEstadoVigencia,
  calcularVigenciaGarantia,
  formatearFecha,
  calcularFechaVencimiento,
} from '../fechaUtils'

describe('fechaUtils', () => {
  const fechaBase = new Date(2026, 7, 15, 14, 30, 0) // 15 de agosto de 2026, 14:30 hrs local

  it('obtenerFechaHoyISO respeta la fecha local incluso a las 23:30 hrs (cuando UTC ya es el dia siguiente)', () => {
    const nocheLocal = new Date(2026, 10, 2, 23, 30, 0) // 2 de noviembre 2026 a las 11:30 PM local
    expect(obtenerFechaHoyISO(nocheLocal)).toBe('2026-11-02')
  })

  it('parsearFechaLocal crea la fecha exacta en zona horaria local sin restar un dia por UTC', () => {
    const fecha = parsearFechaLocal('2026-08-15')
    expect(fecha.getFullYear()).toBe(2026)
    expect(fecha.getMonth()).toBe(7) // Agosto es 7 (0-indexed)
    expect(fecha.getDate()).toBe(15)
  })

  it('parsearFechaLocal rechaza fechas imposibles como 31 de febrero o mes 13', () => {
    expect(isNaN(parsearFechaLocal('2026-02-31').getTime())).toBe(true)
    expect(isNaN(parsearFechaLocal('2026-13-01').getTime())).toBe(true)
    expect(isNaN(parsearFechaLocal('2026-00-10').getTime())).toBe(true)
    expect(isNaN(parsearFechaLocal('texto-invalido').getTime())).toBe(true)
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
    expect(formatearFecha('2026-02-31')).toBe('N/A')
    expect(formatearFecha('2026-08-15')).toMatch(/15\/8\/2026|15\/08\/2026/)
  })

  it('calcularFechaVencimiento suma meses en hora local y ajusta fines de mes sin saltar al mes siguiente', () => {
    expect(calcularFechaVencimiento('2026-08-15', 12)).toBe('2027-08-15')
    expect(calcularFechaVencimiento('2026-01-10', 6)).toBe('2026-07-10')
    // Caso crítico de fin de mes: 31 de agosto + 6 meses debe ser 28 de febrero (no 3 de marzo)
    expect(calcularFechaVencimiento('2026-08-31', 6)).toBe('2027-02-28')
    // Año bisiesto: 29 de febrero 2024 + 12 meses debe ser 28 de febrero 2025 (no 1 de marzo)
    expect(calcularFechaVencimiento('2024-02-29', 12)).toBe('2025-02-28')
    expect(calcularFechaVencimiento('', 12)).toBe('Esperando fecha...')
    expect(calcularFechaVencimiento('fecha-invalida', 12)).toBe('Fecha inválida')
    expect(calcularFechaVencimiento('2026-02-31', 12)).toBe('Fecha inválida')
  })
})
