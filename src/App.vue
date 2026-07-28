<script setup lang="ts">
import AppNavbar from './components/AppNavbar.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/core/stores/useAuthStore'

const route = useRoute()
const routeKey = computed(() => route.path)
const authStore = useAuthStore()

onMounted(() => {
  authStore.initialize()
})
</script>

<template>
  <div id="app" class="min-h-screen flex flex-col bg-gray-50">
    <AppNavbar />
    <main class="flex-1 w-full">
      <!-- ✅ Key fuerza recarga del componente al cambiar ruta -->
      <router-view :key="routeKey" />
    </main>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
}
</style>
