<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/authStore'
import { useUsuarios } from './useUsuarios'

const authStore = useAuthStore()
const { miPerfil: perfil, loading, error, loadMiPerfil } = useUsuarios()

onMounted(async () => {
  if (authStore.user) {
    await loadMiPerfil(authStore.user.id)
  }
})

const traduzRol = (rol: string): string => {
  const traducciones: Record<string, string> = {
    admin: '👨‍💼 Administrador',
    empleado: '🏢 Empleado'
  }
  return traducciones[rol] || rol
}

const colorRol = (rol: string): string => {
  const colores: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 border-red-300',
    empleado: 'bg-blue-100 text-blue-800 border-blue-300'
  }
  return colores[rol] || 'bg-gray-100 text-gray-800'
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-8">
    <div class="w-full h-full flex flex-col items-center justify-center px-4 py-8">
      <!-- CARGANDO -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block">
          <svg class="animate-spin h-16 w-16 text-blue-600" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p class="text-gray-600 mt-6 text-lg">Cargando tu perfil...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" class="w-full lg:max-w-4xl xl:max-w-6xl">
        <div class="bg-red-100 border-2 border-red-400 text-red-700 px-8 py-6 rounded-xl text-lg font-bold">
          ❌ {{ error }}
        </div>
      </div>

      <!-- PERFIL -->
      <div v-else-if="perfil" class="w-full lg:max-w-5xl xl:max-w-6xl">
        <div class="bg-white rounded-2xl shadow-2xl p-8 lg:p-12 border-t-4 border-blue-500 flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-start">
          
          <!-- Avatar Section -->
          <div class="text-center lg:w-1/3 w-full flex flex-col items-center justify-center">
            <div class="w-32 h-32 lg:w-48 lg:h-48 bg-blue-200 rounded-full flex items-center justify-center text-6xl lg:text-8xl mb-6 shadow-lg border-4 border-white ring-4 ring-blue-50">
              👤
            </div>
            <h1 class="text-3xl lg:text-4xl font-bold text-gray-800 break-words w-full">{{ perfil.nombre || 'Usuario' }}</h1>
            <p v-if="!perfil.nombre" class="text-gray-500 mt-2 text-sm">Actualiza tu nombre en tu cuenta</p>
          </div>

          <!-- Info Section -->
          <div class="lg:w-2/3 w-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <!-- Email -->
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md">
              <p class="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-2">📧 Email Registrado</p>
              <p class="text-gray-900 font-mono text-base md:text-lg break-all">{{ perfil.email }}</p>
            </div>

            <!-- Rol -->
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md">
              <p class="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-2">🔑 Rol en el Sistema</p>
              <span :class="['inline-block px-4 py-2 rounded-full text-base font-bold border-2', colorRol(perfil.rol)]">
                {{ traduzRol(perfil.rol) }}
              </span>
            </div>

            <!-- Estado -->
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md">
              <p class="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-2">⚙️ Estado de Cuenta</p>
              <span :class="['inline-block px-4 py-2 rounded-full text-base font-bold', perfil.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800']">
                {{ perfil.activo ? '✅ Cuenta Activa' : '❌ Inactiva' }}
              </span>
            </div>

            <!-- Fecha de registro -->
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md">
              <p class="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-2">📅 Miembro desde</p>
              <p class="text-gray-900 text-base md:text-lg font-semibold">{{ new Date(perfil.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
