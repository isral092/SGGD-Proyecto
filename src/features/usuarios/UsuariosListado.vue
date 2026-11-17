<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/authStore'
import { useUsuarios, type Perfil } from './useUsuarios'
import { nuevoEmpleadoSchema } from '@/core/utils/schema'

const authStore = useAuthStore()
const {
  perfiles,
  loading,
  error,
  successMessage,
  loadPerfiles,
  cambiarRol,
  cambiarActivo,
  registrarEmpleado,
} = useUsuarios()

const showModal = ref(false)
const modalError = ref<string | null>(null)
const guardandoEmpleado = ref(false)

const perfilConfirmarEstado = ref<Perfil | null>(null)
const procesandoId = ref<string | null>(null)

const nuevoEmpleado = ref({
  nombre: '',
  email: '',
  password: '',
  rol: 'empleado' as 'empleado' | 'admin',
})

function abrirModal() {
  nuevoEmpleado.value = {
    nombre: '',
    email: '',
    password: '',
    rol: 'empleado',
  }
  modalError.value = null
  showModal.value = true
}

function cerrarModal() {
  showModal.value = false
  modalError.value = null
}

async function handleCrearEmpleado() {
  modalError.value = null
  const validacion = nuevoEmpleadoSchema.safeParse(nuevoEmpleado.value)
  if (!validacion.success) {
    modalError.value = validacion.error.issues[0]?.message ?? 'Datos inválidos'
    return
  }

  guardandoEmpleado.value = true
  const ok = await registrarEmpleado(validacion.data)
  guardandoEmpleado.value = false

  if (ok) {
    cerrarModal()
  } else {
    modalError.value = error.value ?? 'No se pudo registrar el empleado'
  }
}

async function handleCambiarRol(perfil: Perfil, event: Event) {
  const selectEl = event.target as HTMLSelectElement
  const nuevoRol = selectEl.value
  const rolAnterior = perfil.rol

  procesandoId.value = perfil.id
  const ok = await cambiarRol(perfil.id, nuevoRol)
  procesandoId.value = null

  if (!ok) {
    selectEl.value = rolAnterior
  }
}

function solicitarCambioEstado(perfil: Perfil) {
  if (perfil.id === authStore.user?.id) return
  perfilConfirmarEstado.value = perfil
}

function cancelarCambioEstado() {
  perfilConfirmarEstado.value = null
}

async function confirmarCambioEstado() {
  const objetivo = perfilConfirmarEstado.value
  if (!objetivo || objetivo.id === authStore.user?.id) return

  const nuevoEstado = !objetivo.activo
  procesandoId.value = objetivo.id
  await cambiarActivo(objetivo.id, nuevoEstado)
  procesandoId.value = null
  perfilConfirmarEstado.value = null
}

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
        <!-- Título y Acción de Alta -->
        <div class="w-full mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">👨‍💼 Gestor de Roles</h1>
            <p class="text-gray-600 text-base sm:text-lg">
              Administra los roles, altas y bajas de empleados autorizados en el sistema
            </p>
          </div>
          <button
            @click="abrirModal"
            class="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition duration-200"
          >
            <span>➕ Registrar Empleado</span>
          </button>
        </div>

        <!-- MODAL PARA REGISTRAR EMPLEADO -->
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-gray-100">
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 class="text-2xl font-bold text-gray-800">👤 Alta de Empleado</h2>
              <button
                @click="cerrarModal"
                class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <div
              v-if="modalError"
              class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium"
            >
              ⚠️ {{ modalError }}
            </div>

            <form @submit.prevent="handleCrearEmpleado" class="space-y-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  v-model="nuevoEmpleado.nombre"
                  placeholder="Ej: Juan Perez"
                  class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 transition"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Email Corporativo *</label>
                <input
                  v-model="nuevoEmpleado.email"
                  type="email"
                  placeholder="empleado@empresa.com"
                  class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 transition"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Contraseña Temporal *</label>
                <input
                  v-model="nuevoEmpleado.password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 transition"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Rol Inicial *</label>
                <select
                  v-model="nuevoEmpleado.rol"
                  class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 transition bg-white"
                >
                  <option value="empleado">🏢 Empleado</option>
                  <option value="admin">👨‍💼 Administrador</option>
                </select>
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  @click="cerrarModal"
                  :disabled="guardandoEmpleado"
                  class="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="guardandoEmpleado"
                  class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition shadow"
                >
                  {{ guardandoEmpleado ? '⏳ Guardando...' : 'Guardar Empleado' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL DE CONFIRMACIÓN DE BAJA / REACTIVACIÓN -->
        <div
          v-if="perfilConfirmarEstado"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <h2 class="text-xl font-bold text-gray-900 mb-3">
              {{
                perfilConfirmarEstado.activo
                  ? '⚠️ Confirmar Baja de Empleado'
                  : '🔄 Confirmar Reactivación de Cuenta'
              }}
            </h2>
            <p class="text-gray-600 text-sm mb-6 leading-relaxed">
              <template v-if="perfilConfirmarEstado.activo">
                ¿Estás seguro de dar de baja a
                <strong class="text-gray-900">{{
                  perfilConfirmarEstado.nombre || perfilConfirmarEstado.email
                }}</strong>
                (<span class="font-mono text-xs">{{ perfilConfirmarEstado.email }}</span>)?
                Su cuenta quedará marcada como <strong>Inactiva</strong> y perderá el acceso a los
                módulos operativos del sistema.
              </template>
              <template v-else>
                ¿Deseas reactivar la cuenta de
                <strong class="text-gray-900">{{
                  perfilConfirmarEstado.nombre || perfilConfirmarEstado.email
                }}</strong>
                (<span class="font-mono text-xs">{{ perfilConfirmarEstado.email }}</span>)?
                El usuario recuperará el acceso operativo según su rol asignado.
              </template>
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                @click="cancelarCambioEstado"
                :disabled="procesandoId === perfilConfirmarEstado.id"
                class="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                @click="confirmarCambioEstado"
                :disabled="procesandoId === perfilConfirmarEstado.id"
                :class="
                  perfilConfirmarEstado.activo
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                "
                class="flex-1 px-4 py-2.5 disabled:bg-gray-400 text-white font-bold rounded-xl transition shadow"
              >
                {{
                  procesandoId === perfilConfirmarEstado.id
                    ? '⏳ Procesando...'
                    : perfilConfirmarEstado.activo
                      ? 'Confirmar Baja'
                      : 'Reactivar Cuenta'
                }}
              </button>
            </div>
          </div>
        </div>

        <!-- CARGANDO -->
        <div v-if="loading && perfiles.length === 0" class="text-center py-16">
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
          <table class="w-full min-w-[900px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <thead class="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
              <tr>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Email</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Nombre</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Rol Actual</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Cambiar Rol</th>
                <th class="px-8 py-6 text-left text-lg font-bold text-gray-800">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="perfil in perfiles"
                :key="perfil.id"
                class="border-b border-gray-200 hover:bg-gray-50 transition"
                :class="{ 'opacity-70 bg-gray-50/60': !perfil.activo }"
              >
                <td class="px-8 py-6 text-gray-900 text-base font-medium">{{ perfil.email }}</td>
                <td class="px-8 py-6 text-gray-900 text-base">{{ perfil.nombre || '-' }}</td>
                <td class="px-8 py-6">
                  <span
                    :class="{
                      'bg-red-100 text-red-800': perfil.rol === 'admin',
                      'bg-blue-100 text-blue-800': perfil.rol === 'empleado',
                    }"
                    class="inline-block px-4 py-2 rounded-full text-base font-bold border-2"
                  >
                    {{ perfil.rol }}
                  </span>
                </td>
                <td class="px-8 py-6">
                  <select
                    :value="perfil.rol"
                    :disabled="perfil.id === authStore.user?.id || procesandoId === perfil.id"
                    @change="(e) => handleCambiarRol(perfil, e)"
                    class="px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="empleado">🏢 Empleado</option>
                    <option value="admin">👨‍💼 Admin</option>
                  </select>
                  <span
                    v-if="perfil.id === authStore.user?.id"
                    class="text-xs text-gray-500 block mt-1 font-semibold"
                  >
                    (Tu cuenta)
                  </span>
                </td>
                <td class="px-8 py-6">
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="perfil.activo"
                      :disabled="perfil.id === authStore.user?.id || procesandoId === perfil.id"
                      @click="solicitarCambioEstado(perfil)"
                      class="relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="perfil.activo ? 'bg-green-600' : 'bg-gray-300'"
                      :title="
                        perfil.id === authStore.user?.id
                          ? 'No puedes desactivar tu propia cuenta'
                          : perfil.activo
                            ? 'Dar de baja al empleado'
                            : 'Reactivar cuenta de empleado'
                      "
                    >
                      <span
                        class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="perfil.activo ? 'translate-x-6' : 'translate-x-0'"
                      />
                    </button>
                    <span
                      class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                      :class="
                        perfil.activo
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-200 text-gray-700 border border-gray-300'
                      "
                    >
                      {{ perfil.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
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

