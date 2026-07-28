<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/core/config/supabaseClient'

interface GarantiaBasica {
  numero_serie: string
  modelo_producto: string
  cliente_email: string
}

interface Reclamacion {
  id: string
  garantia_id: string
  motivo_reclamacion: string
  descripcion_detallada: string | null
  estado_reclamacion: string
  fecha_solicitud: string
  garantias: GarantiaBasica | null
}

const reclamaciones = ref<Reclamacion[]>([])
const loading = ref<boolean>(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const { data, error: dbError } = await supabase
      .from('reclamaciones')
      .select('*, garantias(numero_serie, modelo_producto, cliente_email)')
      .order('fecha_solicitud', { ascending: false })

    if (dbError) throw dbError
    reclamaciones.value = (data as Reclamacion[]) || []
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Error al cargar reclamaciones'
  } finally {
    loading.value = false
  }
})

function contactarCliente(email: string): void {
  if (!email) return
  window.location.href = `mailto:${email}?subject=Reclamación de garantía pendiente`
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-6"> Reclamaciones del Sistema</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">Cargando reclamaciones...</div>
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error }}</div>
    <div v-else-if="reclamaciones.length === 0" class="text-center py-12 text-gray-500">No hay reclamaciones registradas</div>

    <div v-else class="space-y-4">
      <div v-for="rec in reclamaciones" :key="rec.id" class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-1 text-xs font-bold rounded-full"
                  :class="rec.estado_reclamacion === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'">
              {{ rec.estado_reclamacion.toUpperCase() }}
            </span>
            <span class="text-sm text-gray-500">{{ new Date(rec.fecha_solicitud).toLocaleDateString('es-ES') }}</span>
          </div>
          <p class="font-semibold text-gray-900">{{ rec.garantias?.numero_serie }} - {{ rec.garantias?.modelo_producto }}</p>
          <p class="text-sm text-gray-600 mt-1">Motivo: {{ rec.motivo_reclamacion }}</p>
        </div>

        <button
          @click="contactarCliente(rec.garantias?.cliente_email || '')"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition whitespace-nowrap"
        >
          📞 Contactar Cliente
        </button>
      </div>
    </div>
  </div>
</template>
