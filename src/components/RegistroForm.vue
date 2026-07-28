<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { garantiaRegistroSchema } from '../lib/schema'
import { generarHashGarantia } from '../utils/cryptoUtils'
import QRCode from 'qrcode'

// --- ESTADO ---
const formData = ref({
  numero_serie: '',
  modelo_producto: '',
  cliente_email: '',
  fecha_venta: new Date().toISOString().split('T')[0],
  duracion_meses: 12,
})

const loading = ref(false)
const errorMsg = ref<string | null>(null)
const successData = ref<{ qr: string; hash: string } | null>(null)

// --- LÓGICA ---
const fechaVencimiento = computed(() => {
  if (!formData.value.fecha_venta) return 'Esperando fecha...'
  const d = new Date(formData.value.fecha_venta)

  if (isNaN(d.getTime())) return 'Fecha inválida'
  d.setMonth(d.getMonth() + formData.value.duracion_meses)
  return d.toISOString().split('T')[0]
})

const validar = (): string | null => {
  const result = garantiaRegistroSchema.safeParse(formData.value)
  if (!result.success) {
    return result.error.issues[0]?.message ?? 'Datos del formulario inválidos'
  }

  const venc = fechaVencimiento.value
  if (
    venc === undefined ||
    venc === 'Esperando fecha...' ||
    venc === 'Fecha inválida' ||
    venc.length !== 10
  ) {
    return 'Fecha de venta o duración inválida'
  }

  return null
}

async function handleSubmit() {
  const errorVal = validar()
  if (errorVal) return (errorMsg.value = errorVal)

  loading.value = true
  errorMsg.value = null

  try {
    const hash = generarHashGarantia(formData.value.numero_serie, formData.value.cliente_email)

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const urlVerificacion = `${appUrl}/verificar/${hash}`

    const qrImage = await QRCode.toDataURL(urlVerificacion)

    // 3. Insertar en Supabase
    const { error } = await supabase.from('garantias').insert([
      {
        ...formData.value,
        fecha_vencimiento: fechaVencimiento.value,
        hash_certificado: hash,
        qr_url: urlVerificacion,
      },
    ])

    if (error) {
      if (error.code === '23505') throw new Error('Este número de serie ya está registrado')
      throw error
    }

    successData.value = { qr: qrImage, hash: hash }
  } catch (err: unknown) {
    const errorEncontrado = err as Error
    errorMsg.value = errorEncontrado.message
  } finally {
    loading.value = false
  }
}

// --- ACCIONES EXTRAS ---
const descargarQR = () => {
  const link = document.createElement('a')
  link.href = successData.value!.qr
  link.download = `QR-${formData.value.numero_serie}.png`
  link.click()
}
</script>

<template>
  <div class="w-full h-full min-h-[calc(100vh-4rem)] flex items-center justify-center py-4 sm:py-8">
    <!-- FORMULARIO -->
    <div v-if="!successData" class="w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <div class="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 md:p-12 border border-gray-100">
        <h2
          class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 mb-4 sm:mb-8 text-center"
        >
          Registro de Garantía Digital
        </h2>

        <div
          v-if="errorMsg"
          class="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 text-red-600 rounded-lg text-sm sm:text-base border border-red-200 italic"
        >
          ⚠️ {{ errorMsg }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <input
              v-model="formData.numero_serie"
              placeholder="Número de Serie (Ej: SN-990)"
              class="w-full p-3 sm:p-4 text-base sm:text-lg bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 transition"
              required
            />
            <input
              v-model="formData.modelo_producto"
              placeholder="Modelo del Producto"
              class="w-full p-3 sm:p-4 text-base sm:text-lg bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 transition"
              required
            />
          </div>

          <input
            v-model="formData.cliente_email"
            type="email"
            placeholder="Email del Cliente"
            class="w-full p-3 sm:p-4 text-base sm:text-lg bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 transition"
            required
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label class="text-xs sm:text-sm font-bold text-gray-600 block mb-2"
                >FECHA DE VENTA</label
              >
              <input
                v-model="formData.fecha_venta"
                type="date"
                class="w-full p-3 sm:p-4 text-base sm:text-lg bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 transition"
              />
            </div>
            <div>
              <label class="text-xs sm:text-sm font-bold text-gray-600 block mb-2"
                >DURACIÓN DE GARANTÍA</label
              >
              <select
                v-model.number="formData.duracion_meses"
                class="w-full p-3 sm:p-4 text-base sm:text-lg bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-900 transition"
              >
                <option :value="6">6 Meses</option>
                <option :value="12">1 Año (12 meses)</option>
                <option :value="24">2 Años (24 meses)</option>
                <option :value="36">3 Años (36 meses)</option>
              </select>
            </div>
          </div>

          <div
            class="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200"
          >
            <p class="text-gray-700 text-base sm:text-lg font-semibold">
              📅 Fecha de Vencimiento:
              <span class="text-blue-600 font-bold text-lg sm:text-xl">{{ fechaVencimiento }}</span>
            </p>
          </div>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold text-base sm:text-lg p-3 sm:p-4 rounded-2xl transition shadow-lg hover:shadow-xl"
          >
            {{ loading ? '⏳ Protegiendo datos...' : '✨ Generar Certificado Digital' }}
          </button>
        </form>
      </div>
    </div>

    <!-- RESULTADO -->
    <div v-else class="w-full md:max-w-3xl lg:max-w-4xl">
      <div
        class="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 md:p-12 text-center border-4 border-green-200"
      >
        <div
          class="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-4xl sm:text-5xl shadow-lg"
        >
          ✓
        </div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
          ¡Garantía Registrada!
        </h2>
        <p class="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8">
          Tu certificado digital ha sido creado exitosamente
        </p>
        <div
          class="bg-gray-50 p-4 sm:p-8 rounded-2xl border-2 border-gray-200 inline-block mb-6 sm:mb-8"
        >
          <img :src="successData.qr" alt="QR Code" class="w-48 h-48 sm:w-64 sm:h-64" />
        </div>
        <div class="bg-gray-100 p-3 sm:p-4 rounded-lg border border-gray-300 mb-6 sm:mb-8">
          <p class="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase mb-2">
            Código Único (SHA-256):
          </p>
          <p
            class="text-[10px] sm:text-xs text-gray-800 font-mono break-all bg-white p-2 sm:p-3 rounded border border-gray-200"
          >
            {{ successData.hash }}
          </p>
        </div>
        <div class="space-y-3">
          <button
            @click="descargarQR"
            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base sm:text-lg p-3 sm:p-4 rounded-xl transition shadow-lg"
          >
            📥 Descargar Imagen QR
          </button>
          <button
            @click="successData = null"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base sm:text-lg p-3 sm:p-4 rounded-xl transition shadow-lg"
          >
            ➕ Registrar Otra Garantía
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
