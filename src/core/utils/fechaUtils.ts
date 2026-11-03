export type EstadoVigencia = 'ACTIVA' | 'POR VENCER' | 'VENCIDA'

/**
 * Parsea una fecha 'YYYY-MM-DD' o ISO en una instancia Date a medianoche en hora local,
 * evitando el desfase de huso horario de `new Date('YYYY-MM-DD')` (que JS interpreta como UTC).
 */
export function parsearFechaLocal(fechaStr: string): Date {
  const soloFecha = fechaStr.slice(0, 10)
  const partes = soloFecha.split('-').map(Number)
  if (partes.length === 3 && !partes.some(isNaN)) {
    const [anio, mes, dia] = partes as [number, number, number]
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0)
  }
  const fallback = new Date(fechaStr)
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0)
}

/**
 * Calcula los días restantes entre la fecha de referencia (por defecto hoy) y la fecha de vencimiento.
 * - Si vence hoy, retorna 0.
 * - Si venció ayer, retorna -1.
 */
export function calcularDiasRestantes(fechaVencimiento: string, fechaReferencia: Date = new Date()): number {
  const hoyLocal = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate(),
    0, 0, 0, 0
  )
  const vencimientoLocal = parsearFechaLocal(fechaVencimiento)
  const diferenciaMs = vencimientoLocal.getTime() - hoyLocal.getTime()
  return Math.round(diferenciaMs / (1000 * 3600 * 24))
}

/**
 * Determina el estado de vigencia de una garantía a partir de su fecha de vencimiento.
 * - VENCIDA: < 0 días
 * - POR VENCER: entre 0 y 30 días
 * - ACTIVA: > 30 días
 */
export function obtenerEstadoVigencia(fechaVencimiento: string, fechaReferencia: Date = new Date()): EstadoVigencia {
  const dias = calcularDiasRestantes(fechaVencimiento, fechaReferencia)
  if (dias < 0) return 'VENCIDA'
  if (dias <= 30) return 'POR VENCER'
  return 'ACTIVA'
}

/**
 * Calcula la vigencia completa (estado y días restantes) en una sola llamada.
 */
export function calcularVigenciaGarantia(
  fechaVencimiento: string,
  fechaReferencia: Date = new Date()
): { estado: EstadoVigencia; diasRestantes: number } {
  const diasRestantes = calcularDiasRestantes(fechaVencimiento, fechaReferencia)
  const estado = obtenerEstadoVigencia(fechaVencimiento, fechaReferencia)
  return { estado, diasRestantes }
}

/**
 * Formatea una cadena de fecha ('YYYY-MM-DD' o ISO) en formato local 'es-ES' sin desfase UTC.
 */
export function formatearFecha(fecha?: string | null): string {
  if (!fecha) return 'N/A'
  const fechaLocal = parsearFechaLocal(fecha)
  if (isNaN(fechaLocal.getTime())) return 'N/A'
  return fechaLocal.toLocaleDateString('es-ES')
}
