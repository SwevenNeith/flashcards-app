<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useDomainesStore } from '../stores/domaines'
import { useCategoriesStore } from '../stores/categories'
import { supabase } from '../lib/supabase'

const props = defineProps({
  preselectedDomainId: {
    type: String,
    default: null
  },
  /** Compte des révisions dues par domaine (même source que la liste d’accueil) — évite les requêtes .in() énormes */
  dueDomains: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'start'])

const domainesStore = useDomainesStore()
const categoriesStore = useCategoriesStore()

const selectionType = ref('Domaine') // 'Domaine' or 'Catégorie'
const selectedDomain = ref('')
const selectedCategory = ref('')
const questionCount = ref(10)
const countOptions = [10, 20, 30, 50]
const revisionFull = ref(false)
const optionsEnabled = ref(false)
/** Révisions dues pour une catégorie (requête légère avec jointure, pas de .in géant) */
const categoryDueRevisionCount = ref(null)

const dueRevisionInScope = computed(() => {
  const domainId = selectedDomain.value
  if (!domainId) return null
  if (selectionType.value === 'Catégorie' && !selectedCategory.value) return null

  if (selectionType.value === 'Domaine') {
    const row = props.dueDomains.find((d) => d.id === domainId)
    return row ? row.count : 0
  }

  return categoryDueRevisionCount.value
})

const showFullRevisionToggle = computed(() => {
  const n = dueRevisionInScope.value
  return typeof n === 'number' && n > 50
})

const fetchCategoryDueRevisionCount = async () => {
  if (
    selectionType.value !== 'Catégorie' ||
    !selectedDomain.value ||
    !selectedCategory.value
  ) {
    categoryDueRevisionCount.value = null
    return
  }

  const today = new Date().toISOString()
  const { count, error } = await supabase
    .from('Revision')
    .select('id, Flashcards!inner(category)', { count: 'exact', head: true })
    .eq('Flashcards.category', selectedCategory.value)
    .lte('due_date', today)

  categoryDueRevisionCount.value = error ? 0 : (count ?? 0)
}

const sortedDomaines = computed(() => {
  return [...domainesStore.domaines].sort((a, b) => a.name.localeCompare(b.name))
})

const sortedCategories = computed(() => {
  return [...categoriesStore.categories].sort((a, b) => a.name.localeCompare(b.name))
})

onMounted(async () => {
  if (domainesStore.domaines.length === 0) {
    await domainesStore.fetchDomaines()
  }
  
  if (props.preselectedDomainId) {
    selectedDomain.value = props.preselectedDomainId
  }
})

// Watch for domain change or selection type change to fetch categories
watch([selectedDomain, selectionType], async ([newDomain, newType]) => {
  if (newType === 'Catégorie' && newDomain) {
    await categoriesStore.fetchCategories(newDomain)
  }
})

// Watch for selection type change to clear categories
watch(selectionType, () => {
  if (!props.preselectedDomainId) {
    selectedDomain.value = ''
  }
  selectedCategory.value = ''
})

// Watch for domain change to clear category
watch(selectedDomain, () => {
  selectedCategory.value = ''
})

watch(
  [selectedDomain, selectionType, selectedCategory],
  () => {
    fetchCategoryDueRevisionCount()
  },
  { immediate: true }
)

watch(showFullRevisionToggle, (show) => {
  if (!show) revisionFull.value = false
})

const handleStart = () => {
  if (selectionType.value === 'Domaine' && !selectedDomain.value) return
  if (selectionType.value === 'Catégorie' && (!selectedDomain.value || !selectedCategory.value)) return

  const domainObj = domainesStore.domaines.find(d => d.id === selectedDomain.value || d.name === selectedDomain.value)
  const categoryObj = categoriesStore.categories.find(c => c.id === selectedCategory.value || c.name === selectedCategory.value)

  emit('start', {
    type: selectionType.value,
    domainId: domainObj?.id,
    domainName: domainObj?.name,
    categoryId: categoryObj?.id,
    categoryName: categoryObj?.name,
    count: questionCount.value,
    options: optionsEnabled.value,
    revision100: revisionFull.value
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
            :disabled="!!props.preselectedDomainId"
          >
            <option value="" disabled>Choisir un domaine...</option>
            <option 
              v-for="domain in sortedDomaines" 
              :key="domain.id" 
              :value="domain.id"
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
              v-for="category in sortedCategories" 
              :key="category.id" 
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Sélecteur de nombre de questions -->
        <div class="form-group">
          <label class="main-label">Combien de cartes doit avoir le test ?</label>
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

        <!-- 100% Révision (>50 cartes à réviser dans le périmètre) + Options (même ligne) -->
        <div class="form-group">
          <div class="toggles-row">
            <div v-if="showFullRevisionToggle" class="toggle-pair">
              <span class="main-label options-label revision-label">100% Révision</span>
              <label class="toggle">
                <input type="checkbox" v-model="revisionFull" />
                <span class="toggle-track" aria-hidden="true">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>
            <div class="toggle-pair options-toggle-pair">
              <span class="main-label options-label">Options</span>
              <label class="toggle">
                <input type="checkbox" v-model="optionsEnabled" />
                <span class="toggle-track" aria-hidden="true">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>
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
  background-color: #91576C;
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow-y: auto;
  overflow-x: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.form-header {
  padding: 1.25rem 1.5rem;
  background-color: #DFC6A4;
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
  color: #C2BAD3;
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
  accent-color: #DFC6A4;
}

.radio-item span {
  font-size: 1rem;
  color: #C2BAD3;
}

label:not(.main-label):not(.radio-item) {
  display: block;
  margin-bottom: 0.5rem;
  color: #C2BAD3;
  font-weight: 600;
  font-size: 0.9rem;
}

.styled-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #DFC6A4;
  border-radius: 8px;
  font-size: 1rem;
  color: #C2BAD3;
  background-color: #91576C;
  outline: none;
  transition: border-color 0.2s;
}

.styled-select:focus {
  border-color: #DFC6A4;
  background-color: #91576C;
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
  border: 1px solid #DFC6A4;
  background-color: #DFC6A4;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #DCB160;
}

.submit-btn {
  flex: 2;
  padding: 0.75rem;
  border: none;
  background-color: #DFC6A4;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #DCB160;
}

.submit-btn:disabled {
  background-color: #C2BAD3;
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
  background-color: #91576C;
  border: 1px solid #DFC6A4;
  font-size: 1rem;
  font-weight: 600;
  color: #C2BAD3;
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
  background-color: #91576C;
  z-index: 1;
}

.count-btn.active {
  background-color: #DFC6A4;
  color: white;
  border-color: #DFC6A4;
  z-index: 2; /* Position active above others to show full border if needed, though here they overlap */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.toggles-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  width: 100%;
}

.toggle-pair {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.options-toggle-pair {
  margin-left: auto;
}

.options-label {
  margin-bottom: 0;
  display: inline-flex;
  align-items: center;
  line-height: 1.1;
  height: 22px;
}

.revision-label {
  white-space: nowrap;
}

.toggle {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  height: 15px;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.toggle-track {
  display: inline-block;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background-color: #462A39;
  border: 1px solid rgba(223, 198, 164, 0.6);
  position: relative;
  transition: background-color 0.2s, border-color 0.2s;
}

.toggle-thumb {
  display: block;
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #C2BAD3;
  transition: left 0.2s;
}

.toggle input:checked + .toggle-track {
  background-color: #DCB160;
  border-color: rgba(223, 198, 164, 0.9);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  left: 21px;
  background: #C2BAD3;
}
</style>
