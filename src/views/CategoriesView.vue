<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCategoriesStore } from '../stores/categories'
import { supabase } from '../lib/supabase'
import CategoryForm from '../components/CategoryForm.vue'
import CategoryDeleteModal from '../components/CategoryDeleteModal.vue'

const props = defineProps({
  domainName: {
    type: String,
    required: true
  }
})

const router = useRouter()
const route = useRoute()
const categoriesStore = useCategoriesStore()
const searchQuery = ref('')
const isAddingCategory = ref(false)
const isEditMode = ref(false)
const editingCategory = ref(null)
const selectedLetter = ref(null)
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

// Modal de suppression
const showDeleteModal = ref(false)
const categoryToDelete = ref(null)
const flashcardCount = ref(0)

const openDeleteModal = async (category) => {
  categoryToDelete.value = category
  
  // Compter les flashcards
  const { count } = await supabase
    .from('Flashcards')
    .select('*', { count: 'exact', head: true })
    .eq('category', category.id)
  
  flashcardCount.value = count || 0
  showDeleteModal.value = true
}

const handleDeleteConfirm = async () => {
  if (categoryToDelete.value) {
    await categoriesStore.deleteCategory(categoryToDelete.value.id, props.domainName)
  }
  showDeleteModal.value = false
  categoryToDelete.value = null
}

onMounted(async () => {
  await categoriesStore.fetchCategories(props.domainName)
})

const normalizeText = (text) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

const filteredCategories = computed(() => {
  let list = [...categoriesStore.categories]
  
  // Filtre par lettre
  if (selectedLetter.value) {
    list = list.filter(c => {
      const firstChar = normalizeText(c.name.charAt(0))
      return firstChar === selectedLetter.value.toLowerCase()
    })
  }

  // Filtre par recherche texte
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    list = list.filter(c => {
      const name = String(c.name || '')
      const desc = String(c.description || '')
      return name.toLowerCase().includes(query) || 
             desc.toLowerCase().includes(query)
    })
  }

  // Tri alphabétique par nom (en ignorant les accents et la casse)
  list.sort((a, b) => {
    const nameA = normalizeText(String(a.name || ''))
    const nameB = normalizeText(String(b.name || ''))
    if (nameA < nameB) return -1
    if (nameA > nameB) return 1
    return 0
  })

  return list
})

const toggleLetter = (letter) => {
  if (selectedLetter.value === letter) {
    selectedLetter.value = null
  } else {
    selectedLetter.value = letter
  }
}

const toggleAddForm = () => {
  isAddingCategory.value = !isAddingCategory.value
  if (isAddingCategory.value) {
    isEditMode.value = false
    editingCategory.value = null
  }
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (isEditMode.value) isAddingCategory.value = false
}

const handleCardClick = (category) => {
  if (isEditMode.value) {
    editingCategory.value = category
    isAddingCategory.value = true
  } else {
    router.push({ name: 'flashcards', params: { categoryName: category.name } })
  }
}

const handleAddCategory = async (categoryData) => {
  if (editingCategory.value) {
    await categoriesStore.updateCategory(editingCategory.value.name, categoryData, props.domainName)
  } else {
    await categoriesStore.addCategory(categoryData, props.domainName)
  }
  isAddingCategory.value = false
  editingCategory.value = null
}
</script>

<template>
  <main class="categories-container">
    <div class="controls">
      <div class="search-wrapper">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher une catégorie..." 
          class="search-input"
        />
        <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14.71L19.5,19.5L21,21L19.5,22.5L18,21L13.23,16.23L12.23,15.71C11.09,16.68 9.61,17.27 8,17.27A6.5,6.5 0 0,1 1.5,10.77A6.5,6.5 0 0,1 8,4.27M8,6.27A4.5,4.5 0 0,0 3.5,10.77A4.5,4.5 0 0,0 8,15.27A4.5,4.5 0 0,0 12.5,10.77A4.5,4.5 0 0,0 8,6.27Z" />
        </svg>
      </div>

      <div class="action-buttons">
        <button @click="toggleAddForm" class="add-button" :class="{ active: isAddingCategory }">
          Ajouter une Catégorie
        </button>
        <button 
          @click="toggleEditMode" 
          class="edit-toggle-btn"
          :class="{ active: isEditMode }"
          title="Mode édition"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
          </svg>
        </button>
      </div>

      <div class="alphabet-filter">
        <button 
          class="letter-btn all" 
          :class="{ active: !selectedLetter }"
          @click="selectedLetter = null"
        >
          Tous
        </button>
        <button 
          v-for="letter in alphabet" 
          :key="letter"
          class="letter-btn"
          :class="{ active: selectedLetter === letter }"
          @click="toggleLetter(letter)"
        >
          {{ letter }}
        </button>
      </div>
    </div>

    <transition name="fade">
      <CategoryForm 
        v-if="isAddingCategory" 
        :initial-data="editingCategory"
        @close="isAddingCategory = false; editingCategory = null" 
        @submit="handleAddCategory"
      />
    </transition>

    <CategoryDeleteModal
      :show="showDeleteModal"
      :category-name="categoryToDelete?.name || ''"
      :flashcard-count="flashcardCount"
      @close="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />

    <div class="categories-list">
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <p v-if="searchQuery">Aucune catégorie ne correspond à votre recherche.</p>
        <p v-else>Prêt à organiser vos flashcards ? Ajoutez une catégorie !</p>
      </div>
      <div 
        v-for="category in filteredCategories" 
        :key="category.name" 
        class="category-card"
        @click="handleCardClick(category)"
      >
        <div class="category-content">
          <transition name="fade">
            <button 
              v-if="isEditMode" 
              class="inline-delete-btn" 
              @click.stop="openDeleteModal(category)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
              </svg>
            </button>
          </transition>
          <div v-if="category.icon" class="category-icon">
            <img :src="category.icon" alt="Icon" />
          </div>
          <div class="category-info">
            <h3 class="category-name">{{ category.name }}</h3>
            <p v-if="category.description" class="category-desc">{{ category.description }}</p>
          </div>
        </div>
        
        <div class="actions">
          <svg viewBox="0 0 24 24" width="20" height="20" class="chevron-icon">
            <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
          </svg>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.categories-container {
  padding: 1.5rem 1rem 5rem 1rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.search-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.75rem;
  border: 1px solid #DFC6A4;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  background-color: #91576C;
  color: #C2BAD3;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: #C2BAD3;
  opacity: 0.8;
}

.search-input:focus {
  border-color: #DFC6A4;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #C2BAD3;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.add-button {
  flex: 1;
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.add-button.active {
  background-color: #C2BAD3;
}

.edit-toggle-btn {
  background-color: #91576C;
  color: #ffa502;
  border: 1px solid #DFC6A4;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-toggle-btn:hover {
  background-color: #91576C;
}

.edit-toggle-btn.active {
  background-color: #ffa502;
  color: white;
  border-color: #ffa502;
}

.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0;
}

.letter-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #DFC6A4;
  border-radius: 8px;
  background: #91576C;
  color: #C2BAD3;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.letter-btn.all {
  width: auto;
  padding: 0 0.8rem;
}

.letter-btn:hover {
  border-color: #DFC6A4;
  color: #DFC6A4;
}

.letter-btn.active {
  background-color: #DFC6A4;
  color: white;
  border-color: #DFC6A4;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-card {
  background: #91576C;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  border: 1px solid #DFC6A4;
  transition: all 0.2s;
}

.category-card:hover {
  transform: translateX(4px);
  border-color: #DFC6A4;
}

.category-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.inline-delete-btn {
  background: none;
  border: none;
  color: #ff4757;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.category-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background-color: #91576C;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.category-name {
  margin: 0;
  font-size: 1.1rem;
  color: #DCB160;
}

.category-desc {
  margin: 0.1rem 0 0 0;
  font-size: 0.85rem;
  color: #C2BAD3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chevron-icon {
  color: #C2BAD3;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #C2BAD3;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
