import { describe, it, expect, vi, beforeEach } from 'vitest'
import { garantiasRepo } from '../garantiasRepo'
import { supabase } from '@/core/config/supabaseClient'

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

describe('garantiasRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGarantiaByHash (RPC verificar_garantia)', () => {
    it('invoca supabase.rpc("verificar_garantia") con el hash limpio y retorna el certificado', async () => {
      const mockCertificado = {
        id: '11111111-1111-1111-1111-111111111111',
        numero_serie: 'SN-999',
        modelo_producto: 'Galaxy S25',
        cliente_email: 'cl******@test.com',
        fecha_venta: '2026-01-10',
        fecha_vencimiento: '2027-01-10',
        hash_certificado: 'abc123hash',
      }

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockCertificado,
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>)

      const resultado = await garantiasRepo.getGarantiaByHash('  abc123hash  ')

      expect(supabase.rpc).toHaveBeenCalledWith('verificar_garantia', { p_hash: 'abc123hash' })
      expect(resultado).toEqual(mockCertificado)
    })

    it('lanza error "Certificado no válido o no existe" cuando la RPC devuelve null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>)

      await expect(garantiasRepo.getGarantiaByHash('hash-falso')).rejects.toThrow(
        'Certificado no válido o no existe',
      )
    })

    it('lanza error "Certificado no válido o no existe" cuando la RPC devuelve error de BD', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Error interno',
          code: 'PGRST000',
        },
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>)

      await expect(garantiasRepo.getGarantiaByHash('hash-error')).rejects.toThrow(
        'Certificado no válido o no existe',
      )
    })
  })

  describe('insertGarantia (unicidad de número de serie)', () => {
    it('rechaza números de serie duplicados detectados en la pre-consulta', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: { id: 'existente-id' },
        error: null,
      })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        garantiasRepo.insertGarantia({
          numero_serie: 'SN-DUPLICADO',
          modelo_producto: 'Monitor Pro',
          cliente_email: 'cliente@test.com',
          fecha_venta: '2026-05-01',
          fecha_vencimiento: '2027-05-01',
        }),
      ).rejects.toThrow('Este número de serie ya se encuentra registrado')
    })

    it('traduce el error 23505 del índice único garantias_numero_serie_uniq', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      const insertMock = vi.fn().mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        insert: insertMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        garantiasRepo.insertGarantia({
          numero_serie: 'SN-RACE',
          modelo_producto: 'Monitor Pro',
          cliente_email: 'cliente@test.com',
          fecha_venta: '2026-05-01',
          fecha_vencimiento: '2027-05-01',
        }),
      ).rejects.toThrow('Este número de serie ya está registrado')
    })
  })
})
