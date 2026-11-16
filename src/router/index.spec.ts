import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore'
import type { User } from '@supabase/supabase-js'
import router from './index'

vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}))

describe('Router Security Guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // TEST 1: El caso base (Público)
  it('permite acceder a rutas publicas como /login sin tener sesion', async () => {
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(false)
    authStore.isInitialized = true

    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/login')
  })

  // TEST 2: Protección contra usuarios anónimos
  it('bloquea el acceso a rutas protegidas sin sesion y redirige a /login', async () => {
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(false)
    authStore.isInitialized = true

    await router.push('/reclamaciones')

    expect(router.currentRoute.value.path).toBe('/login')
  })

  // TEST 3: Autorización Exitosa
  it('permite el acceso a /reclamaciones si eres un Empleado autenticado y activo', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: '1', email: 'emp@empresa.com' } as User
    authStore.profile = { id: '1', rol: 'empleado', activo: true }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/reclamaciones')

    expect(router.currentRoute.value.path).toBe('/reclamaciones')
  })

  // TEST 4: Fuga de Permisos (Caso Crítico de Seguridad)
  it('bloquea el acceso al Gestor de Roles (/admin/roles) si eres un Empleado y redirige a /', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: '1', email: 'emp@empresa.com' } as User
    authStore.profile = { id: '1', rol: 'empleado', activo: true }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/admin/roles')

    expect(router.currentRoute.value.path).toBe('/')
  })

  // TEST 5: Usuario autenticado sin rol empresarial válido (sin bucle infinito)
  it('redirige a /perfil si un usuario autenticado sin rol valido intenta acceder a / o /garantias', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: '2', email: 'cliente@empresa.com' } as User
    authStore.profile = { id: '2', rol: 'cliente', activo: true }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/garantias')
    expect(router.currentRoute.value.path).toBe('/perfil')

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/perfil')
  })

  // TEST 6: Cuenta inactiva (activo = false) no puede entrar a rutas operativas
  it('redirige a /perfil si una cuenta con activo = false intenta acceder a rutas operativas', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: '3', email: 'baja@empresa.com' } as User
    authStore.profile = { id: '3', rol: 'admin', activo: false }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/admin/roles')
    expect(router.currentRoute.value.path).toBe('/perfil')

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/perfil')
  })

  // TEST 7: El guard espera a ensureProfile antes de evaluar roles (sin race condition)
  it('espera a ensureProfile antes de decidir el acceso a rutas protegidas', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: '4', email: 'admin@empresa.com' } as User
    authStore.profile = null
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    const ensureSpy = vi.spyOn(authStore, 'ensureProfile').mockImplementation(async () => {
      authStore.profile = { id: '4', rol: 'admin', activo: true }
    })

    await router.push('/admin/roles')

    expect(ensureSpy).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/admin/roles')
  })
})
