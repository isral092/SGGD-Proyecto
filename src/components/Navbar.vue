<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabaseClient'

// ============================================
// INTERFACES
// ============================================
interface User {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

// ============================================
// STATE
// ============================================
const router = useRouter()
const user = ref<User | null>(null)
const userRole = ref<string | null>(null)
const isAdmin = ref(false)
const menuOpen = ref(false)
const loading = ref(true)

// ============================================
// CICLO DE VIDA
// ============================================
onMounted(async () => {
  try {
    // Obtener usuario autenticado
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      user.value = {
        id: authUser.id,
        email: authUser.email || '',
        user_metadata: authUser.user_metadata
      }

      // Obtener rol del usuario
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', authUser.id)
        .single()

      if (!error && profile) {
        userRole.value = profile.rol
        isAdmin.value = profile.rol === 'admin'
      }
    }
  } catch (err) {
    console.error('Error cargando usuario:', err)
  } finally {
    loading.value = false
  }
})

// ============================================
// FUNCIONES
// ============================================
async function logout() {
  await supabase.auth.signOut()
  router.push('/')
  location.reload()
}

function closeMenu() {
  menuOpen.value = false
}

// ============================================
// FUNCIONES HELPER
// ============================================
function getRoleLabel(role: string | null): string {
  const labels: Record<string, string> = {
    admin: '👨‍💼 Administrador',
    empresa: '🏢 Empresa',
    cliente: '👤 Cliente'
  }
  return role ? labels[role] || role : 'Usuario'
}
</script>

<template>
  <nav class="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- LOGO/TÍTULO -->
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold text-blue-600">🛡️ SGGD</h1>
          <p class="text-gray-600 text-sm hidden sm:block">Sistema de Garantías Digitales</p>
        </div>

        <!-- MENÚ DE NAVEGACIÓN (Desktop) -->
        <div class="hidden md:flex items-center gap-6">
          <!-- HOME -->
          <router-link
            to="/"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="$route.path === '/' ? 'text-blue-600 border-b-2 border-blue-600' : ''"
          >
            🏠 Home
          </router-link>

          <!-- MI PERFIL -->
          <router-link
            v-if="user"
            to="/perfil"
            class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 pb-2"
            :class="$route.path === '/perfil' ? 'text-blue-600 border-b-2 border-blue-600' : ''"
          >
            👤 Mi Perfil
          </router-link>

          <!-- GESTOR DE ROLES (SOLO ADMIN) -->
          <router-link
            v-if="isAdmin"
            to="/admin/roles"
            class="text-white bg-red-600 hover:bg-red-700 font-medium px-4 py-2 rounded-lg transition duration-200"
          >
            ⚙️ Gestor de Roles
          </router-link>

          <!-- INFORMACIÓN DEL USUARIO + LOGOUT -->
          <div v-if="user" class="flex items-center gap-4 border-l pl-6">
            <div class="text-right text-sm">
              <p class="font-semibold text-gray-800">{{ user.email }}</p>
              <p class="text-xs text-gray-600">
                {{ getRoleLabel(userRole) }}
              </p>
            </div>
            <button
              @click="logout"
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
            >
              Salir
            </button>
          </div>

          <!-- SIN USUARIO -->
          <div v-else class="text-sm text-gray-600">
            No autenticado
          </div>
        </div>

        <!-- BOTÓN MENÚ MOBILE -->
        <button
          @click="menuOpen = !menuOpen"
          class="md:hidden text-gray-700 hover:text-blue-600 transition"
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

      <!-- MENÚ MOBILE (cuando está abierto) -->
      <div
        v-if="menuOpen"
        class="md:hidden border-t border-gray-200 py-4 space-y-3 bg-gray-50"
      >
        <router-link
          to="/"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          🏠 Home
        </router-link>

        <router-link
          v-if="user"
          to="/perfil"
          class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          @click="closeMenu"
        >
          👤 Mi Perfil
        </router-link>

        <router-link
          v-if="isAdmin"
          to="/admin/roles"
          class="block px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded font-medium transition"
          @click="closeMenu"
        >
          ⚙️ Gestor de Roles
        </router-link>

        <button
          v-if="user"
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

/* Transiciones suaves */
a,
button {
  transition: all 0.2s ease;
}
</style>
