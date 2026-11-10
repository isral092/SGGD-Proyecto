<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/shared/layout/AppNavbar.vue'

const route = useRoute()
const showNavbar = computed(() => route.name !== 'login')
</script>

<template>
  <div id="app" class="min-h-screen flex flex-col bg-gray-50">
    <AppNavbar v-if="showNavbar" />
    <main class="flex-1 w-full">
      <router-view />
    </main>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
}
</style>
