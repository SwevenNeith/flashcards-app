<template>
  <main class="content">
    <div class="welcome-container">
      <p class="welcome-text">
        Bienvenu sur Flashcards. L'application est en cours de création, veuillez patienter.
      </p>
      <div class="cta-section">
        <span>Allez voir tous les domaines que nous avons en cliquant ici :</span>
        <router-link to="/domaines" class="cta-link">Domaines</router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.content {
  flex: 1;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  text-align: center;
}

.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.welcome-text {
  font-size: 1.1rem;
  color: #2c3e50;
  line-height: 1.5;
  max-width: 500px;
}

.cta-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1rem;
  color: #666;
}

.cta-link {
  color: #048B9A;
  font-weight: 700;
  text-decoration: underline;
  font-size: 1.25rem;
}
</style>
