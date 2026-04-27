<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabaseClient'

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface Garantia {
  id: string
  numero_serie: string
  modelo_producto: string
  cliente_email: string
  fecha_venta: string
  fecha_vencimiento: string
  hash_certificado: string
  estado: string
  dias_restantes?: number
  estado_vigencia?: string
}

// ============================================
// STATE
// ============================================

const route = useRoute()

const garantia = ref<Garantia | null>(null)
const loading = ref(true)
const error = ref<string | null>(null) // ✅ AQUÍ ESTÁ: "error" NO "errorMsg"
const showReclamacion = ref(false)

const formReclamacion = ref({
  motivo: '',
  descripcion: '',
  evidencia_url: '',
})

// ============================================
// CICLO DE VIDA
// ============================================

onMounted(async () => {
  // Asegúrate de obtener el hash directamente del objeto route actual
  const currentHash = route.params.hash as string

  if (!currentHash) {
    error.value = '❌ No se detectó un código de garantía en la URL.'
    loading.value = false
    return
  }

  try {
    // Buscar garantía por hash
    const { data, error: dbError } = await supabase
      .from('garantias')
      .select('*')
      .eq('hash_certificado', currentHash)
      .single()

    if (dbError || !data) {
      error.value = '❌ Certificado no válido o no existe'
      return
    }

    // Verificar si está vencida
    const hoy = new Date()
    const vencimiento = new Date(data.fecha_vencimiento)

    if (hoy > vencimiento) {
      data.estado_vigencia = 'VENCIDA'
    } else {
      data.estado_vigencia = 'ACTIVA'
      // Calcular días restantes
      const diferencia = vencimiento.getTime() - hoy.getTime()
      data.dias_restantes = Math.ceil(diferencia / (1000 * 3600 * 24))
    }

    garantia.value = data as Garantia

    // Registrar verificación en auditoría
    await supabase.from('garantias_audit').insert([
      {
        garantia_id: data.id,
        accion: 'VERIFICADA',
        datos_nuevos: { verificacion: new Date().toISOString() },
      },
    ])
  } catch (err: unknown) {
    // ✅ FORMA CORRECTA DE MANEJAR ERRORES EN TYPESCRIPT
    if (err instanceof Error) {
      error.value = `Error al verificar: ${err.message}`
    } else {
      error.value = 'Ocurrió un error desconocido'
    }
    console.error('Error en onMounted:', err)
  } finally {
    loading.value = false
  }
})

// ============================================
// FUNCIONES
// ============================================

/**
 * Enviar reclamación de la garantía
 */
async function enviarReclamacion() {
  // Validar que el motivo esté seleccionado
  if (!formReclamacion.value.motivo.trim()) {
    alert('⚠️ Por favor ingresa el motivo de la reclamación')
    return
  }

  // Validar que exista una garantía cargada
  if (!garantia.value) {
    alert('⚠️ Error: Garantía no encontrada')
    return
  }

  try {
    const { error: dbError } = await supabase.from('reclamaciones').insert([
      {
        garantia_id: garantia.value.id,
        motivo_reclamacion: formReclamacion.value.motivo,
        descripcion_detallada: formReclamacion.value.descripcion,
        evidencia_url: formReclamacion.value.evidencia_url,
        estado_reclamacion: 'pendiente',
      },
    ])

    if (dbError) {
      throw dbError
    }

    // Éxito
    alert('✅ Reclamación enviada correctamente')
    showReclamacion.value = false
    formReclamacion.value = {
      motivo: '',
      descripcion: '',
      evidencia_url: '',
    }
  } catch (err: unknown) {
    // ✅ FORMA CORRECTA
    if (err instanceof Error) {
      alert(`❌ Error: ${err.message}`)
    } else {
      alert('❌ Error desconocido al enviar reclamación')
    }
    console.error('Error en enviarReclamacion:', err)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
    <div class="max-w-2xl mx-auto">
      <div class="w-full max-w-2xl mx-auto px-2 sm:px-4"></div>
      <!-- CARGANDO -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block">
          <svg class="animate-spin h-12 w-12 text-blue-600" viewBox="0 0 24 24">
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
        <p class="text-gray-600 mt-4">Verificando certificado...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" class="bg-red-100 border-l-4 border-red-600 p-6 rounded-lg">
        <p class="text-red-800 font-bold text-lg">{{ error }}</p>
        <p class="text-red-600 text-sm mt-2">
          Por favor, verifica el código QR o contacta al vendedor.
        </p>
      </div>

      <!-- GARANTÍA VÁLIDA ✅ -->
      <div v-else-if="garantia" class="space-y-6">
        <!-- TARJETA PRINCIPAL -->
        <div
          :class="[
            'bg-white rounded-2xl shadow-2xl p-8 border-t-4',
            garantia.estado_vigencia === 'ACTIVA' ? 'border-green-500' : 'border-red-500',
          ]"
        >
          <!-- Encabezado de estado -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-800">
                {{
                  garantia.estado_vigencia === 'ACTIVA'
                    ? '✅ Garantía Válida'
                    : '⚠️ Garantía Vencida'
                }}
              </h1>
              <p class="text-gray-600 text-sm mt-1">Certificado digital verificado</p>
            </div>
            <div
              :class="[
                'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
                garantia.estado_vigencia === 'ACTIVA' ? 'bg-green-100' : 'bg-red-100',
              ]"
            >
              {{ garantia.estado_vigencia === 'ACTIVA' ? '✓' : '✗' }}
            </div>
          </div>

          <!-- Información del Producto -->
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p class="text-gray-500 text-sm uppercase font-bold">Serial del Producto</p>
              <p class="text-lg font-bold text-gray-900 break-all">{{ garantia.numero_serie }}</p>
            </div>
            <div>
              <p class="text-gray-500 text-sm uppercase font-bold">Modelo</p>
              <p class="text-lg font-bold text-gray-900">{{ garantia.modelo_producto }}</p>
            </div>
          </div>

          <!-- Fechas -->
          <div class="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p class="text-gray-500 text-sm uppercase font-bold">Fecha de Venta</p>
              <p class="text-lg font-bold text-gray-900">
                {{ new Date(garantia.fecha_venta).toLocaleDateString('es-ES') }}
              </p>
            </div>
            <div>
              <p class="text-gray-500 text-sm uppercase font-bold">Vencimiento</p>
              <p
                class="text-lg font-bold"
                :class="garantia.estado_vigencia === 'ACTIVA' ? 'text-green-600' : 'text-red-600'"
              >
                {{ new Date(garantia.fecha_vencimiento).toLocaleDateString('es-ES') }}
              </p>
            </div>
          </div>

          <!-- Días restantes (Si está activa) -->
          <div
            v-if="garantia.estado_vigencia === 'ACTIVA'"
            class="bg-green-50 p-4 rounded-lg border border-green-200 mb-6"
          >
            <p class="text-green-700 font-bold text-lg">
              ⏳ {{ garantia.dias_restantes }} días restantes
            </p>
            <p class="text-green-600 text-sm">Tu garantía sigue siendo válida</p>
          </div>

          <!-- Email del cliente (verificación) -->
          <div class="bg-gray-50 p-4 rounded-lg mb-6">
            <p class="text-gray-500 text-sm uppercase font-bold">Email Registrado</p>
            <p class="text-gray-900 font-mono">{{ garantia.cliente_email }}</p>
          </div>

          <!-- Hash (Para transparencia) -->
          <details class="bg-gray-100 p-4 rounded-lg mb-6">
            <summary class="text-gray-700 font-bold cursor-pointer">
              🔒 Ver detalles técnicos (hash)
            </summary>
            <code
              class="text-[10px] text-gray-800 font-mono break-all block mt-3 bg-white p-2 rounded border border-gray-300"
            >
              {{ garantia.hash_certificado }}
            </code>
          </details>
        </div>

        <!-- BOTÓN DE RECLAMACIÓN -->
        <button
          v-if="!showReclamacion && garantia.estado_vigencia === 'ACTIVA'"
          @click="showReclamacion = true"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
        >
          🛠️ Hacer una Reclamación
        </button>

        <!-- FORMULARIO DE RECLAMACIÓN -->
        <div
          v-if="showReclamacion"
          class="bg-white rounded-2xl shadow-2xl p-8 border-2 border-blue-200"
        >
          <h2 class="text-2xl font-bold text-gray-800 mb-6">Registrar Reclamación</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Motivo de la Reclamación *
              </label>
              <select
                v-model="formReclamacion.motivo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">-- Selecciona un motivo --</option>
                <option value="defecto_fabricacion">Defecto de fabricación</option>
                <option value="no_funciona">No funciona correctamente</option>
                <option value="averia">Avería o daño</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Descripción Detallada
              </label>
              <textarea
                v-model="formReclamacion.descripcion"
                placeholder="Describe el problema..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 h-32"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                URL de Evidencia (Foto/Video)
              </label>
              <input
                v-model="formReclamacion.evidencia_url"
                type="url"
                placeholder="https://ejemplo.com/foto.jpg"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div class="flex gap-4">
              <button
                @click="enviarReclamacion"
                class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                ✅ Enviar Reclamación
              </button>
              <button
                @click="showReclamacion = false"
                class="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition-all"
              >
                ✗ Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

div[class*='space-y-'] {
  animation: fadeIn 0.5s ease-out;
}
</style>
