import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reclamacionesRepo, type Reclamacion } from '../reclamacionesRepo'
import { supabase } from '@/core/config/supabaseClient'

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const reclamacionBase: Reclamacion = {
  garantia_id: '11111111-1111-1111-1111-111111111111',
  motivo_reclamacion: 'No enciende',
  descripcion_detallada: 'El equipo dejó de encender tras una semana',
  estado_reclamacion: 'pendiente',
}

function mockInsert(error: { code?: string; message: string } | null) {
  const insertMock = vi.fn().mockResolvedValueOnce({ error })
  vi.mocked(supabase.from).mockReturnValue({
    insert: insertMock,
  } as unknown as ReturnType<typeof supabase.from>)
  return insertMock
}

describe('reclamacionesRepo.insertReclamacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserta la reclamación y resuelve sin error', async () => {
    const insertMock = mockInsert(null)

    await expect(reclamacionesRepo.insertReclamacion(reclamacionBase)).resolves.toBeUndefined()
    expect(supabase.from).toHaveBeenCalledWith('reclamaciones')
    expect(insertMock).toHaveBeenCalledWith([reclamacionBase])
  })

  it('traduce 23505 (ya hay una reclamación abierta para la garantía)', async () => {
    mockInsert({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "reclamaciones_una_abierta_por_garantia"',
    })

    await expect(reclamacionesRepo.insertReclamacion(reclamacionBase)).rejects.toThrow(
      'Ya existe una reclamación en curso para este certificado.',
    )
  })

  it('traduce 42501 (RLS: garantía no vigente)', async () => {
    mockInsert({ code: '42501', message: 'new row violates row-level security policy' })

    await expect(reclamacionesRepo.insertReclamacion(reclamacionBase)).rejects.toThrow(
      'Verifica que la garantía siga vigente.',
    )
  })

  it('traduce 23514 (CHECK de estado, texto o URL de evidencia)', async () => {
    mockInsert({
      code: '23514',
      message: 'violates check constraint "reclamaciones_evidencia_url_check"',
    })

    await expect(reclamacionesRepo.insertReclamacion(reclamacionBase)).rejects.toThrow(
      'Los datos de la reclamación no son válidos.',
    )
  })

  it('propaga sin traducir los errores desconocidos', async () => {
    mockInsert({ code: '08006', message: 'connection failure' })

    await expect(reclamacionesRepo.insertReclamacion(reclamacionBase)).rejects.toMatchObject({
      code: '08006',
    })
  })
})

function mockUpdate(
  data: Reclamacion[] | null,
  error: { code?: string; message: string } | null = null,
) {
  const selectMock = vi.fn().mockResolvedValueOnce({ data, error })
  const eqMock = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  vi.mocked(supabase.from).mockReturnValue({
    update: updateMock,
  } as unknown as ReturnType<typeof supabase.from>)
  return { updateMock, eqMock, selectMock }
}

describe('reclamacionesRepo.updateEstadoReclamacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía únicamente estado_reclamacion cuando no se pasan notas y devuelve la fila actualizada', async () => {
    const filaActualizada: Reclamacion = {
      ...reclamacionBase,
      id: 'rec-123',
      estado_reclamacion: 'en_revision',
    }
    const { updateMock, eqMock, selectMock } = mockUpdate([filaActualizada])

    const resultado = await reclamacionesRepo.updateEstadoReclamacion('rec-123', 'en_revision')

    expect(supabase.from).toHaveBeenCalledWith('reclamaciones')
    expect(updateMock).toHaveBeenCalledWith({ estado_reclamacion: 'en_revision' })
    expect(eqMock).toHaveBeenCalledWith('id', 'rec-123')
    expect(selectMock).toHaveBeenCalled()
    expect(resultado).toEqual(filaActualizada)
  })

  it('incluye notas_tecnico recortadas cuando se proporcionan', async () => {
    const filaActualizada: Reclamacion = {
      ...reclamacionBase,
      id: 'rec-123',
      estado_reclamacion: 'resuelta',
      notas_tecnico: 'Se reemplazó la fuente de poder',
      fecha_resolucion: '2026-11-16T10:00:00Z',
    }
    const { updateMock } = mockUpdate([filaActualizada])

    const resultado = await reclamacionesRepo.updateEstadoReclamacion(
      'rec-123',
      'resuelta',
      '  Se reemplazó la fuente de poder  ',
    )

    expect(updateMock).toHaveBeenCalledWith({
      estado_reclamacion: 'resuelta',
      notas_tecnico: 'Se reemplazó la fuente de poder',
    })
    expect(resultado.fecha_resolucion).toBe('2026-11-16T10:00:00Z')
  })

  it('normaliza notas_tecnico vacías a null', async () => {
    const filaActualizada: Reclamacion = {
      ...reclamacionBase,
      id: 'rec-123',
      estado_reclamacion: 'rechazada',
      notas_tecnico: null,
    }
    const { updateMock } = mockUpdate([filaActualizada])

    await reclamacionesRepo.updateEstadoReclamacion('rec-123', 'rechazada', '   ')

    expect(updateMock).toHaveBeenCalledWith({
      estado_reclamacion: 'rechazada',
      notas_tecnico: null,
    })
  })

  it('lanza error descriptivo si .select() devuelve 0 filas afectadas (RLS o ID inexistente)', async () => {
    mockUpdate([], null)

    await expect(
      reclamacionesRepo.updateEstadoReclamacion('rec-inexistente', 'resuelta'),
    ).rejects.toThrow(
      'No se pudo actualizar la reclamación. Es posible que no exista o no tengas permisos (RLS).',
    )
  })

  it('traduce 23505 al intentar reabrir cuando ya existe otra reclamación abierta', async () => {
    mockUpdate(null, {
      code: '23505',
      message: 'duplicate key value violates unique constraint "reclamaciones_una_abierta_por_garantia"',
    })

    await expect(
      reclamacionesRepo.updateEstadoReclamacion('rec-123', 'pendiente'),
    ).rejects.toThrow('Ya existe una reclamación abierta para esta garantía.')
  })

  it('traduce 42501 (error de permisos RLS)', async () => {
    mockUpdate(null, {
      code: '42501',
      message: 'permission denied for table reclamaciones',
    })

    await expect(
      reclamacionesRepo.updateEstadoReclamacion('rec-123', 'resuelta'),
    ).rejects.toThrow('No tienes permisos para actualizar esta reclamación.')
  })

  it('traduce 23514 (violación de CHECK constraint)', async () => {
    mockUpdate(null, {
      code: '23514',
      message: 'violates check constraint "reclamaciones_estado_check"',
    })

    await expect(
      reclamacionesRepo.updateEstadoReclamacion('rec-123', 'resuelta'),
    ).rejects.toThrow('El estado o las notas técnicas no son válidos.')
  })
})

