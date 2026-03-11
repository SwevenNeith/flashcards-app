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
        <router-link to="/" class="logo-link" title="Retour à l'accueil">
          <img src="../assets/flashcards.png" alt="Flashcards Logo" class="header-logo" />
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

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.header-logo {
  height: 32px;
  width: auto;
  border-radius: 4px;
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
</style>
