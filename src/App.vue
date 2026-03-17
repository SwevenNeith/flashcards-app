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
    case 'categories':
      return route.params.domainName || 'Catégories'
    case 'flashcards':
      return route.params.categoryName || 'Flashcards'
    case 'test': {
      const type = route.query.type
      const domainName = route.query.domainName
      const categoryName = route.query.categoryName
      if (type === 'Catégorie' && domainName && categoryName) {
        return `${domainName} / ${categoryName}`
      } else if (domainName) {
        return `${domainName}`
      }
      return 'Test'
    }
    case 'statistiques':
      return 'Statistiques'
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
  overflow-x: hidden;
}
</style>


