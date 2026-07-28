import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/core/config/supabaseClient'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // PÁGINA PRINCIPAL (REQUIERE AUTH)
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: '/reclamaciones',
      name: 'reclamaciones',
      component: () => import('../views/ReclamacionesView.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/garantias',
      name: 'garantias',
      component: () => import('../views/GarantiasView.vue'),
      meta: { requiresAuth: true },
    },

    // LOGIN (PÚBLICO)
    {
      path: '/login',
      name: 'login',
      component: () => import('../features/auth/AuthLogin.vue'),
      meta: { requiresAuth: false }, // ✅ Público, redirigir si ya está logueado
    },

    // MI PERFIL (REQUIERE AUTH)
    {
      path: '/perfil',
      name: 'perfil',
      component: () => import('../views/MiPerfilView.vue'),
      meta: { requiresAuth: true },
    },

    // GESTOR DE ROLES (REQUIERE AUTH + ADMIN)
    {
      path: '/admin/roles',
      name: 'admin-roles',
      component: () => import('../views/GestorRolesView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },

    // VERIFICACIÓN DE GARANTÍA (PÚBLICO)
    {
      path: '/verificar/:hash',
      name: 'verificar',
      component: () => import('../views/VerificarGarantia.vue'),
      meta: { requiresAuth: false }, // ✅ Cualquiera puede verificar con QR
    },

    // CATCH-ALL
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ============================================
// 🛡️ GUARD DE NAVEGACIÓN GLOBAL
// ============================================
router.beforeEach(async (to, from, next) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    if (!user) {
      // No autenticado → redirigir a login
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      // Verificar si requiere admin
      if (to.meta.requiresAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (profile?.rol !== 'admin') {
          // No es admin → redirigir a home
          next({ name: 'home' })
          return
        }
      }
      next() // ✅ Permitir acceso
    }
  }
  // Si la ruta es pública pero ya está autenticado
  else if (user && to.name === 'login') {
    next({ name: 'home' }) // Redirigir a home
  } else {
    next() // ✅ Permitir acceso a rutas públicas
  }
})

export default router
