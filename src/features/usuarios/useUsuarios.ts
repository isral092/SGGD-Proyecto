import { ref } from 'vue'
import { usuariosRepo, type Perfil } from './usuariosRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'
import type { NuevoEmpleadoInput } from '@/core/utils/schema'

export function useUsuarios() {
  const perfiles = ref<Perfil[]>([])
  const miPerfil = ref<Perfil | null>(null)
  const { loading, error, successMessage, execute } = useAsyncState()

  const loadPerfiles = async () => {
    const data = await execute(() => usuariosRepo.getPerfiles())
    if (data) perfiles.value = data
  }

  const registrarEmpleado = async (nuevo: NuevoEmpleadoInput): Promise<boolean> => {
    const success = await execute(async () => {
      await usuariosRepo.crearEmpleado(nuevo)
      await loadPerfiles()
      return true
    }, '✅ Empleado registrado exitosamente')
    return !!success
  }

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    const success = await execute(async () => {
      await usuariosRepo.updateRol(userId, nuevoRol)
      return true
    }, '✅ Rol actualizado correctamente')
    
    if (success) {
      const perfil = perfiles.value.find(p => p.id === userId)
      if (perfil) perfil.rol = nuevoRol
    }
  }

  const loadMiPerfil = async (userId: string) => {
    const data = await execute(() => usuariosRepo.getPerfilById(userId))
    if (data) miPerfil.value = data
  }

  return {
    perfiles,
    miPerfil,
    loading,
    error,
    successMessage,
    loadPerfiles,
    cambiarRol,
    loadMiPerfil,
    registrarEmpleado,
  }
}
