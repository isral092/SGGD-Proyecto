import { ref } from 'vue'
import { usuariosRepo, type Perfil } from './usuariosRepo'
import { useAsyncState } from '@/core/composables/useAsyncState'

export function useUsuarios() {
  const perfiles = ref<Perfil[]>([])
  const miPerfil = ref<Perfil | null>(null)
  const { loading, error, successMessage, execute } = useAsyncState()

  const loadPerfiles = async () => {
    const data = await execute(() => usuariosRepo.getPerfiles())
    if (data) perfiles.value = data
  }

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    const success = await execute(async () => {
      await usuariosRepo.updateRol(userId, nuevoRol)
      return true
    })
    
    if (success) {
      const perfil = perfiles.value.find(p => p.id === userId)
      if (perfil) perfil.rol = nuevoRol
      successMessage.value = '✅ Rol actualizado correctamente'
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
    loadMiPerfil
  }
}
