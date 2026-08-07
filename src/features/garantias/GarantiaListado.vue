<script setup lang="ts">
import { onMounted } from 'vue'
import { useGarantias } from './useGarantias'

const { garantias, loading, error, loadGarantias } = useGarantias()

onMounted(async () => {
  await loadGarantias()
})

function calcularDiasRestantes(fechaVencimiento: string): number {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diferencia = vencimiento.getTime() - hoy.getTime()
  return Math.ceil(diferencia / (1000 * 3600 * 24))
}

function obtenerEstadoVigencia(fechaVencimiento: string): string {
  const dias = calcularDiasRestantes(fechaVencimiento)
  if (dias < 0) return 'VENCIDA'
  if (dias <= 30) return 'POR VENCER'
  return 'ACTIVA'
}

function formatearFecha(fecha?: string): string {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleDateString('es-ES')
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">📦 Garantías Registradas</h1>

    <div v-if="loading" class="text-center py-12 text-gray-500">Cargando garantías...</div>
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error }}</div>
    <div v-else-if="garantias.length === 0" class="text-center py-12 text-gray-500">No hay garantías registradas</div>

    <div v-else class="space-y-4">
      <div v-for="gar in garantias" :key="gar.id" class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2 flex-wrap">
              <span class="px-2 py-1 text-xs font-bold rounded-full"
                    :class="obtenerEstadoVigencia(gar.fecha_vencimiento) === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                            obtenerEstadoVigencia(gar.fecha_vencimiento) === 'POR VENCER' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'">
                {{ obtenerEstadoVigencia(gar.fecha_vencimiento) }}
              </span>
              <span class="text-sm text-gray-500">Registrada: {{ formatearFecha(gar.created_at) }}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Número de Serie</p>
                <p class="font-semibold text-gray-900">{{ gar.numero_serie }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Modelo</p>
                <p class="font-semibold text-gray-900">{{ gar.modelo_producto }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Cliente</p>
                <p class="text-gray-700">{{ gar.cliente_email }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Vencimiento</p>
                <p class="font-medium" :class="obtenerEstadoVigencia(gar.fecha_vencimiento) === 'VENCIDA' ? 'text-red-600' : 'text-gray-900'">
                  {{ new Date(gar.fecha_vencimiento).toLocaleDateString('es-ES') }}
                  <span class="text-xs text-gray-500 ml-1">
                    ({{ calcularDiasRestantes(gar.fecha_vencimiento) }} días)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
