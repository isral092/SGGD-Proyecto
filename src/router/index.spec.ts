import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore'
import router from './index'

// 1. MOCK (Simulación) DE SUPABASE
// Engañamos al sistema para que crea que Supabase existe, pero le quitamos el poder
// de hacer peticiones reales a internet. No queremos que nuestros tests dependan de la red.
vi.mock('@/core/config/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn()
    }
  }
}))

describe('Router Security Guards', () => {
  beforeEach(() => {
    // 2. SETUP DE ESTADO
    // Antes de cada prueba, creamos un "estado de Pinia" limpio.
    // Esto asegura que la prueba A no afecte los datos de la prueba B.
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // TEST 1: El caso base (Público)
  it('permite acceder a rutas publicas como /login sin tener sesion', async () => {
    const authStore = useAuthStore()
    // Simulamos: "No hay sesión válida" y "Ya se inicializó la app"
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(false)
    authStore.isInitialized = true

    // Intentamos ir a /login
    await router.push('/login')
    
    // Verificamos que el router nos dejó entrar y estamos en /login
    expect(router.currentRoute.value.path).toBe('/login')
  })

  // TEST 2: Protección contra usuarios anónimos
  it('bloquea el acceso a rutas protegidas sin sesion y redirige a /login', async () => {
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(false)
    authStore.isInitialized = true

    // Intentamos ir a /reclamaciones (que es privada)
    await router.push('/reclamaciones')
    
    // Verificamos que nos rebotó al login
    expect(router.currentRoute.value.path).toBe('/login')
  })

  // TEST 3: Autorización Exitosa
  it('permite el acceso a /reclamaciones si eres un Empleado autenticado', async () => {
    const authStore = useAuthStore()
    // Simulamos: "Es un empleado válido"
    authStore.profile = { id: '1', rol: 'empleado' }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/reclamaciones')
    
    // Verificamos que sí nos dejó entrar
    expect(router.currentRoute.value.path).toBe('/reclamaciones')
  })

  // TEST 4: Fuga de Permisos (Caso Crítico de Seguridad)
  it('bloquea el acceso al Gestor de Roles (/admin/roles) si eres un Empleado y redirige a /', async () => {
    const authStore = useAuthStore()
    // Simulamos que un empleado normal intenta entrar al panel de Admin
    authStore.profile = { id: '1', rol: 'empleado' }
    vi.spyOn(authStore, 'isSessionValid', 'get').mockReturnValue(true)
    authStore.isInitialized = true

    await router.push('/admin/roles')
    
    // Verificamos que el guardia lo rebotó al Home (/)
    expect(router.currentRoute.value.path).toBe('/')
  })
})
