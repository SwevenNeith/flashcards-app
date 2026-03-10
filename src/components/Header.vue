<script setup>
defineProps({
  title: {
    type: String,
    default: 'Accueil'
  }
})
</script>

<template>
  <header class="main-header">
    <h1>{{ title }}</h1>
  </header>
</template>

<style scoped>
.main-header {
  background-color: #048B9A; /* Blue Duck / Teal */
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.main-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
</style>
