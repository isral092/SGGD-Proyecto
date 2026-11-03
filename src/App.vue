<script setup lang="ts">
import AppNavbar from '@/shared/layout/AppNavbar.vue'
</script>

<template>
  <div id="app" class="min-h-screen flex flex-col bg-gray-50">
    <AppNavbar />
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
