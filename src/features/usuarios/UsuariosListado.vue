<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/authStore'
import { useUsuarios } from './useUsuarios'

const authStore = useAuthStore()
const { perfiles, loading, error, successMessage, loadPerfiles, cambiarRol } = useUsuarios()

onMounted(async () => {
  if (authStore.isAdmin) {
    await loadPerfiles()
  }
})
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-8">
    <div class="w-full px-4">
      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-6 p-6 bg-red-100 border-2 border-red-400 text-red-700 rounded-xl text-lg"
      >
        ❌ {{ error }}
      </div>

      <!-- ÉXITO -->
      <div
        v-if="successMessage"
        class="mb-6 p-6 bg-green-100 border-2 border-green-400 text-green-700 rounded-xl text-lg font-semibold transition-all duration-300"
      >
        {{ successMessage }}
      </div>

      <!-- NO ES ADMIN -->
      <div v-if="!authStore.isAdmin && !loading" class="w-full">
        <div
          class="bg-red-100 border-2 border-red-400 text-red-700 px-8 py-6 rounded-xl text-lg font-bold text-center"
        >
          ❌ Solo los administradores pueden acceder a esta sección
        </div>
      </div>

      <!-- ES ADMIN -->
      <div v-else-if="authStore.isAdmin" class="w-full">
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
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p class="text-gray-600 mt-6 text-lg">Cargando usuarios...</p>
        </div>

        <!-- TABLA -->
        <div v-else class="w-full overflow-x-auto pb-4">
          <table class="w-full min-w-[800px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <thead class="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
              <tr>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Email</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Nombre</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Rol Actual</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Cambiar Rol</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="perfil in perfiles" :key="perfil.id" class="border-b border-gray-200 hover:bg-gray-50 transition">
                <td class="px-8 py-6 text-gray-900 text-base font-medium">{{ perfil.email }}</td>
                <td class="px-8 py-6 text-gray-900 text-base">{{ perfil.nombre || '-' }}</td>
                <td class="px-8 py-6">
                  <span
                    :class="{
                      'bg-red-100 text-red-800': perfil.rol === 'admin',
                      'bg-blue-100 text-blue-800': perfil.rol === 'empleado'
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
                    <option value="empleado">🏢 Empleado</option>
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
  </main>
</template>
