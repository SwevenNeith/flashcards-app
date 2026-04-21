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
const activeFlashcardIndex = ref(null)
const selectedLetter = ref(null)
const touchStartX = ref(0)
const touchEndX = ref(0)
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

onMounted(async () => {
  await flashcardsStore.fetchFlashcards(props.categoryName)
})

const normalizeText = (text) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

const filteredFlashcards = computed(() => {
  let list = [...flashcardsStore.flashcards]
  
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

const activeFlashcard = computed(() => {
  const list = filteredFlashcards.value
  if (!list.length || activeFlashcardIndex.value === null) return null

  const normalizedIndex = ((activeFlashcardIndex.value % list.length) + list.length) % list.length
  return list[normalizedIndex]
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
    const index = filteredFlashcards.value.findIndex(f => f.name === flashcard.name)
    if (index !== -1) {
      activeFlashcardIndex.value = index
    }
  }
}

const closeFlashcardModal = () => {
  activeFlashcardIndex.value = null
}

const showNextFlashcard = () => {
  const list = filteredFlashcards.value
  if (!list.length) return

  if (activeFlashcardIndex.value === null) {
    activeFlashcardIndex.value = 0
  } else {
    activeFlashcardIndex.value = (activeFlashcardIndex.value + 1) % list.length
  }
}

const showPreviousFlashcard = () => {
  const list = filteredFlashcards.value
  if (!list.length) return

  if (activeFlashcardIndex.value === null) {
    activeFlashcardIndex.value = list.length - 1
  } else {
    activeFlashcardIndex.value = (activeFlashcardIndex.value - 1 + list.length) % list.length
  }
}

const handleTouchStart = (event) => {
  if (!event.changedTouches || !event.changedTouches.length) return
  touchStartX.value = event.changedTouches[0].clientX
}

const handleTouchEnd = (event) => {
  if (!event.changedTouches || !event.changedTouches.length) return
  touchEndX.value = event.changedTouches[0].clientX

  const diffX = touchEndX.value - touchStartX.value
  const threshold = 40

  if (Math.abs(diffX) < threshold) return

  // Swipe gauche -> prochaine carte, swipe droite -> précédente
  if (diffX < 0) {
    showNextFlashcard()
  } else {
    showPreviousFlashcard()
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
            <div 
              v-if="flashcard.description" 
              class="flashcard-desc" 
              v-html="flashcard.description"
            ></div>
          </div>
        </div>
        
        <div class="actions">
          <svg viewBox="0 0 24 24" width="20" height="20" class="chevron-icon">
            <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Popup de détail de la flashcard -->
    <transition name="fade">
      <div 
        v-if="activeFlashcard" 
        class="flashcard-modal-overlay" 
        @click.self="closeFlashcardModal"
      >
        <div 
          class="flashcard-modal-card"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        >
          <button 
            type="button" 
            class="flashcard-modal-close" 
            @click="closeFlashcardModal"
            aria-label="Fermer la flashcard"
          >
            &times;
          </button>

          <!-- Boutons de navigation -->
          <button 
            type="button" 
            class="flashcard-nav-btn prev" 
            @click.stop="showPreviousFlashcard"
            aria-label="Flashcard précédente"
          >
            ‹
          </button>
          <button 
            type="button" 
            class="flashcard-nav-btn next" 
            @click.stop="showNextFlashcard"
            aria-label="Flashcard suivante"
          >
            ›
          </button>

          <div class="flashcard-modal-content">
            <div 
              v-if="activeFlashcard.icon" 
              class="flashcard-modal-icon"
            >
              <img :src="activeFlashcard.icon" alt="Icône de la flashcard" />
            </div>

            <h2 class="flashcard-modal-title">
              {{ activeFlashcard.name }}
            </h2>

            <div 
              v-if="activeFlashcard.description" 
              class="flashcard-modal-description"
              v-html="activeFlashcard.description"
            ></div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.flashcards-container {
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

.flashcards-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.flashcard-card {
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

.flashcard-card:hover {
  transform: translateX(4px);
  border-color: #DFC6A4;
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
  background-color: #91576C;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flashcard-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.flashcard-name {
  margin: 0;
  font-size: 1.1rem;
  color: #C2BAD3;
}

.flashcard-desc {
  margin: 0.1rem 0 0 0;
  font-size: 0.85rem;
  color: #C2BAD3;
  /* Aperçu sur une seule ligne avec "..." si trop long */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* Styles for rich text elements within the card */
.flashcard-desc b, .flashcard-desc strong { font-weight: bold; }
.flashcard-desc i, .flashcard-desc em { font-style: italic; }
.flashcard-desc u { text-decoration: underline; }
.flashcard-desc s, .flashcard-desc strike { text-decoration: line-through; }

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

/* Modal de détail de flashcard */
.flashcard-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.flashcard-modal-card {
  position: relative;
  background-color: #91576C;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  border-radius: 20px;
  padding: 1.75rem 1.5rem 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.flashcard-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background-color: rgba(4, 139, 154, 0.1);
  color: #DFC6A4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(2px);
}

.flashcard-nav-btn.prev {
  left: 0.5rem;
}

.flashcard-nav-btn.next {
  right: 0.5rem;
}

.flashcard-nav-btn:active {
  background-color: rgba(4, 139, 154, 0.18);
}

.flashcard-modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.9rem;
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #C2BAD3;
  cursor: pointer;
  line-height: 1;
}

.flashcard-modal-content {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.flashcard-modal-icon {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  background-color: #91576C;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flashcard-modal-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.flashcard-modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.4rem;
  color: #C2BAD3;
  word-break: break-word;
}

.flashcard-modal-description {
  font-size: 0.95rem;
  color: #C2BAD3;
  line-height: 1.5;
  text-align: left;
  width: 100%;
  max-width: 100%;
  word-wrap: break-word;
}

/* Styles riches à l'intérieur de la description du popup */
.flashcard-modal-description b,
.flashcard-modal-description strong { font-weight: bold; }
.flashcard-modal-description i,
.flashcard-modal-description em { font-style: italic; }
.flashcard-modal-description u { text-decoration: underline; }
.flashcard-modal-description s,
.flashcard-modal-description strike { text-decoration: line-through; }

@media (max-width: 480px) {
  .flashcard-modal-card {
    border-radius: 18px;
    padding: 1.5rem 1.25rem 1.25rem;
  }

  .flashcard-modal-title {
    font-size: 1.25rem;
  }

  .flashcard-modal-description {
    font-size: 0.9rem;
  }
}
</style>
