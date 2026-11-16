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
