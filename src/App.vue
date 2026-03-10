<script setup>
import Header from './components/Header.vue'
</script>

<template>
  <div class="app-container">
    <Header title="Accueil" />


    <main class="content">
      <p class="welcome-text">
        Bienvenu sur Flashcards. L'application est en cours de création, veuillez patienter.
      </p>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.content {
  flex: 1;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  text-align: center;
}


.welcome-text {
  font-size: 1.1rem;
  color: #2c3e50;
  line-height: 1.5;
  max-width: 500px;
}
</style>

