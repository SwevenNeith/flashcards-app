<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFlashcardsStore } from '../stores/flashcards'
import FlashcardForm from '../components/FlashcardForm.vue'

const props = defineProps({
  categoryName: {
    type: String,
    required: true
  }
})

const router = useRouter()
const route = useRoute()
const flashcardsStore = useFlashcardsStore()
const searchQuery = ref('')
const isAddingFlashcard = ref(false)
const isEditMode = ref(false)
const editingFlashcard = ref(null)
const selectedLetter = ref(null)
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

onMounted(async () => {
  await flashcardsStore.fetchFlashcards(props.categoryName)
})

const normalizeText = (text) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

const filteredFlashcards = computed(() => {
  let list = flashcardsStore.flashcards
  
  // Filtre par lettre
  if (selectedLetter.value) {
    list = list.filter(f => {
      const firstChar = normalizeText(f.name.charAt(0))
      return firstChar === selectedLetter.value.toLowerCase()
    })
  }

  // Filtre par recherche texte
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    list = list.filter(f => {
      const name = String(f.name || '')
      const desc = String(f.description || '')
      return name.toLowerCase().includes(query) || 
             desc.toLowerCase().includes(query)
    })
  }

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
  isAddingFlashcard.value = !isAddingFlashcard.value
  if (isAddingFlashcard.value) {
    isEditMode.value = false
    editingFlashcard.value = null
  }
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (isEditMode.value) isAddingFlashcard.value = false
}

const handleCardClick = (flashcard) => {
  if (isEditMode.value) {
    editingFlashcard.value = flashcard
    isAddingFlashcard.value = true
  } else {
    // Prochaine étape: vue détaillée de la flashcard ?
    console.log('Flashcard cliquée:', flashcard.name)
  }
}

const handleAddFlashcard = async (flashcardData) => {
  if (editingFlashcard.value) {
    await flashcardsStore.updateFlashcard(editingFlashcard.value.name, flashcardData, props.categoryName)
  } else {
    await flashcardsStore.addFlashcard(flashcardData, props.categoryName)
  }
  isAddingFlashcard.value = false
  editingFlashcard.value = null
}
</script>

<template>
  <main class="flashcards-container">
    <div class="controls">
      <div class="search-wrapper">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher une flashcard..." 
          class="search-input"
        />
        <svg v-if="!searchQuery" class="search-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14.71L19.5,19.5L21,21L19.5,22.5L18,21L13.23,16.23L12.23,15.71C11.09,16.68 9.61,17.27 8,17.27A6.5,6.5 0 0,1 1.5,10.77A6.5,6.5 0 0,1 8,4.27M8,6.27A4.5,4.5 0 0,0 3.5,10.77A4.5,4.5 0 0,0 8,15.27A4.5,4.5 0 0,0 12.5,10.77A4.5,4.5 0 0,0 8,6.27Z" />
        </svg>
      </div>

      <div class="action-buttons">
        <button @click="toggleAddForm" class="add-button" :class="{ active: isAddingFlashcard }">
          Ajouter une Flashcard
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
      <FlashcardForm 
        v-if="isAddingFlashcard" 
        :initial-data="editingFlashcard"
        @close="isAddingFlashcard = false; editingFlashcard = null" 
        @submit="handleAddFlashcard"
      />
    </transition>

    <div class="flashcards-list">
      <div v-if="filteredFlashcards.length === 0" class="empty-state">
        <p v-if="searchQuery">Aucune flashcard ne correspond à votre recherche.</p>
        <p v-else>C'est ici que vous apprendrez ! Ajoutez votre première flashcard.</p>
      </div>
      <div 
        v-for="flashcard in filteredFlashcards" 
        :key="flashcard.name" 
        class="flashcard-card"
        @click="handleCardClick(flashcard)"
      >
        <div class="flashcard-content">
          <transition name="fade">
            <button 
              v-if="isEditMode" 
              class="inline-delete-btn" 
              @click.stop="flashcardsStore.deleteFlashcard(flashcard.name, props.categoryName)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
              </svg>
            </button>
          </transition>
          <div v-if="flashcard.icon" class="flashcard-icon">
            <img :src="flashcard.icon" alt="Icon" />
          </div>
          <div class="flashcard-info">
            <h3 class="flashcard-name">{{ flashcard.name }}</h3>
            <p v-if="flashcard.description" class="flashcard-desc">{{ flashcard.description }}</p>
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
.flashcards-container {
  padding: 1.5rem 1rem;
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
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  background-color: white;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #048B9A;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.add-button {
  flex: 1;
  background-color: #048B9A;
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
  background-color: #2c3e50;
}

.edit-toggle-btn {
  background-color: #f1f2f6;
  color: #ffa502;
  border: 1px solid #eee;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-toggle-btn:hover {
  background-color: #fff4e5;
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
  border: 1px solid #eee;
  border-radius: 8px;
  background: white;
  color: #666;
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
  border-color: #048B9A;
  color: #048B9A;
}

.letter-btn.active {
  background-color: #048B9A;
  color: white;
  border-color: #048B9A;
}

.flashcards-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.flashcard-card {
  background: white;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.flashcard-card:hover {
  transform: translateX(4px);
  border-color: #048B9A;
}

.flashcard-content {
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

.flashcard-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.flashcard-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.flashcard-name {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.flashcard-desc {
  margin: 0.1rem 0 0 0;
  font-size: 0.85rem;
  color: #888;
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
  color: #ccc;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #aaa;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
