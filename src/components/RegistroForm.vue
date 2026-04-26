<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import CryptoJS from 'crypto-js'
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

const validar = () => {
  if (formData.value.numero_serie.length < 3) return 'Serial demasiado corto'
  if (!formData.value.cliente_email.includes('@')) return 'Email inválido'
  return null
}

async function handleSubmit() {
  const errorVal = validar()
  if (errorVal) return (errorMsg.value = errorVal)

  loading.value = true
  errorMsg.value = null

  try {
    // 1. Hash SHA-256 (Demostrativo para proyecto escolar)
    const semilla = `${formData.value.numero_serie}-${formData.value.cliente_email}-PROYECTO_2024`
    const hash = CryptoJS.SHA256(semilla).toString()

    // 2. URL y QR
    // En tu RegistroForm.vue, asegúrate de que la URL sea así:
    const urlVerificacion = `https://tu-app-desplegada.vercel.app/verificar/${hash}`
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
  } catch (err) {
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
  <div class="max-w-xl mx-auto p-4">
    <div v-if="!successData" class="bg-white shadow-2xl rounded-3xl p-8 border border-gray-100">
      <h2 class="text-3xl font-extrabold text-gray-800 mb-6 text-center">Registro de Garantía</h2>

      <div
        v-if="errorMsg"
        class="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 italic"
      >
        ⚠️ {{ errorMsg }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <input
          v-model="formData.numero_serie"
          placeholder="Número de Serie (Ej: SN-990)"
          class="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          v-model="formData.modelo_producto"
          placeholder="Modelo del Producto"
          class="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          v-model="formData.cliente_email"
          type="email"
          placeholder="Email del Cliente"
          class="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <div class="flex gap-4">
          <div class="flex-1">
            <label class="text-xs font-bold text-gray-400 ml-2">FECHA VENTA</label>
            <input
              v-model="formData.fecha_venta"
              type="date"
              class="w-full p-3 bg-gray-50 rounded-xl border-none"
            />
          </div>
          <div class="flex-1">
            <label class="text-xs font-bold text-gray-400 ml-2">DURACIÓN</label>
            <select
              v-model="formData.duracion_meses"
              class="w-full p-3 bg-gray-50 rounded-xl border-none"
            >
              <option :value="12">1 Año</option>
              <option :value="24">2 Años</option>
            </select>
          </div>
        </div>

        <div class="p-4 bg-blue-50 rounded-2xl text-blue-700 text-sm font-medium">
          Vence el: <span class="font-bold">{{ fechaVencimiento }}</span>
        </div>

        <button
          :disabled="loading"
          class="w-full bg-blue-600 text-white font-bold p-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          {{ loading ? 'Protegiendo datos...' : 'Generar Certificado Digital' }}
        </button>
      </form>
    </div>

    <div v-else class="bg-white shadow-2xl rounded-3xl p-8 text-center border-2 border-green-100">
      <div
        class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
      >
        ✓
      </div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">¡Garantía Blindada!</h2>
      <img :src="successData.qr" class="mx-auto w-48 h-48 my-4 p-2 bg-white border rounded-xl" />
      <p class="text-[10px] text-gray-400 font-mono mb-6 truncate">{{ successData.hash }}</p>

      <div class="flex flex-col gap-2">
        <button
          @click="descargarQR"
          class="w-full bg-green-600 text-white p-3 rounded-xl font-bold"
        >
          Descargar Imagen QR
        </button>
        <button @click="successData = null" class="text-gray-500 text-sm">
          Registrar otro equipo
        </button>
      </div>
    </div>
  </div>
</template>
