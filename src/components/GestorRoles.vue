<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabaseClient'

interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: string
  activo: boolean
}

const perfiles = ref<Perfil[]>([])
const loading = ref<boolean>(true)
const isAdmin = ref<boolean>(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      error.value = 'No estás autenticado.'
      loading.value = false
      return
    }

    const { data: miPerfil, error: perfilError } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfilError || !miPerfil || miPerfil.rol !== 'admin') {
      error.value = 'Acceso denegado: Se requieren permisos de Administrador.'
      loading.value = false
      return
    }

    isAdmin.value = true

    const { data, error: listError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (listError) {
      console.error('❌ Error listando perfiles:', listError.message)
      error.value = 'No se pudieron cargar los usuarios. Verifica las políticas RLS.'
      return
    }

    perfiles.value = (data as Perfil[]) || []
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar roles'
    error.value = errorMessage
    console.error(errorMessage)
  } finally {
    loading.value = false
  }
})

async function cambiarRol(userId: string, nuevoRol: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ rol: nuevoRol })
    .eq('id', userId)

  if (updateError) {
    alert('❌ Error al actualizar: ' + updateError.message)
    return
  }

  const perfil = perfiles.value.find((p) => p.id === userId)
  if (perfil) {
    perfil.rol = nuevoRol
  }

  alert('✅ Rol actualizado correctamente')
}
</script>

<template>
  <div class="w-full px-4 py-8">
    <!-- ERROR -->
    <div
      v-if="error"
      class="mb-6 p-6 bg-red-100 border-2 border-red-400 text-red-700 rounded-xl text-lg"
    >
      ❌ {{ error }}
    </div>

    <!-- NO ES ADMIN -->
    <div v-if="!isAdmin && !loading" class="w-full">
      <div
        class="bg-red-100 border-2 border-red-400 text-red-700 px-8 py-6 rounded-xl text-lg font-bold text-center"
      >
        ❌ Solo los administradores pueden acceder a esta sección
      </div>
    </div>

    <!-- ES ADMIN -->
    <div v-else-if="isAdmin" class="w-full">
      <!-- Título -->
      <div class="w-full mb-8">
        <h1 class="text-5xl font-bold text-gray-800 mb-2">👨‍💼 Gestor de Roles</h1>
        <p class="text-gray-600 text-lg">
          Administra los roles y permisos de los usuarios del sistema
        </p>
      </div>

      <!-- CARGANDO -->
      <div v-if="loading" class="text-center py-16">
        <div class="inline-block">
          <svg class="animate-spin h-16 w-16 text-blue-600" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p class="text-gray-600 mt-6 text-lg">Cargando usuarios...</p>
      </div>

      <!-- TABLA -->
      <div v-else class="w-full overflow-x-auto pb-4">
        <table
          class="w-full min-w-[800px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        >
          <thead class="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
            <tr>
              <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Email</th>
              <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Nombre</th>
              <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Rol Actual</th>
              <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Cambiar Rol</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="perfil in perfiles"
              :key="perfil.id"
              class="border-b border-gray-200 hover:bg-gray-50 transition"
            >
              <td class="px-8 py-6 text-gray-900 text-base font-medium">{{ perfil.email }}</td>
              <td class="px-8 py-6 text-gray-900 text-base">{{ perfil.nombre || '-' }}</td>
              <td class="px-8 py-6">
                <span
                  :class="{
                    'bg-red-100 text-red-800': perfil.rol === 'admin',
                    'bg-blue-100 text-blue-800': perfil.rol === 'empresa',
                    'bg-green-100 text-green-800': perfil.rol === 'cliente',
                  }"
                  class="inline-block px-4 py-2 rounded-full text-base font-bold border-2"
                >
                  {{ perfil.rol }}
                </span>
              </td>
              <td class="px-8 py-6">
                <select
                  :value="perfil.rol"
                  @change="(e) => cambiarRol(perfil.id, (e.target as HTMLSelectElement).value)"
                  class="px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="cliente">👤 Cliente</option>
                  <option value="empresa">🏢 Empresa</option>
                  <option value="admin">👨‍💼 Admin</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- VACÍO -->
        <div v-if="perfiles.length === 0 && !loading" class="text-center py-16 text-gray-500">
          <p class="text-xl">No hay usuarios registrados en el sistema</p>
        </div>
      </div>
    </div>
  </div>
</template>
