<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/core/config/supabaseClient'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const isSignUp = ref(false)

async function handleAuth() {
  if (!email.value || !password.value) {
    error.value = 'Por favor completa todos los campos'
    return
  }

  loading.value = true
  error.value = null

  try {
    if (isSignUp.value) {
      // REGISTRO
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })

      if (signUpError) throw signUpError

      error.value = '✅ Registro exitoso. Por favor inicia sesión.'
      isSignUp.value = false
      email.value = ''
      password.value = ''
    } else {
      // LOGIN
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })

      if (signInError) throw signInError

      const redirect =
        typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
          ? route.query.redirect
          : '/'
      router.push(redirect)
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Error desconocido'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-screen -ml-[calc((100vw-100%)/2)] min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-12">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-12">
        <h1 class="text-6xl font-bold text-blue-600 mb-2">🛡️ SGGD</h1>
        <p class="text-gray-600 text-xl">Sistema de Garantías Digitales</p>
      </div>

      <!-- Tarjeta -->
      <div class="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
        <!-- Título -->
        <h2 class="text-3xl font-bold text-gray-800 mb-8 text-center">
          {{ isSignUp ? '📝 Crear Cuenta' : '🔐 Iniciar Sesión' }}
        </h2>

        <!-- Error -->
        <div
          v-if="error"
          :class="[
            'mb-6 p-4 rounded-lg text-sm font-medium',
            error.includes('✅')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          ]"
        >
          {{ error }}
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleAuth" class="space-y-6">
          <!-- Email -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              class="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-300 text-gray-900 transition"
              required
            />
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-300 text-gray-900 transition"
              required
            />
          </div>

          <!-- Botón -->
          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold text-lg p-4 rounded-xl transition shadow-lg"
          >
            {{ loading ? '⏳ Procesando...' : isSignUp ? '✅ Crear Cuenta' : '🔓 Entrar' }}
          </button>
        </form>

        <!-- Toggle -->
        <div class="text-center mt-8 pt-8 border-t border-gray-200">
          <p class="text-gray-600 mb-3">
            {{ isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?' }}
          </p>
          <button
            @click="isSignUp = !isSignUp"
            class="text-blue-600 hover:text-blue-700 font-bold text-lg transition"
          >
            {{ isSignUp ? '🔐 Inicia Sesión' : '📝 Crear Cuenta' }}
          </button>
        </div>
      </div>

      <!-- Info -->
      <div class="text-center mt-8 text-gray-600">
        <p class="text-sm">Proyecto Escolar - Taller de Investigación 2026</p>
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

div {
  animation: fadeIn 0.3s ease-in;
}
</style>
