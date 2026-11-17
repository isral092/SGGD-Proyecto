<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  useReclamaciones,
  type Reclamacion,
  type ReclamacionEstado,
} from './useReclamaciones'
import { formatearFecha } from '@/core/utils/fechaUtils'

const {
  reclamaciones,
  loading,
  error,
  successMessage,
  loadReclamaciones,
  cambiarEstadoReclamacion,
  esUrlSegura,
} = useReclamaciones()

type FiltroEstado = 'todas' | ReclamacionEstado

const filtroActual = ref<FiltroEstado>('todas')
const guardandoId = ref<string | null>(null)
const notasBorrador = ref<Record<string, string>>({})
const estadoBorrador = ref<Record<string, ReclamacionEstado>>({})

const pestanas: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en_revision', etiqueta: 'En Revisión' },
  { valor: 'resuelta', etiqueta: 'Resueltas' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
]

const estadosOpciones: { valor: ReclamacionEstado; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: '⏳ Pendiente' },
  { valor: 'en_revision', etiqueta: '🔍 En revisión' },
  { valor: 'resuelta', etiqueta: '✅ Resuelta' },
  { valor: 'rechazada', etiqueta: '❌ Rechazada' },
]

function sincronizarBorradores(lista: Reclamacion[]) {
  for (const rec of lista) {
    if (rec.id) {
      notasBorrador.value[rec.id] = rec.notas_tecnico ?? ''
      estadoBorrador.value[rec.id] = rec.estado_reclamacion
    }
  }
}

watch(
  reclamaciones,
  (lista) => {
    sincronizarBorradores(lista)
  },
  { deep: true },
)

onMounted(async () => {
  await loadReclamaciones()
  sincronizarBorradores(reclamaciones.value)
})

const reclamacionesFiltradas = computed(() => {
  if (filtroActual.value === 'todas') return reclamaciones.value
  return reclamaciones.value.filter((r) => r.estado_reclamacion === filtroActual.value)
})

function contarPorEstado(estado: FiltroEstado): number {
  if (estado === 'todas') return reclamaciones.value.length
  return reclamaciones.value.filter((r) => r.estado_reclamacion === estado).length
}

function claseBadgeEstado(estado: ReclamacionEstado): string {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    case 'en_revision':
      return 'bg-blue-100 text-blue-800 border border-blue-300'
    case 'resuelta':
      return 'bg-green-100 text-green-800 border border-green-300'
    case 'rechazada':
      return 'bg-red-100 text-red-800 border border-red-300'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

function etiquetaEstado(estado: ReclamacionEstado): string {
  switch (estado) {
    case 'pendiente':
      return 'PENDIENTE'
    case 'en_revision':
      return 'EN REVISIÓN'
    case 'resuelta':
      return 'RESUELTA'
    case 'rechazada':
      return 'RECHAZADA'
    default:
      return estado
  }
}

async function handleCambiarEstado(rec: Reclamacion, nuevoEstado: ReclamacionEstado) {
  if (!rec.id) return
  estadoBorrador.value[rec.id] = nuevoEstado
  guardandoId.value = rec.id
  const notas = notasBorrador.value[rec.id] ?? rec.notas_tecnico ?? ''
  const ok = await cambiarEstadoReclamacion(rec.id, nuevoEstado, notas)
  guardandoId.value = null

  if (!ok) {
    estadoBorrador.value[rec.id] = rec.estado_reclamacion
  }
}

async function handleGuardarNotas(rec: Reclamacion) {
  if (!rec.id) return
  guardandoId.value = rec.id
  const estado = estadoBorrador.value[rec.id] ?? rec.estado_reclamacion
  const notas = notasBorrador.value[rec.id] ?? ''
  const ok = await cambiarEstadoReclamacion(rec.id, estado, notas)
  guardandoId.value = null

  if (!ok) {
    estadoBorrador.value[rec.id] = rec.estado_reclamacion
    notasBorrador.value[rec.id] = rec.notas_tecnico ?? ''
  }
}

function contactarCliente(email: string | undefined | null): void {
  if (!email) return
  window.location.href = `mailto:${email}?subject=Reclamación de garantía pendiente`
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">Reclamaciones del Sistema</h1>
        <p class="text-sm text-gray-600 mt-1">
          Gestiona el estado, revisión técnica y resolución de las reclamaciones registradas
        </p>
      </div>
    </div>

    <!-- PESTAÑAS DE FILTRO POR ESTADO -->
    <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3" role="tablist">
      <button
        v-for="tab in pestanas"
        :key="tab.valor"
        type="button"
        role="tab"
        :aria-selected="filtroActual === tab.valor"
        @click="filtroActual = tab.valor"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        :class="
          filtroActual === tab.valor
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        "
      >
        <span>{{ tab.etiqueta }}</span>
        <span
          class="px-2 py-0.5 text-xs rounded-full font-bold"
          :class="
            filtroActual === tab.valor
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600'
          "
        >
          {{ contarPorEstado(tab.valor) }}
        </span>
      </button>
    </div>

    <!-- MENSAJES DE ERROR Y ÉXITO -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 font-medium"
    >
      ❌ {{ error }}
    </div>

    <div
      v-if="successMessage"
      class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4 font-medium"
    >
      {{ successMessage }}
    </div>

    <!-- ESTADO DE CARGA O VACÍO -->
    <div v-if="loading && reclamaciones.length === 0" class="text-center py-12 text-gray-500">
      Cargando reclamaciones...
    </div>
    <div
      v-else-if="reclamacionesFiltradas.length === 0"
      class="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500"
    >
      No hay reclamaciones registradas en este estado
    </div>

    <!-- LISTADO DE RECLAMACIONES -->
    <div v-else class="space-y-4">
      <div
        v-for="rec in reclamacionesFiltradas"
        :key="rec.id"
        class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4"
      >
        <!-- Cabecera de la tarjeta -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="px-2.5 py-1 text-xs font-bold rounded-full"
                :class="claseBadgeEstado(rec.estado_reclamacion)"
              >
                {{ etiquetaEstado(rec.estado_reclamacion) }}
              </span>
              <span v-if="rec.fecha_solicitud" class="text-xs text-gray-500">
                Solicitada: {{ formatearFecha(rec.fecha_solicitud) }}
              </span>
              <span
                v-if="rec.fecha_resolucion"
                class="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded"
              >
                Resuelta/Cerrada: {{ formatearFecha(rec.fecha_resolucion) }}
              </span>
            </div>
            <p class="font-bold text-lg text-gray-900">
              {{ rec.garantias?.numero_serie }} - {{ rec.garantias?.modelo_producto }}
            </p>
            <p v-if="rec.garantias?.cliente_email" class="text-xs text-gray-500">
              Cliente: {{ rec.garantias.cliente_email }}
            </p>
          </div>

          <button
            type="button"
            @click="contactarCliente(rec.garantias?.cliente_email || '')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition whitespace-nowrap self-start md:self-center"
          >
            📞 Contactar Cliente
          </button>
        </div>

        <!-- Detalles de la reclamación -->
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
          <p class="text-gray-800">
            <span class="font-semibold text-gray-900">Motivo:</span>
            {{ rec.motivo_reclamacion }}
          </p>
          <p class="text-gray-700 whitespace-pre-line">
            <span class="font-semibold text-gray-900">Descripción detallada:</span>
            {{ rec.descripcion_detallada || 'Sin descripción adicional' }}
          </p>

          <!-- Evidencia URL con validación anti-XSS -->
          <div v-if="rec.evidencia_url" class="pt-1">
            <span class="font-semibold text-gray-900">Evidencia: </span>
            <a
              v-if="esUrlSegura(rec.evidencia_url)"
              :href="rec.evidencia_url.trim()"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 underline font-medium break-all"
            >
              🔗 {{ rec.evidencia_url.trim() }}
            </a>
            <span v-else class="text-gray-600 font-mono text-xs break-all">
              {{ rec.evidencia_url }} (URL no verificable como enlace seguro)
            </span>
          </div>
        </div>

        <!-- Panel de gestión técnica (Estado + Notas del técnico) -->
        <div class="pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label
              :for="`estado-${rec.id}`"
              class="block text-xs font-bold uppercase text-gray-600 mb-1"
            >
              Estado de Reclamación
            </label>
            <select
              :id="`estado-${rec.id}`"
              :value="rec.id ? (estadoBorrador[rec.id] ?? rec.estado_reclamacion) : rec.estado_reclamacion"
              :disabled="guardandoId === rec.id"
              @change="
                (e) =>
                  handleCambiarEstado(
                    rec,
                    (e.target as HTMLSelectElement).value as ReclamacionEstado,
                  )
              "
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option
                v-for="op in estadosOpciones"
                :key="op.valor"
                :value="op.valor"
              >
                {{ op.etiqueta }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div class="flex-1">
              <label
                :for="`notas-${rec.id}`"
                class="block text-xs font-bold uppercase text-gray-600 mb-1"
              >
                Notas del Técnico
              </label>
              <textarea
                v-if="rec.id"
                :id="`notas-${rec.id}`"
                v-model="notasBorrador[rec.id]"
                rows="2"
                :disabled="guardandoId === rec.id"
                placeholder="Agrega observaciones técnicas o detalles de la resolución..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none h-[62px]"
              ></textarea>
            </div>
            <button
              type="button"
              :disabled="guardandoId === rec.id"
              @click="handleGuardarNotas(rec)"
              class="h-[62px] px-5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-2"
            >
              {{ guardandoId === rec.id ? '⏳ Guardando...' : '💾 Guardar Notas' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

