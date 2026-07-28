import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/core/config/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  rol: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.rol === 'admin')
  const isEmpresa = computed(() => profile.value?.rol === 'empresa')
  const isCliente = computed(() => profile.value?.rol === 'cliente')

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, rol')
      .eq('id', userId)
      .single()

    if (!error && data) {
      profile.value = data
    } else {
      profile.value = null
    }
  }

  const initialize = async () => {
    if (isInitialized.value) return

    // Revisar sesión actual
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await fetchProfile(session.user.id)
    }

    // Escuchar cambios en la autenticación (login, logout)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        user.value = session.user
        await fetchProfile(session.user.id)
      } else {
        user.value = null
        profile.value = null
      }
    })

    isInitialized.value = true
  }

  return {
    user,
    profile,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isEmpresa,
    isCliente,
    initialize
  }
})
