import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '@/core/config/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  rol: string
  activo: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const profileError = ref<string | null>(null)
  const sessionData = ref<Session | null>(null)
  const isInitialized = ref(false)
  const now = ref(Date.now())

  let initPromise: Promise<void> | null = null
  let profilePromise: Promise<void> | null = null
  let expirationTimer: ReturnType<typeof setTimeout> | null = null

  const clearExpirationTimer = () => {
    if (expirationTimer !== null) {
      clearTimeout(expirationTimer)
      expirationTimer = null
    }
  }

  const scheduleExpirationCheck = (session: Session | null) => {
    clearExpirationTimer()
    now.value = Date.now()
    if (!session?.expires_at) return

    const msUntilExpiry = session.expires_at * 1000 - now.value
    if (msUntilExpiry <= 0) return

    // Limitar setTimeout a 2^31 - 1 ms (~24.8 días) para evitar desbordamiento de 32 bits en JS
    const delay = Math.min(msUntilExpiry + 50, 2_147_483_647)
    expirationTimer = setTimeout(() => {
      now.value = Date.now()
      if (sessionData.value?.expires_at && now.value < sessionData.value.expires_at * 1000) {
        scheduleExpirationCheck(sessionData.value)
      }
    }, delay)
  }

  // Reprograma el temporizador síncronamente cada vez que cambia sessionData (incluyendo tests)
  watch(sessionData, (newSession) => scheduleExpirationCheck(newSession), {
    immediate: true,
    flush: 'sync',
  })

  // Validar si el token expiró (reactivo al paso del tiempo mediante `now`)
  const isSessionValid = computed(() => {
    if (!sessionData.value?.expires_at) return !!user.value
    return now.value < sessionData.value.expires_at * 1000
  })

  const isAuthenticated = computed(() => !!user.value && isSessionValid.value)
  const isActive = computed(() => isAuthenticated.value && profile.value?.activo === true)
  const isAdmin = computed(() => isActive.value && profile.value?.rol === 'admin')
  const isEmpleado = computed(() => isActive.value && profile.value?.rol === 'empleado')

  const fetchProfile = async (userId: string) => {
    profileError.value = null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, rol, activo')
      .eq('id', userId)
      .single()

    if (!error && data) {
      profile.value = {
        id: data.id,
        rol: data.rol,
        activo: data.activo ?? true,
      }
    } else {
      profile.value = null
      if (error) {
        profileError.value = error.message
      }
    }
  }

  const startProfileLoad = (userId: string): Promise<void> => {
    if (profilePromise) return profilePromise
    profilePromise = fetchProfile(userId).finally(() => {
      profilePromise = null
    })
    return profilePromise
  }

  /**
   * Garantiza que el perfil del usuario autenticado esté cargado antes de evaluar roles.
   * Evita condiciones de carrera entre el callback de onAuthStateChange, el login y el router guard.
   */
  const ensureProfile = async (): Promise<void> => {
    if (!user.value || !isSessionValid.value) return
    if (profilePromise) {
      await profilePromise
      return
    }
    if (!profile.value || profile.value.id !== user.value.id) {
      await startProfileLoad(user.value.id)
    }
  }

  /**
   * Sincroniza explícitamente una sesión recién obtenida (ej. tras signInWithPassword)
   * y espera a que el perfil quede disponible antes de navegar.
   */
  const syncSession = async (session: Session | null): Promise<void> => {
    sessionData.value = session
    if (session?.user) {
      user.value = session.user
      await ensureProfile()
    } else {
      user.value = null
      profile.value = null
      profileError.value = null
    }
  }

  const initialize = async () => {
    if (isInitialized.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          user.value = data.session.user
          sessionData.value = data.session
          await startProfileLoad(data.session.user.id)
        }

        // Listener estrictamente síncrono: nunca usar `await` directo dentro del callback de GoTrue
        supabase.auth.onAuthStateChange((_event, session) => {
          sessionData.value = session
          if (session?.user) {
            user.value = session.user
            if (!profile.value || profile.value.id !== session.user.id) {
              void startProfileLoad(session.user.id)
            }
          } else {
            user.value = null
            profile.value = null
            profileError.value = null
            profilePromise = null
          }
        })

        isInitialized.value = true
      } finally {
        initPromise = null
      }
    })()

    return initPromise
  }

  return {
    user,
    profile,
    profileError,
    sessionData,
    isInitialized,
    isAuthenticated,
    isActive,
    isAdmin,
    isEmpleado,
    isSessionValid,
    initialize,
    ensureProfile,
    syncSession,
  }
})
