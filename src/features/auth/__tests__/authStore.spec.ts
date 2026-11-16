import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'
import { supabase } from '@/core/config/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

const singleMock = vi.fn()

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    singleMock.mockResolvedValue({ data: { id: 'u1', rol: 'admin', activo: true }, error: null })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sincroniza isAuthenticated e isAdmin con isSessionValid cuando cambia sessionData', () => {
    const store = useAuthStore()
    store.user = { id: 'u1', email: 'admin@empresa.com' } as User
    store.profile = { id: 'u1', rol: 'admin', activo: true }

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

  it('expira la sesión reactivamente al avanzar el reloj sin reemplazar sessionData', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))

    const store = useAuthStore()
    store.user = { id: 'u1', email: 'admin@empresa.com' } as User
    store.profile = { id: 'u1', rol: 'admin', activo: true }

    // Token expira en exactamente 60 segundos
    store.sessionData = { expires_at: Math.floor(Date.now() / 1000) + 60 } as Session
    expect(store.isSessionValid).toBe(true)
    expect(store.isAdmin).toBe(true)

    // Avanzamos 30s: sigue vigente
    vi.advanceTimersByTime(30_000)
    expect(store.isSessionValid).toBe(true)

    // Avanzamos otros 31s (61s totales): debe expirar automáticamente
    vi.advanceTimersByTime(31_000)
    expect(store.isSessionValid).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  it('bloquea permisos operativos (isActive/isAdmin/isEmpleado) cuando activo es false o el id del perfil no coincide', () => {
    const store = useAuthStore()
    store.user = { id: 'u2', email: 'baja@empresa.com' } as User
    store.sessionData = { expires_at: Math.floor(Date.now() / 1000) + 3600 } as Session
    store.profile = { id: 'u2', rol: 'admin', activo: false }

    expect(store.isAuthenticated).toBe(true)
    expect(store.isActive).toBe(false)
    expect(store.isAdmin).toBe(false)
    expect(store.isEmpleado).toBe(false)

    // Perfil desincronizado de otro usuario
    store.profile = { id: 'u-otro', rol: 'admin', activo: true }
    expect(store.isActive).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  it('descarta respuestas tardías de fetchProfile si el usuario cambió (carrera A-tarde / B-temprano)', async () => {
    let authCallback: ((event: string, session: Session | null) => void) | undefined
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authCallback = cb as (event: string, session: Session | null) => void
      return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >
    })

    let resolveA!: (val: { data: { id: string; rol: string; activo: boolean }; error: null }) => void
    let resolveB!: (val: { data: { id: string; rol: string; activo: boolean }; error: null }) => void

    singleMock
      .mockImplementationOnce(() => new Promise((resolve) => (resolveA = resolve)))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveB = resolve)))

    const store = useAuthStore()
    await store.initialize()

    const sesionA = {
      user: { id: 'user-A', email: 'adminA@empresa.com' } as User,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session

    const sesionB = {
      user: { id: 'user-B', email: 'empB@empresa.com' } as User,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session

    // 1. A inicia sesión (su petición queda en vuelo)
    authCallback?.('SIGNED_IN', sesionA)

    // 2. B inicia sesión antes de que responda A
    authCallback?.('SIGNED_IN', sesionB)

    // 3. Responde B primero (empleado)
    resolveB({ data: { id: 'user-B', rol: 'empleado', activo: true }, error: null })
    await store.ensureProfile()

    expect(store.profile).toEqual({ id: 'user-B', rol: 'empleado', activo: true })
    expect(store.isEmpleado).toBe(true)
    expect(store.isAdmin).toBe(false)

    // 4. Llega tarde la respuesta de A (admin): debe ser descartada
    resolveA({ data: { id: 'user-A', rol: 'admin', activo: true }, error: null })
    await Promise.resolve()
    await Promise.resolve()

    expect(store.user?.id).toBe('user-B')
    expect(store.profile).toEqual({ id: 'user-B', rol: 'empleado', activo: true })
    expect(store.isAdmin).toBe(false)
    expect(store.isEmpleado).toBe(true)
  })

  it('onAuthStateChange agenda la carga sin bloquear y syncSession/ensureProfile esperan el perfil', async () => {
    let authCallback: ((event: string, session: Session | null) => void) | undefined
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authCallback = cb as (event: string, session: Session | null) => void
      return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >
    })

    let resolveProfile!: (val: { data: { id: string; rol: string; activo: boolean }; error: null }) => void
    singleMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        }),
    )

    const store = useAuthStore()
    await store.initialize()

    const nuevaSesion = {
      user: { id: 'u-nuevo', email: 'nuevo@empresa.com' } as User,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session

    authCallback?.('SIGNED_IN', nuevaSesion)
    expect(store.profile).toBeNull()

    const espera = store.syncSession(nuevaSesion)
    expect(singleMock).toHaveBeenCalledTimes(1)

    resolveProfile({ data: { id: 'u-nuevo', rol: 'empleado', activo: true }, error: null })
    await espera

    expect(store.profile).toEqual({ id: 'u-nuevo', rol: 'empleado', activo: true })
    expect(store.isEmpleado).toBe(true)
  })

  it('signIn autentica, carga el perfil y limpia la sesión con signOut si fetchProfile falla', async () => {
    const mockSession = {
      user: { id: 'u-err', email: 'err@empresa.com' } as User,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: mockSession.user, session: mockSession },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>)

    singleMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch profile' },
    })

    const store = useAuthStore()
    await expect(store.signIn('  ERR@empresa.com  ', 'secreto123')).rejects.toThrow(
      'No se pudo cargar tu perfil: Failed to fetch profile',
    )

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'err@empresa.com',
      password: 'secreto123',
    })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(store.user).toBeNull()
    expect(store.sessionData).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('signOut limpia completamente el estado de usuario, perfil y sesión', async () => {
    const store = useAuthStore()
    store.user = { id: 'u1', email: 'admin@empresa.com' } as User
    store.profile = { id: 'u1', rol: 'admin', activo: true }
    store.sessionData = { expires_at: Math.floor(Date.now() / 1000) + 3600 } as Session

    await store.signOut()

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(store.user).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.sessionData).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('initialize evita registrar multiples listeners si se invoca concurrentemente', async () => {
    const store = useAuthStore()

    await Promise.all([store.initialize(), store.initialize()])

    expect(store.isInitialized).toBe(true)
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })
})
