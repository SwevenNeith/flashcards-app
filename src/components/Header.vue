<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

defineProps({
  title: {
    type: String,
    default: 'Accueil'
  }
})

const router = useRouter()
const route = useRoute()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

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
        <div class="menu-container">
          <button class="menu-button" @click="toggleMenu" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" />
            </svg>
          </button>
          <transition name="fade">
            <div v-if="isMenuOpen" class="dropdown-menu" @click="closeMenu">
              <router-link to="/domaines" class="menu-item">Domaines</router-link>
            </div>
          </transition>
        </div>
      </div>
    </div>
    <div v-if="isMenuOpen" class="menu-overlay" @click="closeMenu"></div>
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

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  width: 40px;
}

.header-logo {
  height: 32px;
  width: auto;
  border-radius: 4px;
}


.header-left, .header-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-right {
  justify-content: flex-end;
}

.main-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.menu-container {
  position: relative;
  display: flex;
  align-items: center;
}

.menu-button {
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

.menu-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  min-width: 156px;
  margin-top: 8px;
  overflow: hidden;
  z-index: 102;
}

.menu-item {
  display: block;
  padding: 12px 16px;
  color: #2c3e50;
  text-decoration: none;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f8f9fa;
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
  margin: 0 auto; /* Center between logo and title */
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.router-link-active {
  color: #048B9A;
  font-weight: 600;
  background-color: #f0f7f8;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

