<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'

const route = useRoute()

const pageTitle = computed(() => {
  switch (route.name) {
    case 'home':
      return 'Accueil'
    case 'domaines':
      return 'Domaines'
    default:
      return 'Flashcards'
  }
})

</script>

<template>
  <div class="app-container">
    <Header :title="pageTitle" />

    <RouterView />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: #f8f9fa;
}
</style>


