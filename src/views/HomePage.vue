<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import TestForm from '../components/TestForm.vue'

const router = useRouter()
const showForm = ref(false)

const handleStartTest = (data) => {
  showForm.value = false
  router.push({
    name: 'test',
    query: {
      type: data.type,
      domain: data.domain,
      category: data.category,
      count: data.count
    }
  })
}
</script>

<template>
  <main class="content">
    <div class="welcome-container">
      <div class="test-action">
        <button class="start-test-btn" @click="showForm = true">Démarrer un test</button>
      </div>
      <p class="cta-section">
        Allez voir tous les domaines que nous avons en cliquant ici :
        <router-link to="/domaines" class="cta-link">Domaines</router-link>
      </p>
      <p class="cta-section">
        Pour voir votre progression, consultez vos statistiques juste ici :
        <router-link to="/statistiques" class="cta-link">Statistiques</router-link>
      </p>
    </div>

    <!-- Modal Formulaire de Test -->
    <transition name="fade">
      <TestForm 
        v-if="showForm" 
        @close="showForm = false"
        @start="handleStartTest"
      />
    </transition>
  </main>
</template>

<style scoped>
.content {
  flex: 1;
  padding: 2rem 1rem;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: justify;
}

.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
  width: 100%;
  max-width: 600px;
}

.test-action {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.start-test-btn {
  background-color: #048B9A;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  font-size: 1rem;
}

.start-test-btn:hover {
  background-color: #037380;
}

.start-test-btn:active {
  transform: scale(0.98);
}

.cta-section {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
}

.cta-link {
  color: #048B9A;
  font-weight: 700;
  text-decoration: underline;
  font-size: 1.25rem;
  display: inline;
  margin-left: 0.25rem;
}

/* Transition Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
