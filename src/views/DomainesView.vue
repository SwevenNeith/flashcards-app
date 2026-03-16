<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDomainesStore } from '../stores/domaines'
import DomaineForm from '../components/DomaineForm.vue'

const router = useRouter()
const domainesStore = useDomainesStore()
const searchQuery = ref('')
const isAddingDomaine = ref(false)
const isEditMode = ref(false)
const editingDomaine = ref(null)
const selectedLetter = ref(null)
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

onMounted(async () => {
  await domainesStore.fetchDomaines()
})

const normalizeText = (text) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

const filteredDomaines = computed(() => {
  let list = [...domainesStore.domaines]
  
  // Filtre par lettre
  if (selectedLetter.value) {
    list = list.filter(d => {
      const firstChar = normalizeText(d.name.charAt(0))
      return firstChar === selectedLetter.value.toLowerCase()
    })
  }

  // Filtre par recherche texte
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    list = list.filter(d => {
      const name = String(d.name || '')
      const desc = String(d.description || '')
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
  isAddingDomaine.value = !isAddingDomaine.value
  if (isAddingDomaine.value) {
    isEditMode.value = false
    editingDomaine.value = null
  }
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (isEditMode.value) isAddingDomaine.value = false
}

const handleCardClick = (domaine) => {
  if (isEditMode.value) {
    editingDomaine.value = domaine
    isAddingDomaine.value = true
  } else {
    router.push({ name: 'categories', params: { domainName: domaine.name } })
  }
}

const handleAddDomaine = async (domainData) => {
  if (editingDomaine.value) {
    await domainesStore.updateDomaine(editingDomaine.value.name, domainData)
  } else {
    await domainesStore.addDomaine(domainData)
  }
  isAddingDomaine.value = false
  editingDomaine.value = null
}
</script>

<template>
  <main class="domaines-container">
    <div class="controls">
      <div class="search-wrapper">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher un domaine..." 
          class="search-input"
        />
        <svg v-if="!searchQuery" class="search-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14.71L19.5,19.5L21,21L19.5,22.5L18,21L13.23,16.23L12.23,15.71C11.09,16.68 9.61,17.27 8,17.27A6.5,6.5 0 0,1 1.5,10.77A6.5,6.5 0 0,1 8,4.27M8,6.27A4.5,4.5 0 0,0 3.5,10.77A4.5,4.5 0 0,0 8,15.27A4.5,4.5 0 0,0 12.5,10.77A4.5,4.5 0 0,0 8,6.27Z" />
        </svg>
      </div>

      <div class="action-buttons">
        <button @click="toggleAddForm" class="add-button" :class="{ active: isAddingDomaine }">
          Ajouter un Domaine
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
      <DomaineForm 
        v-if="isAddingDomaine" 
        :initial-data="editingDomaine"
        @close="isAddingDomaine = false; editingDomaine = null" 
        @submit="handleAddDomaine"
      />
    </transition>


    <div class="domaines-list">
      <div v-if="filteredDomaines.length === 0" class="empty-state">
        <p v-if="searchQuery">Aucun domaine ne correspond à votre recherche.</p>
        <p v-else>Bienvenue ! Commencez par ajouter votre premier domaine.</p>
      </div>
      <div 
        v-for="domaine in filteredDomaines" 
        :key="domaine.name" 
        class="domaine-card"
        @click="handleCardClick(domaine)"
      >
        <div class="domaine-content">
          <transition name="fade">
            <button 
              v-if="isEditMode" 
              class="inline-delete-btn" 
              @click.stop="domainesStore.deleteDomaine(domaine.name)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
              </svg>
            </button>
          </transition>
          <div v-if="domaine.icon" class="domaine-icon">
            <img :src="domaine.icon" alt="Icon" />
          </div>
          <div class="domaine-info">
            <h3 class="domaine-name">{{ domaine.name }}</h3>
            <p v-if="domaine.description" class="domaine-desc">{{ domaine.description }}</p>
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
.domaines-container {
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

.action-buttons {
  display: flex;
  gap: 0.75rem;
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

.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
}

.letter-btn {
  flex-shrink: 0;
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
  background-color: #f0f7f8;
}

.letter-btn.active {
  background-color: #048B9A;
  color: white;
  border-color: #048B9A;
  box-shadow: 0 4px 10px rgba(4, 139, 154, 0.2);
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
  transition: background-color 0.2s, transform 0.1s;
}


.add-button.active {
  background-color: #2c3e50;
}

.edit-toggle-btn {
  background-color: #f1f2f6;
  color: #ffa502; /* Orange */
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

.domaines-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.domaine-card {
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

.domaine-card:hover {
  transform: translateX(4px);
  border-color: #048B9A;
}

.domaine-content {
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

.inline-delete-btn:hover {
  background-color: #fff1f2;
}

.domaine-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.domaine-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.domaine-name {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.domaine-desc {
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
  margin-left: 1rem;
}

.chevron-icon {
  color: #ccc;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #aaa;
}

@media (max-width: 600px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>



