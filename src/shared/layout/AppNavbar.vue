<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/core/config/supabaseClient'
import { useAuthStore } from '@/features/auth/authStore'

const router = useRouter()
const authStore = useAuthStore()
const menuOpen = ref<boolean>(false)

async function logout(): Promise<void> {
  await supabase.auth.signOut()
  router.push('/login')
}

function closeMenu(): void {
  menuOpen.value = false
}

function getRoleLabel(role: string | undefined): string {
  if (!role) return 'Usuario'
  const labels: Record<string, string> = {
    admin: '👨‍💼 Administrador',
    empleado: '🏢 Empleado'
  }
  return labels[role] || 'Usuario'
}
</script>

<template>
  <nav class="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-200 w-full">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- LOGO / BRAND -->
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold text-blue-600">🛡️ SGGD</h1>
          <p class="text-gray-600 text-sm hidden sm:block">Sistema de Garantías Digitales</p>
        </div>

        <!-- ✅ MENÚ DESKTOP (TU CÓDIGO IMPLEMENTADO) -->
        <div class="hidden md:flex items-center gap-6">
          <!-- HOME (SOLO SI AUTENTICADO CON ROL EMPRESARIAL) -->
          <router-link
            v-if="authStore.isAdmin || authStore.isEmpleado"
            to="/"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="$route.path === '/' ? 'text-blue-600 border-b-2 border-blue-600' : ''"
          >
            🏠 Home
          </router-link>

          <!-- MI PERFIL (SOLO SI AUTENTICADO) -->
          <router-link
            v-if="authStore.isAuthenticated"
            to="/perfil"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="$route.path === '/perfil' ? 'text-blue-600 border-b-2 border-blue-600' : ''"
          >
            👤 Mi Perfil
          </router-link>
          <router-link
            v-if="authStore.isAdmin || authStore.isEmpleado"
            to="/reclamaciones"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="
              $route.path === '/reclamaciones' ? 'text-blue-600 border-b-2 border-blue-600' : ''
            "
          >
            Reclamaciones
          </router-link>
          <router-link
            v-if="authStore.isAdmin || authStore.isEmpleado"
            to="/garantias"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="$route.path === '/garantias' ? 'text-blue-600 border-b-2 border-blue-600' : ''"
          >
            📦 Garantías
          </router-link>

          <!-- ADMIN (SOLO SI ES ADMIN) -->
          <router-link
            v-if="authStore.isAdmin"
            to="/admin/roles"
            class="text-white bg-red-600 hover:bg-red-700 font-medium px-4 py-2 rounded-lg transition duration-200"
          >
            ⚙️ Gestor de Roles
          </router-link>

          <!-- SI ESTÁ AUTENTICADO -->
          <div v-if="authStore.isAuthenticated" class="flex items-center gap-4 border-l pl-6">
            <div class="text-right text-sm">
              <p class="font-semibold text-gray-800">{{ authStore.user?.email }}</p>
              <p class="text-xs text-gray-600">
                {{ getRoleLabel(authStore.profile?.rol) }}
              </p>
            </div>
            <button
              @click="logout"
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
            >
              Salir
            </button>
          </div>
        </div>

        <!-- BOTÓN HAMBURGUESA (MOBILE - SOLO SI ESTÁ AUTENTICADO) -->
        <button
          v-if="authStore.isAuthenticated"
          @click="menuOpen = !menuOpen"
          class="md:hidden text-gray-700 hover:text-blue-600 transition"
          aria-label="Abrir menú"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <!-- ✅ MENÚ MOBILE -->
      <div v-if="menuOpen && authStore.isAuthenticated" class="md:hidden border-t border-gray-200 py-4 space-y-3 bg-gray-50">
        <router-link
          v-if="authStore.isAdmin || authStore.isEmpleado"
          to="/"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          🏠 Home
        </router-link>

        <router-link
          to="/perfil"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          👤 Mi Perfil
        </router-link>
        <router-link
          v-if="authStore.isAdmin || authStore.isEmpleado"
          to="/reclamaciones"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          📋 Reclamaciones
        </router-link>
        <router-link
          v-if="authStore.isAdmin || authStore.isEmpleado"
          to="/garantias"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          📦 Garantías
        </router-link>

        <router-link
          v-if="authStore.isAdmin"
          to="/admin/roles"
          class="block px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded font-medium transition"
          @click="closeMenu"
        >
          ⚙️ Gestor de Roles
        </router-link>

        <button
          @click="logout"
          class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100 rounded transition"
        >
          Salir
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
nav {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
a,
button {
  transition: all 0.2s ease;
}
</style>
