import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReclamaciones, esUrlSegura } from '../useReclamaciones'
import { reclamacionesRepo, type Reclamacion } from '../reclamacionesRepo'

vi.mock('../reclamacionesRepo', () => ({
  reclamacionesRepo: {
    getReclamaciones: vi.fn(),
    insertReclamacion: vi.fn(),
    updateEstadoReclamacion: vi.fn(),
  },
}))

const reclamacionMock: Reclamacion = {
  id: 'rec-001',
  garantia_id: 'gar-001',
  motivo_reclamacion: 'averia',
  descripcion_detallada: 'La pantalla parpadea',
  estado_reclamacion: 'pendiente',
  evidencia_url: 'https://ejemplo.com/evidencia.jpg',
  notas_tecnico: null,
  fecha_resolucion: null,
  garantias: {
    numero_serie: 'SN-2026-001',
    modelo_producto: 'Monitor Pro 27',
    cliente_email: 'cliente@ejemplo.com',
  },
}

describe('esUrlSegura (prevención XSS)', () => {
  it('acepta URLs válidas con protocolo https y http', () => {
    expect(esUrlSegura('https://ejemplo.com/foto.jpg')).toBe(true)
    expect(esUrlSegura('http://cdn.ejemplo.com/video.mp4?token=123')).toBe(true)
    expect(esUrlSegura('  https://ejemplo.com/archivo.pdf  ')).toBe(true)
  })

  it('rechaza vectores XSS con protocolos peligrosos (javascript:, data:, vbscript:)', () => {
    expect(esUrlSegura('javascript:alert(document.cookie)')).toBe(false)
    expect(esUrlSegura('JAVASCRIPT:alert(1)')).toBe(false)
    expect(esUrlSegura('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(esUrlSegura('vbscript:msgbox("xss")')).toBe(false)
    expect(esUrlSegura('file:///etc/passwd')).toBe(false)
  })

  it('rechaza valores nulos, indefinidos, vacíos o mal formados', () => {
    expect(esUrlSegura(null)).toBe(false)
    expect(esUrlSegura(undefined)).toBe(false)
    expect(esUrlSegura('')).toBe(false)
    expect(esUrlSegura('   ')).toBe(false)
    expect(esUrlSegura('https://')).toBe(false)
    expect(esUrlSegura('https://ejemplo.com/con espacios internos')).toBe(false)
  })
})

describe('useReclamaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cambiarEstadoReclamacion actualiza la reclamación en memoria preservando datos de garantía', async () => {
    vi.mocked(reclamacionesRepo.getReclamaciones).mockResolvedValueOnce([
      { ...reclamacionMock },
    ])
    vi.mocked(reclamacionesRepo.updateEstadoReclamacion).mockResolvedValueOnce({
      id: 'rec-001',
      garantia_id: 'gar-001',
      motivo_reclamacion: 'averia',
      descripcion_detallada: 'La pantalla parpadea',
      estado_reclamacion: 'resuelta',
      notas_tecnico: 'Cambio de panel LCD realizado',
      fecha_resolucion: '2026-11-16T15:30:00Z',
    })

    const {
      reclamaciones,
      successMessage,
      error,
      loadReclamaciones,
      cambiarEstadoReclamacion,
    } = useReclamaciones()

    await loadReclamaciones()
    const exito = await cambiarEstadoReclamacion(
      'rec-001',
      'resuelta',
      'Cambio de panel LCD realizado',
    )

    expect(exito).toBe(true)
    expect(error.value).toBeNull()
    expect(successMessage.value).toContain('actualizado correctamente')
    expect(reclamaciones.value[0]?.estado_reclamacion).toBe('resuelta')
    expect(reclamaciones.value[0]?.notas_tecnico).toBe('Cambio de panel LCD realizado')
    expect(reclamaciones.value[0]?.fecha_resolucion).toBe('2026-11-16T15:30:00Z')
    expect(reclamaciones.value[0]?.garantias?.numero_serie).toBe('SN-2026-001')
  })

  it('cambiarEstadoReclamacion devuelve false y registra error cuando falla el repositorio', async () => {
    vi.mocked(reclamacionesRepo.getReclamaciones).mockResolvedValueOnce([
      { ...reclamacionMock },
    ])
    vi.mocked(reclamacionesRepo.updateEstadoReclamacion).mockRejectedValueOnce(
      new Error('No tienes permisos para actualizar esta reclamación.'),
    )

    const {
      reclamaciones,
      error,
      loadReclamaciones,
      cambiarEstadoReclamacion,
    } = useReclamaciones()

    await loadReclamaciones()
    const exito = await cambiarEstadoReclamacion('rec-001', 'rechazada', 'Fuera de cobertura')

    expect(exito).toBe(false)
    expect(error.value).toBe('No tienes permisos para actualizar esta reclamación.')
    expect(reclamaciones.value[0]?.estado_reclamacion).toBe('pendiente')
  })
})
