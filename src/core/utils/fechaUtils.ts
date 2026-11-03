export type EstadoVigencia = 'ACTIVA' | 'POR VENCER' | 'VENCIDA'

/**
 * Devuelve la fecha actual en la zona horaria local en formato 'YYYY-MM-DD'.
 * Evita el bug de `new Date().toISOString().slice(0, 10)` que después de las 18:00 hrs (UTC-6)
 * adelanta la fecha al día siguiente.
 */
export function obtenerFechaHoyISO(fechaReferencia: Date = new Date()): string {
  const anio = fechaReferencia.getFullYear()
  const mes = String(fechaReferencia.getMonth() + 1).padStart(2, '0')
  const dia = String(fechaReferencia.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/**
 * Parsea una fecha 'YYYY-MM-DD' o ISO en una instancia Date a medianoche en hora local,
 * evitando el desfase de huso horario de `new Date('YYYY-MM-DD')` (que JS interpreta como UTC).
 * Retorna un Invalid Date si el formato o los días del mes no existen (ej. 2026-02-31).
 */
export function parsearFechaLocal(fechaStr: string): Date {
  if (!fechaStr) return new Date(NaN)
  const match = fechaStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return new Date(NaN)

  const anio = Number(match[1])
  const mes = Number(match[2])
  const dia = Number(match[3])

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return new Date(NaN)
  }

  const fecha = new Date(anio, mes - 1, dia, 0, 0, 0, 0)
  // Verificar que JS no haya desbordado el mes (ej. 31 de febrero -> 3 de marzo)
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return new Date(NaN)
  }

  return fecha
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

/**
 * Calcula la fecha de vencimiento ('YYYY-MM-DD') sumando `duracionMeses` a `fechaVenta`
 * en hora local sin el desfase de un día por UTC y ajustando correctamente fines de mes
 * (ej. 31 de agosto + 6 meses -> 28 de febrero, no 3 de marzo).
 */
export function calcularFechaVencimiento(fechaVenta: string, duracionMeses: number): string {
  if (!fechaVenta) return 'Esperando fecha...'
  const d = parsearFechaLocal(fechaVenta)
  if (isNaN(d.getTime()) || duracionMeses <= 0) return 'Fecha inválida'

  const diaOriginal = d.getDate()
  const mesDestino = d.getMonth() + duracionMeses
  // Ir al día 1 del mes destino y luego ajustar al último día si el mes destino tiene menos días
  const resultado = new Date(d.getFullYear(), mesDestino, 1, 0, 0, 0, 0)
  const ultimoDiaMesDestino = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0
  ).getDate()
  resultado.setDate(Math.min(diaOriginal, ultimoDiaMesDestino))

  const anio = resultado.getFullYear()
  const mes = String(resultado.getMonth() + 1).padStart(2, '0')
  const dia = String(resultado.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}
