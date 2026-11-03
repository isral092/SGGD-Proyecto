import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'
import { supabase } from '@/core/config/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'u1', rol: 'admin' }, error: null }),
        })),
      })),
    })),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sincroniza isAuthenticated e isAdmin con isSessionValid cuando el token expira', () => {
    const store = useAuthStore()
    store.user = { id: 'u1', email: 'admin@empresa.com' } as User
    store.profile = { id: 'u1', rol: 'admin' }

    // Token vigente (expira en 1 hora)
    store.sessionData = { expires_at: Math.floor(Date.now() / 1000) + 3600 } as Session
    expect(store.isSessionValid).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.isAdmin).toBe(true)

    // Token expirado (expiró hace 10 minutos)
    store.sessionData = { expires_at: Math.floor(Date.now() / 1000) - 600 } as Session
    expect(store.isSessionValid).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  it('initialize evita registrar multiples listeners si se invoca concurrentemente', async () => {
    const store = useAuthStore()

    // Llamar dos veces al mismo tiempo antes de que resuelva la promesa
    await Promise.all([store.initialize(), store.initialize()])

    expect(store.isInitialized).toBe(true)
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })
})
