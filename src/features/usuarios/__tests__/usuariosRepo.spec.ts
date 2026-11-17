import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usuariosRepo } from '../usuariosRepo'
import { supabase, createEphemeralClient } from '@/core/config/supabaseClient'

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
  createEphemeralClient: vi.fn(),
}))

describe('usuariosRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('crearEmpleado', () => {
    it('lanza error si el update de activación en profiles afecta 0 filas (bloqueo RLS)', async () => {
      // 1. Pre-consulta devuelve null (no existe aún)
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: null, error: null })
      const eqSelectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectPreMock = vi.fn().mockReturnValue({ eq: eqSelectMock })

      // 2. signUp efímero crea el usuario
      const signUpMock = vi.fn().mockResolvedValueOnce({
        data: {
          user: {
            id: 'nuevo-user-uuid',
            identities: [{ id: 'id-1' }],
          },
        },
        error: null,
      })
      vi.mocked(createEphemeralClient).mockReturnValue({
        auth: { signUp: signUpMock },
      } as unknown as ReturnType<typeof createEphemeralClient>)

      // 3. update en profiles devuelve [] (0 filas afectadas por RLS)
      const selectUpdateMock = vi.fn().mockResolvedValueOnce({ data: [], error: null })
      const eqUpdateMock = vi.fn().mockReturnValue({ select: selectUpdateMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectPreMock,
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        usuariosRepo.crearEmpleado({
          nombre: 'Ana Empleada',
          email: 'ana@empresa.com',
          password: 'password123',
          rol: 'empleado',
        }),
      ).rejects.toThrow(
        'No se pudo activar el perfil del empleado. Verifica tus permisos de administrador (RLS).',
      )
    })

    it('lanza error si el update de activación en profiles devuelve error de PostgreSQL', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: null, error: null })
      const eqSelectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectPreMock = vi.fn().mockReturnValue({ eq: eqSelectMock })

      const signUpMock = vi.fn().mockResolvedValueOnce({
        data: {
          user: {
            id: 'nuevo-user-uuid',
            identities: [{ id: 'id-1' }],
          },
        },
        error: null,
      })
      vi.mocked(createEphemeralClient).mockReturnValue({
        auth: { signUp: signUpMock },
      } as unknown as ReturnType<typeof createEphemeralClient>)

      const selectUpdateMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Solo un administrador puede cambiar el rol o el estado de la cuenta' },
      })
      const eqUpdateMock = vi.fn().mockReturnValue({ select: selectUpdateMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectPreMock,
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        usuariosRepo.crearEmpleado({
          nombre: 'Ana Empleada',
          email: 'ana@empresa.com',
          password: 'password123',
          rol: 'empleado',
        }),
      ).rejects.toThrow(
        'Error al activar el empleado: Solo un administrador puede cambiar el rol o el estado de la cuenta',
      )
    })

    it('detecta correos duplicados cuando Supabase ofusca la respuesta devolviendo identities vacío', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: null, error: null })
      const eqSelectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectPreMock = vi.fn().mockReturnValue({ eq: eqSelectMock })

      const signUpMock = vi.fn().mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-ofuscado',
            identities: [],
          },
        },
        error: null,
      })
      vi.mocked(createEphemeralClient).mockReturnValue({
        auth: { signUp: signUpMock },
      } as unknown as ReturnType<typeof createEphemeralClient>)

      vi.mocked(supabase.from).mockReturnValue({
        select: selectPreMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        usuariosRepo.crearEmpleado({
          nombre: 'Repetido',
          email: 'repetido@empresa.com',
          password: 'password123',
          rol: 'empleado',
        }),
      ).rejects.toThrow('Este correo electrónico ya se encuentra registrado en el sistema')
    })
  })

  describe('updateRol', () => {
    it('lanza error si updateRol afecta 0 filas', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce({ data: [], error: null })
      const eqMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(usuariosRepo.updateRol('user-123', 'admin')).rejects.toThrow(
        'No se pudo actualizar el rol. Verifica tus permisos de administrador en Supabase (RLS).',
      )
    })
  })

  describe('setActivo', () => {
    it('envía únicamente la columna activo y encadena .select() al dar de baja o reactivar', async () => {
      const selectMock = vi
        .fn()
        .mockResolvedValueOnce({ data: [{ id: 'user-123', activo: false }], error: null })
      const eqMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(usuariosRepo.setActivo('user-123', false)).resolves.toBeUndefined()
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(updateMock).toHaveBeenCalledWith({ activo: false })
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
      expect(selectMock).toHaveBeenCalledWith('id, activo')
    })

    it('lanza error descriptivo si setActivo afecta 0 filas (bloqueo RLS o usuario inexistente)', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce({ data: [], error: null })
      const eqMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(usuariosRepo.setActivo('user-123', false)).rejects.toThrow(
        'No se pudo actualizar el estado del empleado. Verifica tus permisos de administrador en Supabase (RLS).',
      )
    })

    it('propaga el error de PostgreSQL si el trigger rechaza la baja (ej. auto-desactivación)', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('No puedes cambiar tu propio rol ni desactivar tu propia cuenta'),
      })
      const eqMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(usuariosRepo.setActivo('admin-actual', false)).rejects.toThrow(
        'No puedes cambiar tu propio rol ni desactivar tu propia cuenta',
      )
    })
  })
})

