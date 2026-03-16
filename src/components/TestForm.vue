<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDomainesStore } from '../stores/domaines'
import { useCategoriesStore } from '../stores/categories'

const emit = defineEmits(['close', 'start'])

const domainesStore = useDomainesStore()
const categoriesStore = useCategoriesStore()

const selectionType = ref('Domaine') // 'Domaine' or 'Catégorie'
const selectedDomain = ref('')
const selectedCategory = ref('')
const questionCount = ref(5)
const countOptions = [5, 10, 20]

onMounted(async () => {
  if (domainesStore.domaines.length === 0) {
    await domainesStore.fetchDomaines()
  }
})

// Watch for domain change to fetch categories if needed
watch(selectedDomain, async (newDomain) => {
  selectedCategory.value = ''
  if (selectionType.value === 'Catégorie' && newDomain) {
    await categoriesStore.fetchCategories(newDomain)
  }
})

// Watch for selection type change to clear selections
watch(selectionType, (newType) => {
  selectedDomain.value = ''
  selectedCategory.value = ''
})

const handleStart = () => {
  if (selectionType.value === 'Domaine' && !selectedDomain.value) return
  if (selectionType.value === 'Catégorie' && (!selectedDomain.value || !selectedCategory.value)) return

  emit('start', {
    type: selectionType.value,
    domain: selectedDomain.value,
    category: selectedCategory.value,
    count: questionCount.value
  })
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="form-header">
        <h2>Démarrer un test</h2>
        <button type="button" class="close-x" @click="$emit('close')">&times;</button>
      </header>

      <div class="test-form-content">
        <div class="form-group">
          <label class="main-label">Me tester sur :</label>
          <div class="radio-group">
            <label class="radio-item">
              <input 
                type="radio" 
                v-model="selectionType" 
                value="Domaine" 
              />
              <span>Domaine</span>
            </label>
            <label class="radio-item">
              <input 
                type="radio" 
                v-model="selectionType" 
                value="Catégorie" 
              />
              <span>Catégorie</span>
            </label>
          </div>
        </div>

        <!-- Dropdown Domaine (toujours présent si Catégorie ou Domaine sélectionné) -->
        <div class="form-group">
          <label for="domain-select">Sélectionner un Domaine</label>
          <select 
            id="domain-select" 
            v-model="selectedDomain" 
            class="styled-select"
          >
            <option value="" disabled>Choisir un domaine...</option>
            <option 
              v-for="domain in domainesStore.domaines" 
              :key="domain.id" 
              :value="domain.name"
            >
              {{ domain.name }}
            </option>
          </select>
        </div>

        <!-- Dropdown Catégorie (seulement si sélection Type === Catégorie) -->
        <div v-if="selectionType === 'Catégorie'" class="form-group fade-in">
          <label for="category-select">Sélectionner une Catégorie</label>
          <select 
            id="category-select" 
            v-model="selectedCategory" 
            class="styled-select"
            :disabled="!selectedDomain"
          >
            <option value="" disabled>
              {{ !selectedDomain ? 'Sélectionnez d\'abord un domaine' : 'Choisir une catégorie...' }}
            </option>
            <option 
              v-for="category in categoriesStore.categories" 
              :key="category.id" 
              :value="category.name"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Sélecteur de nombre de questions -->
        <div class="form-group">
          <label class="main-label">Combien de questions doit avoir le test ?</label>
          <div class="count-selector">
            <button 
              v-for="option in countOptions" 
              :key="option"
              type="button"
              class="count-btn"
              :class="{ active: questionCount === option }"
              @click="questionCount = option"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="$emit('close')">Annuler</button>
          <button 
            type="button" 
            class="submit-btn" 
            @click="handleStart"
            :disabled="selectionType === 'Domaine' ? !selectedDomain : (!selectedDomain || !selectedCategory)"
          >
            C'est parti !
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background-color: white;
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.form-header {
  padding: 1.25rem 1.5rem;
  background-color: #048B9A;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-x {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.test-form-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.main-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: #2c3e50;
  font-size: 1rem;
}

.radio-group {
  display: flex;
  gap: 2rem;
  padding: 0.5rem 0;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-item input[type="radio"] {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #048B9A;
}

.radio-item span {
  font-size: 1rem;
  color: #2c3e50;
}

label:not(.main-label):not(.radio-item) {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
}

.styled-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  color: #2c3e50;
  background-color: #f9f9f9;
  outline: none;
  transition: border-color 0.2s;
}

.styled-select:focus {
  border-color: #048B9A;
  background-color: white;
}

.styled-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 8px;
  color: #666;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn {
  flex: 2;
  padding: 0.75rem;
  border: none;
  background-color: #048B9A;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #037380;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Count Selector styles */
.count-selector {
  display: flex;
  width: 100%;
}

.count-btn {
  flex: 1;
  padding: 0.75rem;
  background-color: white;
  border: 1px solid #ddd;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: -1px; /* Overlap borders */
}

.count-btn:first-child {
  margin-left: 0;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.count-btn:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.count-btn:hover:not(.active) {
  background-color: #f0f7f8;
  z-index: 1;
}

.count-btn.active {
  background-color: #048B9A;
  color: white;
  border-color: #048B9A;
  z-index: 2; /* Position active above others to show full border if needed, though here they overlap */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
