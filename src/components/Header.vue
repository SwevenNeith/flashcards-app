<script setup>
import { useRouter, useRoute } from 'vue-router'

defineProps({
  title: {
    type: String,
    default: 'Accueil'
  }
})

const router = useRouter()
const route = useRoute()

const goBack = () => {
  router.back()
}
</script>

<template>
  <header class="main-header">
    <div class="header-content">
      <div class="header-left">
        <router-link to="/" class="logo-link" title="Retour à l'accueil">
          <img src="../assets/flashcards.png" alt="Flashcards Logo" class="header-logo" />
        </router-link>
        
        <button 
          v-if="route.path !== '/'" 
          class="back-button" 
          @click="goBack"
          aria-label="Retour"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
          </svg>
        </button>
      </div>

      <h1>{{ title }}</h1>

      <div class="header-right">
        <router-link to="/domaines" class="icon-link" title="Domaines">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </router-link>
        <router-link to="/statistiques" class="icon-link" title="Statistiques">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.main-header {
  background-color: #048B9A; /* Blue Duck / Teal */
  color: white;
  padding: 0 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left, .header-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-right {
  justify-content: flex-end;
  gap: 0.5rem;
}

.header-logo {
  height: 28px;
  width: auto;
  filter: brightness(0) invert(1);
  transition: opacity 0.2s;
}

.logo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background-color 0.2s;
  text-decoration: none;
}

.logo-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.main-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.back-button {
  background: none;
  border: none;
  color: white;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.icon-link {
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background-color 0.2s;
  text-decoration: none;
}

.icon-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.header-left {
  gap: 0.5rem;
}
</style>
