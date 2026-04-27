import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/verificar/:hash',
      name: 'verificar',
      component: () => import('../views/VerificarGarantia.vue'),
      // ✅ Validar que hash sea un hexadecimal válido
      /* beforeEnter: (to, from, next) => {
        const hash = to.params.hash as string

        // Hash SHA-256 siempre tiene 64 caracteres hexadecimales
        if (!/^[a-f0-9]{64}$/i.test(hash)) {
          console.error('Hash inválido:', hash)
          next('/') // Redirigir al inicio
        } else {
          next()
        }
      }, */
    },
    // ✅ Ruta catch-all para URLs no encontradas
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
