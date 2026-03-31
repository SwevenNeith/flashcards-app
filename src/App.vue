<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'

const route = useRoute()
const showTopBtn = ref(false)

import { watch } from 'vue'

const handleScroll = () => {
  // Absolute scroll position detection
  const scrollPos = window.pageYOffset || 
                    document.documentElement.scrollTop || 
                    document.body.scrollTop || 
                    0
  showTopBtn.value = scrollPos > 100
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// Watch navigation to reset
watch(() => route.fullPath, () => {
  showTopBtn.value = false
  window.scrollTo(0, 0)
}, { immediate: true })

let scrollTimer = null

onMounted(() => {
  // Option 1: Scroll listeners (Keep for older browsers, although Observer is well supported)
  window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
  
  // Option 2: Intersection Observer (Most reliable for mobile "at top" detection)
  const sentinel = document.getElementById('top-sentinel')
  if (sentinel) {
    const observer = new IntersectionObserver((entries) => {
      // If NOT intersecting, we are NOT at the top -> show button
      showTopBtn.value = !entries[0].isIntersecting
    }, { threshold: 0 })
    observer.observe(sentinel)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll, { capture: true })
  if (scrollTimer) clearInterval(scrollTimer)
})

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
  <!-- Sentinelle invisible tout en haut pour la détection du scroll -->
  <div id="top-sentinel" style="position: absolute; top: 0; left: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; z-index: -1;"></div>
  
  <div class="app-container">
    <Header :title="pageTitle" />

    <RouterView />
  </div>

  <!-- Bouton de retour en haut (HORS DU CONTAINER pour éviter les conflits CSS) -->
  <transition name="fade-scale">
    <button 
      v-if="showTopBtn" 
      class="scroll-top-btn" 
      @click="scrollToTop"
      aria-label="Retour en haut"
    >
      <svg viewBox="0 0 24 24" width="28" height="28">
        <path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
      </svg>
    </button>
  </transition>
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

.scroll-top-btn {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: #048B9A;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(4,139,154,0.4);
  z-index: 2147483647 !important; /* Valeur maximale pour passer devant absolument tout */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.scroll-top-btn:hover {
  background-color: #037380;
  transform: translateY(-5px);
  box-shadow: 0 6px 20px rgba(4,139,154,0.5);
}

.scroll-top-btn:active {
  transform: scale(0.9);
}

@media (max-width: 600px) {
  .scroll-top-btn {
    bottom: 20px !important;
    right: 20px !important;
    width: 50px;
    height: 50px;
  }
}

/* Transitions */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>


