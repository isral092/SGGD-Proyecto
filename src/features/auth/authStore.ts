import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/core/config/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  rol: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const sessionData = ref<Session | null>(null)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.rol === 'admin')
  const isEmpleado = computed(() => profile.value?.rol === 'empleado')
  
  // Validar si el token expiró (comprobación en memoria, sin promesas)
  const isSessionValid = computed(() => {
    if (!sessionData.value?.expires_at) return !!user.value
    // expires_at viene en segundos, Date.now() en ms.
    return Date.now() < (sessionData.value.expires_at * 1000)
  })

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
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      user.value = data.session.user
      sessionData.value = data.session
      await fetchProfile(data.session.user.id)
    }

    // Escuchar cambios
    supabase.auth.onAuthStateChange(async (event, session) => {
      sessionData.value = session
      if (session?.user) {
        user.value = session.user
        if (!profile.value || profile.value.id !== session.user.id) {
            await fetchProfile(session.user.id)
        }
      } else {
        user.value = null
        profile.value = null
        sessionData.value = null
      }
    })

    isInitialized.value = true
  }

  return {
    user,
    profile,
    sessionData,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isEmpleado,
    isSessionValid,
    initialize
  }
})
