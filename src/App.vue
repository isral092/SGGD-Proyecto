<script setup lang="ts">
import AppNavbar from './components/AppNavbar.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const routeKey = computed(() => route.path)
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
