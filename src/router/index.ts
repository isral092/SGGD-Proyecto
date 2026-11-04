import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../features/garantias/GarantiaRegistro.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin', 'empleado'] },
    },
    {
      path: '/reclamaciones',
      name: 'reclamaciones',
      component: () => import('../features/reclamaciones/ReclamacionListado.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin', 'empleado'] },
    },
    {
      path: '/garantias',
      name: 'garantias',
      component: () => import('../features/garantias/GarantiaListado.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin', 'empleado'] },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../features/auth/AuthLogin.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: () => import('../features/usuarios/UsuarioPerfil.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/roles',
      name: 'admin-roles',
      component: () => import('../features/usuarios/UsuariosListado.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/verificar/:hash',
      name: 'verificar',
      component: () => import('../features/garantias/GarantiaVerificacion.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // Usar la comprobación en memoria súper rápida para evitar que el router se congele
  // si supabase se queda colgado intentando refrescar el token
  const isActuallyAuthenticated = authStore.isSessionValid

  if (to.meta.requiresAuth) {
    if (!isActuallyAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.allowedRoles) {
      const allowedRoles = to.meta.allowedRoles as string[]
      const userRole = authStore.profile?.rol

      if (!userRole || !allowedRoles.includes(userRole)) {
        // Si el usuario es admin o empleado (ej. empleado intentando entrar a /admin/roles), mandarlo a home (/).
        // Si no tiene rol válido ni para home, mandarlo a /perfil para evitar un bucle infinito de redirección.
        const fallbackRoute =
          userRole && ['admin', 'empleado'].includes(userRole) && to.name !== 'home'
            ? 'home'
            : 'perfil'
        return { name: fallbackRoute }
      }
    }

    return true
  } else if (isActuallyAuthenticated && to.name === 'login') {
    return { name: 'home' }
  } else {
    return true
  }
})

export default router
