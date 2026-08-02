import { ref } from 'vue'
import { usuariosRepo, type Perfil } from './usuariosRepo'

export function useUsuarios() {
  const perfiles = ref<Perfil[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadPerfiles = async () => {
    loading.value = true
    error.value = null
    try {
      perfiles.value = await usuariosRepo.getPerfiles()
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Error desconocido al cargar los usuarios'
      }
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    try {
      await usuariosRepo.updateRol(userId, nuevoRol)
      const perfil = perfiles.value.find(p => p.id === userId)
      if (perfil) {
        perfil.rol = nuevoRol
      }
      alert('✅ Rol actualizado correctamente')
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert('❌ Error al actualizar: ' + err.message)
      } else {
        alert('❌ Error desconocido al actualizar')
      }
      console.error(err)
    }
  }

  return {
    perfiles,
    loading,
    error,
    loadPerfiles,
    cambiarRol
  }
}
